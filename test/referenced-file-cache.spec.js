const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const expect = chai.expect;
const describe = global.describe;
const it = global.it;

const mock = require('mock-require');

class StorageMock {
  constructor() {
    this.items = new Map();
  }
  get(id) {
    if (!this.items.has(id)) return Promise.reject(new Error('not found'));
    return Promise.resolve(this.items.get(id));
  }
  batch(ops) {
    ops.forEach((op) => {
      if (op.type === 'del') this.items.remove(op.key);
    });
  }
  getAll() {
    return Promise.resolve([...this.items.entries()]);
  }
  set(id, value) {
    this.items.set(id, value);
    return Promise.resolve();
  }
  remove(id) {
    this.items.delete(id);
    return Promise.resolve();
  }
  init() {  //eslint-disable-line
    return Promise.resolve();
  }
}

mock('../lib/storage.js', StorageMock);

const FileCache = require('../lib/referenced-file-cache.js');
const path = require('path');

const cache = new FileCache({ path: path.join(__dirname, 'tmp'), ttl: 1 });
clearInterval(cache.sweepRef);

function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

describe('referenced file cache', () => {
  describe('fileExists', () => {
    it('should return true, because file exists', () =>
      expect(FileCache.fileExists(path.join(__dirname, './referenced-file-cache.spec.js')))
        .to.eventually.equal(true)
    );
    it('should return false, because file does not exist', () =>
      expect(FileCache.fileExists(path.join(__dirname, './file.that.does.not.exists.js')))
        .to.eventually.equal(false)
    );
  });

  const filename = path.join(__dirname, 'referenced-file-cache.spec.js');

  describe('fileCache', () => {
    it('should init ok', () => cache.init());
    it('should write an entry', () => cache.set('a', filename, null));
    it('should write item with non-existing file', () => cache.set('c', 'bongo', null));
    it('should fail to read back entry with non-existing file', () =>
      expect(cache.get('c')).to.eventually.be.rejected.and.have.property('name', 'NotFoundError'));
    it('should read back entry', () => expect(cache.get('a')).to.eventually.deep.equal({ filename, id: 'a' }));
    it('should fail to read back non-existing entry', () => expect(cache.get('b')).to.eventually.be.rejected);
    it('should fail to read back expired entry', () => {
      cache.sweep();
      return wait(10)
      .then(() => expect(cache.get('a')).to.eventually.be.rejected);
    });
    it('should write an entry', () => cache.set('a', filename, 'ref'));
    it('should read back expired entry because it is still referenced', () => {
      cache.sweep();
      return wait(10)
      .then(() => cache.get('a'));
    });
    it('should clear a reference and fail to read because ttl expired', () => {
      cache.clearRef('ref');
      return wait(10)
      .then(() => cache.sweep())
      .then(() => wait(1))
      .then(() => expect(cache.get('a')).to.be.rejected);
    });
  });
});

