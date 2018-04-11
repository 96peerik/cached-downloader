const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

global.expect = chai.expect;
global.describe = global.describe;
global.it = global.it;

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

