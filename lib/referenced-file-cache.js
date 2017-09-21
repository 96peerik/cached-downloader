const EventEmitter = require('events').EventEmitter;

class CacheItem {
  constructor(id, filename) {
    this.id = id;
    this.filename = filename;
    this.refs = new Map();
    this.lastAccess = new Date();
  }
}

class ReferencedFileCache extends EventEmitter {
  constructor() {
    super();
    this.cache = new Map();
    this.ttl = 3000;

    setInterval(() => this.sweep(), 1000);
  }

  get(id, ref) {
    if (!this.cache.has(id)) return Promise.reject(new Error('Not found'));
    const item = this.cache.get(id);
    item.lastAccess = new Date();
    if (ref) {
      item.refs.set(ref);
    }
    return Promise.resolve(item);
  }

  clearRef(ref) {
    console.log('clearref', ref);
    [...this.cache.values()].forEach((item) => {
      if (item.refs.has(ref)) {
        item.refs.delete(ref);
        item.lastAccess = new Date();
      }
    });
  }

  set(id, filename, ref) {
    if (this.cache.has(id)) {
      return Promise.reject(new Error('Already exists'));
    }
    const item = new CacheItem(id, filename);
    if (ref) {
      item.refs.set(ref);
    }
    this.cache.set(id, item);
    return Promise.resolve(item);
  }

  sweep() {
    const now = new Date();
    [...this.cache.values()].forEach((item) => {
      // is this item referenced?
      console.log(item.refs.size);
      if (item.refs.size > 0) return;
      
      // has it expired?
      console.log(now.valueOf(), item.lastAccess.valueOf(), this.ttl, (now.valueOf() > item.lastAccess.valueOf() + this.ttl));
      if (now.valueOf() > item.lastAccess.valueOf() + this.ttl) {
        this.remove(item.id);
      }
    });
  }

  remove(id) {
    if (this.cache.has(id)) {
      const item = this.cache.get(id);
      this.emit('remove', item);
      this.cache.delete(id);
    }
  }
}

module.exports = ReferencedFileCache;
