# CachedDownloader
Module that downloads over http/https and keeps the file in local cache. Items in cache can be assigned references and will not be deleted as long as the reference is active. If an item is dereferenced, TTL property will decide when the file is deleted.


### Install

`npm install cached-downloader`

### Example
```javascript

const Downloader = require('./cached-downloader');

const downloader = new Downloader({ localDirectory: '/var/tmp/downloader', ttl: 5000, sweep: 2000 });
downloader.on('error', err => console.error(err));
downloader.on('remove', item => console.log('item was removed from cache:', item));
downloader.on('progress', progress => console.log(progress));

const url = 'https://www.thomann.de/pics/bdb/147236/10085220_800.jpg';
downloader.init()
  .then(() => {
    // Download image and assign "bongos" as reference
    downloader.download(url, null, 'bongos')
    .then((filename) => {
      console.log('available @', filename);

      // clear the "bongos" reference, item will be discarded according to TTL
      downloader.clearRef('bongos');
    });
  });




```

