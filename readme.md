# CachedDownloader

`npm install cached-downloader`

### Example
```javascript
const Downloader = require('cached-downloader');

const downloader = new Downloader({ localDirectory: '/var/tmp/downloader' });

downloader.init().then(() => console.log('initialized'));



```

