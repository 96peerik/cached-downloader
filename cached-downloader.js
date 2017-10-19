const EventEmitter = require('events').EventEmitter;
const Downloader = require('./lib/downloader');
const Cache = require('./lib/referenced-file-cache');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CachedDownloader extends EventEmitter {
  constructor(options) {
    super();
    if ((options == null) || (options.localDirectory == null)) {
      throw (new Error('CachedDownloader: localDirectory property missing in options object to constructor'));
    }
    this.localDirectory = options.localDirectory;
    this.progress = new Map();
    this.cache = new Cache({ path: this.localDirectory, ttl: options.ttl, sweep: options.sweep });
    this.cache.on('remove', (item) => {
      fs.unlink(item.filename, () => this.emit('remove', item));
    });
  }

  init() {
    return this.cache.init();
  }

  static hashString(str) {
    return crypto.createHash('md5').update(str).digest('hex');
  }

  getItemStatus(url, ref) {
    if (this.progress.has(url)) return null;
    return this.cache.getSync(url, ref);
  }

  download(url, localFile, ref) {
    const filename = localFile || CachedDownloader.hashString(url);
    // download of this url already in progress - return original promise
    if (this.progress.has(url)) return this.progress.get(url);

    const promise = this.cache.get(url, ref).then((item) => {
      this.progress.delete(url);
      return { filename: item.filename, fromCache: true };
    })
    .catch(() =>
      Downloader.download(url,
        path.join(this.localDirectory, filename),
        true,
        (progress) => {
          this.emit('progress', progress);
        }
      )
      .then(item => this.cache.set(url, item.filename, ref))
      .then((item) => {
        this.progress.delete(url);
        return { filename: item.filename, fromCache: false };
      })
      .catch((err) => {
        this.progress.delete(url);
        throw err;
      }));

    this.progress.set(url, promise);
    return promise;
  }

  clearRef(ref) {
    this.cache.clearRef(ref);
  }
}

module.exports = CachedDownloader;
