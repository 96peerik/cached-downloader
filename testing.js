const Downloader = require('./cached-downloader');

const downloader = new Downloader({ localDirectory: '/var/tmp/downloader', ttl: 5000, sweep: 2000 });
downloader.on('error', err => console.error(err));
downloader.on('remove', item => console.error('item was removed from cache:', item));
downloader.on('progress', progress => console.log(progress));

const url = 'https://www.thomann.de/pics/bdb/147236/10085220_800.jpg';
downloader.init()
  .then(() => {
    // Download image and assign "bongos" as reference
    downloader.download(url, null, 'bongos')
    .then((item) => {
      console.log('available @', item);

      // clear the "bongos" reference, item will be discarded according to TTL
      downloader.clearRef('bongos');
    })
    .catch((e) => {
      console.log([...downloader.cache.ttlMap.entries()]);
      console.error(e);
    });


    downloader.download(url, null, 'bongos')
    .then((item) => {
      console.log('available @', item);
    })
    .catch(e => console.error(e));

    setTimeout(() => {
      downloader.download(url, null, 'bongos')
      .then((item) => {
        console.log('available @', item);
      })
      .catch(e => console.error(e));
    }, 2000);
  });

