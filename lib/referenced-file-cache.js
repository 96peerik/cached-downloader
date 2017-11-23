const EventEmitter = require('events').EventEmitter;
const Storage = require('./storage');
const path = require('path');
const mkdirp = require('mkdirp-then');
const fs = require('fs');

const DEFAULT_TTL = 5 * 60 * 1000;
const DEFAULT_SWEEP = 10 * 1000;

class CacheItem {
  constructor(id, filename) {
    this.id = id;
    this.filename = filename;
  }
}

class ReferencedFileCache extends EventEmitter {
  constructor(options) {
    super();
    const opt = options || {};
    this.path = opt.path;
    this.ttlMap = new Map();
    this.storage = new Storage(path.join(this.path, 'db'));
    this.ttl = options.ttl || DEFAULT_TTL;
    this.sweepRef = setInterval(() => this.sweep(), options.sweep || DEFAULT_SWEEP);
  }

  destroy() {
    this.removeAllListeners();
    this.storage.destroy();
    this.storage = null;
    clearInterval(this.sweepRef);
    this.ttlMap.clear();
  }

  static fileExists(filename) {
    return new Promise((resolve) => {
      fs.stat(filename, err => resolve(err == null));
    });
  }

  init() {
    return mkdirp(this.path)
      .then(() => this.storage.init())
      .then(() => this.storage.getAll())
      .then(objects => Promise.all(objects.map(obj =>
        ReferencedFileCache.fileExists(obj[1].filename)
          .then((exists) => {
            if (exists === false) {
              return this.remove(obj[0], true);
            }
            return this.updateTTL(obj[0], obj[1]);
          }))
      ));
  }

  clear() {
    return this.storage.getAll((objects) => {
      const ops = objects.map(obj => ({ type: 'del', key: obj[0] }));
      return this.storage.batch(ops)
      .then(() => this.ttlMap.clear());
    });
  }

  updateTTL(id, data, ref) {
    const lastAccess = new Date();
    let obj;
    if (this.ttlMap.has(id)) {
      obj = this.ttlMap.get(id);
      obj.lastAccess = lastAccess;
    } else {
      obj = { id, lastAccess, data, refs: new Map() };
    }
    if (ref) obj.refs.set(ref, true);
    this.ttlMap.set(id, obj);
  }

  get(id, ref) {
    return this.storage.get(id).then(value => ReferencedFileCache.fileExists(value.filename)
      .then((exists) => {
        if (!exists) {
          this.remove(id).catch(err => this.emit('error', err));
          const err = new Error(`File not found '${value.filename}'`);
          err.name = 'NotFoundError';
          return Promise.reject(err);
        }
        this.updateTTL(id, value, ref);
        return value;
      }));
  }

  getSync(id, ref) {
    if (this.ttlMap.has(id)) {
      const data = this.ttlMap.get(id);
      this.updateTTL(id, data, ref);
      return data;
    }
    return null;
  }

  clearRef(ref) {
    [...this.ttlMap.values()].forEach((item) => {
      if (item.refs.has(ref)) {
        item.refs.delete(ref);
      }
    });
  }

  set(id, filename, ref) {
    if (this.ttlMap.has(id)) {
      return Promise.reject(new Error('Already exists'));
    }
    const item = new CacheItem(id, filename);
    return this.storage.set(id, item)
    .then(() => this.updateTTL(id, item, ref))
    .then(() => item);
  }

  sweep() {
    const now = new Date();
    [...this.ttlMap.values()].forEach((item) => {
      // is this item referenced?
      if (item.refs.size > 0) return;

      // has it expired?
      if (now.valueOf() > item.lastAccess.valueOf() + this.ttl) {
        this.remove(item.id);
      }
    });
  }

  remove(id, noEmit) {
    this.ttlMap.delete(id);
    return this.storage.get(id)
    .then(item => this.storage.remove(id)
      .then(() => {
        if (noEmit) return null;
        return this.emit('remove', item);
      })
    );
  }
}

module.exports = ReferencedFileCache;
