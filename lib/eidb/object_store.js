import Promise from './promise';
import Index from './index';
import { _request, _openCursor } from './utils';

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

  add: function(value, key) {
   return _request(this._idbObjectStore, 'add', arguments);
  },

  get: function(key) {
    return _request(this._idbObjectStore, 'get', arguments);
  },

  put: function(value, key) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var req = key ? self._idbObjectStore.put(value, key) : self._idbObjectStore.put(value);

      req.onsuccess = function(event) {
        resolve(value); // NOTE: event.target.result seems to be the ID, not the object
      };
      req.onerror = function(event) {
        reject(event);
      };
    });
  },

  "delete": function(key) {
    return _request(this._idbObjectStore, 'delete', arguments);
  },

  count: function() {
    return _request(this._idbObjectStore, 'count');
  },

  clear: function() {
    return _request(this._idbObjectStore, 'clear');
  },

  openCursor: function(range, direction, onsuccess) {
    return _openCursor(this._idbObjectStore, range, direction, onsuccess);
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
  }
};

export ObjectStore;
