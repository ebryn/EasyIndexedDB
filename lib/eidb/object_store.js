import Promise from './promise';
import Index from './index';
import { _request, _openCursor, _getAll } from './utils';

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
    return _request(this._idbObjectStore, 'put', arguments);
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

  getAll: function(range, direction) {
    return _getAll(this._idbObjectStore, range, direction);
  },

  // for use with out-of-line key stores. (Database doesn't
  // return the interal key when fetching records.)
  insertWith_key: function(method, value, key) {
    var store = this;

    if (key) {
      value._key = key;
      return store[method](value, key);
    }

    return store.add(value).then(function(key) {
      value._key = key;
      return store.put(value, key);
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
  }
};

export ObjectStore;
