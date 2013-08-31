import Promise from './promise';
import Index from './index';

var ObjectStore = function(idbObjectStore) {
  this._idbObjectStore = idbObjectStore;
  this.keyPath = idbObjectStore.keyPath;
  this.indexNames = idbObjectStore.indexNames;
  this.name = idbObjectStore.name;
  this.autoIncrement = idbObjectStore.autoIncrement;
};

ObjectStore.prototype = {
  _idbObjectStore: null,
  keyPath: null,
  name: null,
  autoIncrement: null,

  add: function(obj) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var req = self._idbObjectStore.add(obj);

      req.onsuccess = function(event) {
        resolve(event);
      };
      req.onerror = function(event) {
        reject(event);
      };
    });
  },

  get: function(key) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var req = self._idbObjectStore.get(key);

      req.onsuccess = function(event) {
        resolve(event.target.result);
      };
      req.onerror = function(event) {
        reject(event);
      };
    });
  },

  put: function(obj, key) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var req = key ? self._idbObjectStore.put(obj, key) : self._idbObjectStore.put(obj);

      req.onsuccess = function(event) {
        resolve(obj); // NOTE: event.target.result seems to be the ID, not the object
      };
      req.onerror = function(event) {
        reject(event);
      };
    });
  },

  "delete": function(key) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var req = self._idbObjectStore.delete(key);

      req.onsuccess = function(event) {
        resolve(event);
      };
      req.onerror = function(event) {
        reject(event);
      };
    });
  },

  indexNames: null,

  index: function(name) {
    return new Index(this._idbObjectStore.index(name));
  },

  createIndex: function(name, keyPath, params) {
    var store = this._idbObjectStore,
        index = store.createIndex(name, keyPath, params);

    this.indexNames = store.indexNames;
    return new Index(index);
  },

  deleteIndex: function(name) {
    var store = this._idbObjectStore,
        res = store.deleteIndex(name);

    this.indexNames = store.indexNames;
    return res;
  }
};

export ObjectStore;
