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
    return new Index(this._idbObjectStore.index(name), this);
  },

  createIndex: function(name, keyPath, params) {
    var store = this._idbObjectStore,
        index = store.createIndex(name, keyPath, params);

    this.indexNames = store.indexNames;
    return new Index(index, this);
  },

  deleteIndex: function(name) {
    var store = this._idbObjectStore,
        res = store.deleteIndex(name);

    this.indexNames = store.indexNames;
    return res;
  },

  openCursor: function(range, direction, onsuccess) {
    var self = this;
        range = range || null;
        direction = direction || 'next';

    return new Promise(function(resolve, reject) {
      var req = self._idbObjectStore.openCursor(range, direction);

      req.onsuccess = function(event) {
        onsuccess(event.target.result, resolve);
      };
      req.onerror = function(event) {
        reject(event);
      };
    });
  },

  count: function() {
    var self = this;

    return new Promise(function(resolve, reject) {
      var req = self._idbObjectStore.count();

      req.onsuccess = function(evt) {
        resolve(evt.target.result);
      };
      req.onerror = function(evt) {
        reject(evt);
      };
    });
  },

  clear: function() {
    var self = this;

    return new Promise(function(resolve, reject) {
      var req = self._idbObjectStore.clear();

      req.onsuccess = function(evt) {
        resolve(evt);
      };
      req.onerror = function(evt) {
        reject(evt);
      };
    });
  }
};

export ObjectStore;
