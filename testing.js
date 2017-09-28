const os = require('os');
const path = require('path');
const dir = '/Users/peter/filecache';

const Downloader = require('./cached-downloader');

const downloader = new Downloader({ localDirectory: '/var/tmp/downloader' });

const url = 'https://www.thomann.de/pics/bdb/147236/10085220_800.jpg';
downloader.init()
  .then(() => {
    // Download image and assign "bongos" as reference
    downloader.download(url, null, 'bongos')
    .then((filename) => {
        console.log('downloaded to', filename);

        // clear the "bongos" reference, item will be discarded according to TTL
        downloader.clearRef('bongos');
    });
  });

