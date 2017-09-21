const Downloader = require('./cached-downloader');

const dl = new Downloader();

dl.download('https://www.thomann.de/pics/bdb/147236/10085220_800.jpg', 'bongos')
.then((filename) => console.log(filename))
.catch(err => console.error(err));

dl.download('https://www.thomann.de/pics/bdb/147236/10085220_800.jpg', 'bongos')
.then((filename) => console.log(filename))
.catch(err => console.error(err));

dl.download('https://www.thomann.de/pics/bdb/147236/10085220_800.jpg', 'bongos')
.then((filename) => console.log(filename))
.catch(err => console.error(err));

setTimeout(() => dl.clearRef('bongos'), 5000);
