const EventEmitter = require('events').EventEmitter;
const Downloader = require('./lib/downloader');
const Cache = require('./lib/referenced-file-cache');
const os = require('os');
const path = require('path');

function getTempFolder() {
  return path.join(os.tmpdir(), 'cached-downloader'); 
}

class ProgressItem extends EventEmitter {
  constructor(promise) {
    this.promise = promise;
    this.totalBytes;
    this.downloadedBytes;
  }
}

class CachedDownloader extends EventEmitter {
  constructor(options) {
    super();
    this.options = options || {};
    this.localDirectory = this.options.localDirectory || getTempFolder()
    this.progress = new Map();
    this.cache = new Cache();
    this.cache.on('remove', (item) => console.log('remove', item));
  }

  download(url, ref) {
    // download of this url already in progress - return original promise
    if (this.progress.has(url)) return this.progress.get(url);
    
    const promise = this.cache.get(url, ref).then(item => item.filename)
      .catch((err) => Downloader.download(url, path.join(this.localDirectory, 'test.txt'))
        .then((item) => this.cache.set(url, item.filename, ref))
        .then((item) => {
          this.progress.delete(url);
          return item.filename
        })
        .catch((err) => {
          this.progress.delete(url);
          throw err;
        })
      )
    this.progress.set(url, promise);
    return promise;
  }

  clearRef(ref) {
    this.cache.clearRef(ref);
  }
}

module.exports = CachedDownloader;