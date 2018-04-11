const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const expect = chai.expect;
const describe = global.describe;
const it = global.it;

const mock = require('mock-require');

mock.stop('../lib/storage.js');
const Storage = require('../lib/storage.js');

const path = require('path');

let storageA = null;
let storageB = null;
describe('storage', () => {
  describe('create', () => {
    it('should init a new storage', () => {
      storageA = new Storage(path.join(__dirname, './tmp/store'));
      return storageA.init();
    });
    it('should fail to init a new storage', () => {
      storageB = new Storage(path.join(__dirname, './tmp/store'));
      return expect(storageB.init()).to.be.rejected;
    });
    it('should destroy old and init a new storage', () => {
      storageA.destroy();
      storageB = new Storage(path.join(__dirname, './tmp/store'));
      return storageB.init();
    });
  });
});

