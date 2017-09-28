const EventEmitter = require('events').EventEmitter;
const Storage = require('./storage');
const path = require('path');
const mkdirp = require('mkdirp-then');
const fs = require('fs');

const DEFAULT_TTL = 2000;
const DEFAULT_SWEEP = 1000;

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
    setInterval(() => this.sweep(), DEFAULT_SWEEP);
  }

  static fileExists(filename) {
    return new Promise((resolve, reject) => {
      fs.stat(filename, (err) => {
        return resolve(err == null);
      });
    });
  }

  init() {
    return mkdirp(this.path)
      .then(() => this.storage.init())
      .then(() => this.storage.getAll())
      .then((objects) => {
        return Promise.all(objects.map((obj) => {
          return ReferencedFileCache.fileExists(obj[1].filename)
          .then((exists) => {
            if (exists === false) {
              return this.remove(obj[0], true);
            } else {
              return this.updateTTL(obj[0]);
            }
          });
        })
      );
    });
  }

  clear() {
    return this.storage.getAll((objects) => {
      const ops = objects.map(obj => ({ type: 'del', key: obj[0]}));
      return this.storage.batch(ops)
      .then(() => this.ttlMap.clear());
    });
  }

  updateTTL(id, ref) {
    const lastAccess = new Date();
    let obj;
    if (this.ttlMap.has(id)) {
      obj = this.ttlMap.get(id);
      obj.lastAccess = lastAccess;
    } else {
      obj = { id, lastAccess, refs: new Map() };
    }
    if (ref) obj.refs.set(ref, true);
    this.ttlMap.set(id, obj);
  }

  get(id, ref) {
    return this.storage.get(id).then((value) => {
      return ReferencedFileCache.fileExists(value.filename)
      .then((exists) => {
        if (!exists) {
          console.log('File was removed!');
          this.remove(id).catch((err) => console.error(err));
          return Promise.reject('File not found');
        } else {
          this.updateTTL(id, ref);
          return value;
        }
      });
    });
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
    .then(() => this.updateTTL(id, ref))
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
      .then(() => (noEmit) ? null : this.emit('remove', item))
    );
  }
}

module.exports = ReferencedFileCache;
