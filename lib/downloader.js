const fs = require('fs');
const mkdirp = require('mkdirp-then');
const path = require('path');
const URL = require('url');
const FollowRedirects = require('follow-redirects');
const EventEmitter = require('events').EventEmitter;
const mime = require('mime');

FollowRedirects.maxRedirects = 3;

class Downloader extends EventEmitter {
  constructor(options) {
    super();
    const url = URL.parse(options.url);
    const protocol = (url.protocol === 'https:') ? FollowRedirects.https : FollowRedirects.http;
    let filename = options.filename;
    let contentType = null;
    let downloadedBytes = 0;
    let totalSize = -1;
    let wantsProgress = false;

    function callProgressCB() {
      if (options.progressCB) options.progressCB({ url: url.href, downloadedBytes, totalSize });
    }

    const interval = setInterval(() => {
      if (wantsProgress) {
        wantsProgress = false;
        callProgressCB();
      }
    }, 100);

    function updateProgress(bytes) {
      downloadedBytes += bytes;
      wantsProgress = true;
    }

    protocol.get(url, (res) => {
      if (res.statusCode === 200) {
        contentType = res.headers['content-type'];
        totalSize = parseInt(res.headers['content-length'], 10);
        if (options.appendFileExt) {
          filename = `${filename}.${mime.getExtension(contentType)}`;
        }
        const localFile = fs.createWriteStream(filename, { encoding: 'binary' });
        localFile.on('finish', () => {
          this.emit('done', filename, contentType);
        });

        res.on('error', (e) => {
          clearInterval(interval);
          this.emit('error', e);
        });

        res.on('data', (chunk) => {
          updateProgress(chunk.length);
          return localFile.write(chunk);
        });

        res.on('end', () => {
          clearInterval(interval);
          callProgressCB();
          localFile.end();
        });
      } else {
        this.emit('error', new Error(`Could not download ${options.url} responseCode: ${res.statusCode}`));
      }
    })
    .on('error', err => this.emit('error', err));
  }
}

exports.download = (url, localFile, appendFileExt, progressCB) => mkdirp(path.dirname(localFile))
  .then(() => new Promise((resolve, reject) => {
    new Downloader({ url, filename: localFile, appendFileExt, progressCB })
      .on('error', err => reject(err))
      .on('done', filename => resolve({ filename }));
  }));
