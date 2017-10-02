const level = require('level');

class Storage {
  constructor(path) {
    this.path = path;
  }

  get(id) {
    return new Promise((resolve, reject) => {
      this.db.get(id, (err, value) => {
        if (err) return reject(err);
        return resolve(value);
      });
    });
  }

  batch(ops) {
    return new Promise((resolve, reject) => {
      this.db.batch(ops, (err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
  }

  getAll() {
    const res = [];
    return new Promise((resolve, reject) => {
      this.db.createReadStream()
      .on('data', (data) => {
        res.push([data.key, data.value]);
      })
      .on('error', err => reject(err))
      .on('end', () => resolve(res));
    });
  }

  set(id, item) {
    return new Promise((resolve, reject) => {
      this.db.put(id, item, (err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
  }

  remove(id) {
    return new Promise((resolve, reject) => {
      this.db.del(id, (err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
  }

  init() {
    return new Promise((resolve, reject) => {
      level(this.path, { valueEncoding: 'json' }, (err, db) => {
        if (err) return reject(err);
        this.db = db;
        return resolve();
      });
    });
  }
}

module.exports = Storage;
