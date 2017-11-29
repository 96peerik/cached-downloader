const fs = require('fs');
const mkdirp = require('mkdirp-then');
const path = require('path');
const URL = require('url');
const FollowRedirects = require('follow-redirects');
const EventEmitter = require('events').EventEmitter;
const mime = require('mime');

FollowRedirects.maxRedirects = 3;

const DEFAULT_DATA_TIMEOUT = 10 * 1000;

class Downloader extends EventEmitter {
  constructor(options) {
    super();
    this.url = URL.parse(options.url);
    this.protocol = (this.url.protocol === 'https:') ? FollowRedirects.https : FollowRedirects.http;
    this.filename = options.filename;
    this.contentType = null;
    this.downloadedBytes = 0;
    this.totalSize = -1;
    this.progressCB = options.progressCB;
    this.wantsProgress = false;

    this.isError = false;
    this.isTimeout = false;
    this.aborted = false;

    this.writeStream = null;
    this.readStream = null;

    this.timeout = options.timeout || DEFAULT_DATA_TIMEOUT;

    this.interval = setInterval(() => {
      if (this.wantsProgress) {
        this.wantsProgress = false;
        this.callProgressCB();
      }
    }, 1000);

    this.opt = {
      host: this.url.hostname,
      path: this.url.path,
      method: 'GET',
      port: this.url.port,
    };

    this.req = this.protocol.get(this.opt, (res) => {
      if (res.statusCode === 200) {
        this.contentType = res.headers['content-type'];
        this.totalSize = parseInt(res.headers['content-length'], 10);
        if (options.appendFileExt) {
          this.filename = `${this.filename}.${mime.getExtension(this.contentType)}`;
        }

        this.writeStream = fs.createWriteStream(this.filename, { encoding: 'binary' });

        this.readStream = res;
        this.readStream.pipe(this.writeStream);

        this.readStream.on('error', e => this.abort(e));
        this.writeStream.on('error', e => this.abort(e));

        this.readStream.on('data', (chunk) => {
          this.downloadedBytes += chunk.length;
          this.wantsProgress = true;
        });

        this.writeStream.on('close', () => {
          if (!this.isError) {
            this.done();
          }
        });
      } else {
        this.abort(new Error(`Could not download ${this.url.href} response code: ${res.statusCode}`));
      }
    });

    this.req.setTimeout(this.timeout, () => {
      this.isTimeout = true;
      this.abort();
    });

    this.req.on('error', (err) => {
      this.abort(err);
    });
  }

  done() {
    clearInterval(this.interval);
    this.callProgressCB();

    this.emit('done', this.filename);
    this.removeAllListeners();
  }

  abort(err) {
    if (this.aborted) return;
    this.aborted = true;
    this.isError = true;
    let error = err;
    this.req.abort();
    if (this.isTimeout) error = new Error(`Download timeout for ${this.url.href}`);
    if (this.readStream) this.readStream.destroy();
    if (this.writeStream) this.writeStream.destroy();
    this.emit('error', error);
    clearInterval(this.interval);
    this.removeAllListeners();
  }

  callProgressCB() {
    if (this.progressCB) {
      this.progressCB({
        url: this.url.href,
        downloadedBytes: this.downloadedBytes,
        totalSize: this.totalSize
      });
    }
  }

  updateProgress(bytes) {
    this.downloadedBytes += bytes;
    this.wantsProgress = true;
  }
}

exports.download = (url, localFile, appendFileExt, progressCB) => mkdirp(path.dirname(localFile))
  .then(() => new Promise((resolve, reject) => {
    new Downloader({ url, filename: localFile, appendFileExt, progressCB })
      .once('error', err => reject(err))
      .once('done', filename => resolve({ filename }));
  }));
