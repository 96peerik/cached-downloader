const fs = require('fs');
const mkdirp = require('mkdirp-then');
const path = require('path');
const URL = require('url');
const FollowRedirects = require('follow-redirects');
const EventEmitter = require('events').EventEmitter;

FollowRedirects.maxRedirects = 3;

class Downloader extends EventEmitter {
  constructor(options) {
    super();
    let protocol = (options.url.split('://')[0] === 'https') ? FollowRedirects.https : FollowRedirects.http;
    const url = URL.parse(options.url);
    const filename = options.filename;

    protocol.get(url, (res) => {
      if (res.statusCode === 200) {
        const localFile = fs.createWriteStream(filename, { encoding: 'binary' });
        localFile.on('finish', () => {
          this.emit('done', filename);
        });

        res.on('error', e => this.emit('error', e));
        res.on('data', chunk => localFile.write(chunk));
        res.on('end', () => localFile.end());
      } else {
        this.emit('error', new Error(`Could not download ${options.url} responseCode: ${res.statusCode}`));
      }
    })
    .on('error', err => this.emit('error', err));
  }
}

exports.download = (url, localFile) => mkdirp(path.dirname(localFile))
  .then(() => new Promise((resolve, reject) => {
    new Downloader({ url, filename: localFile })
      .on('error', err => reject(err))
      .on('done', filename => resolve({ filename }));
  }));
