const Downloader = require('./cached-downloader');
const os = require('os');
const path = require('path');
const dir = '/Users/peter/filecache';

const dl = new Downloader({ localDirectory: dir });
dl.init().then(() => {
})
.catch((err) => console.error(err));

setTimeout(() => {
    dl.download('https://www.thomann.de/pics/bdb/147236/10085220_800.jpg', null, 'bongos')
    .then((filename) => console.log(filename))
    .catch(err => console.error(err));
    
    dl.download('https://www.thomann.de/pics/bdb/147236/10085220_800.jpg', null, 'bongos')
    .then((filename) => console.log(filename))
    .catch(err => console.error(err));
    
    dl.download('https://www.thomann.de/pics/bdb/147236/10085220_800.jpg', null, 'bongos')
    .then((filename) => console.log(filename))
    .catch(err => console.error(err));
}, 1000);

setTimeout(() => {
    dl.download('https://www.thomann.de/pics/bdb/147236/10085220_800.jpg', null, 'bongos')
    .then((filename) => console.log(filename))
    .catch(err => console.error(err));
    
    dl.download('https://www.thomann.de/pics/bdb/147236/10085220_800.jpg', null, 'bongos')
    .then((filename) => console.log(filename))
    .catch(err => console.error(err));
    
    dl.download('https://www.thomann.de/pics/bdb/147236/10085220_800.jpg', null, 'bongos')
    .then((filename) => console.log(filename))
    .catch(err => console.error(err));
}, 10000);


//setTimeout(() => dl.clearRef('bongos'), 5000);
