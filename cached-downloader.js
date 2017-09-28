const EventEmitter = require('events').EventEmitter;
const Downloader = require('./lib/downloader');
const Cache = require('./lib/referenced-file-cache');
const os = require('os');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const crypto = require('crypto');

class CachedDownloader extends EventEmitter {
  constructor(options) {
    super();
    if ((options == null) || (options.localDirectory == null)) {
      throw(new Error('CachedDownloader: localDirectory property missing in options object to constructor'));
    }
    this.localDirectory = options.localDirectory;
    this.progress = new Map();
    this.cache = new Cache({ path: this.localDirectory });
    this.cache.on('remove', (item) => {
      fs.unlink(item.filename, (err) => console.error(err)); 
    });
  }

  init() {
    return this.cache.init();
  }

  static hashString(str) {
    return crypto.createHash('md5').update(str).digest('hex');    
  }

  download(url, localFile, ref) {
    const filename = localFile || CachedDownloader.hashString(url);
    // download of this url already in progress - return original promise
    if (this.progress.has(url)) return this.progress.get(url);
    const promise = this.cache.get(url, ref).then((item) => {
      this.progress.delete(url);
      return item.filename;
    })
    .catch((err) => {
      return Downloader.download(url, path.join(this.localDirectory, filename), true, (bytes, total) => {
       console.log(bytes, total); 
      })
      .then((item) => this.cache.set(url, item.filename, ref))
      .then((item) => {
        this.progress.delete(url);
        return item.filename
      })
      .catch((err) => {
        this.progress.delete(url);
        throw err;
      })
    });
      
    this.progress.set(url, promise);
    return promise;
  }

  clearRef(ref) {
    this.cache.clearRef(ref);
  }
}

module.exports = CachedDownloader;