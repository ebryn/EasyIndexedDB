import Promise from './promise';
import { _request, _openCursor, _getAll, _hasKeyPath } from './utils';

var Index = function(idbIndex, store) {
  this._idbIndex = idbIndex;
  this.name = idbIndex.name;
  this.objectStore = store;
  this.keyPath = idbIndex.keyPath;  // TODO - normalize to Array
  this.multiEntry = idbIndex.multiEntry;
  this.unique = idbIndex.unique;
};

Index.prototype = {
  _idbIndex: null,
  name: null,
  objectStore: null,
  keyPath: null,
  multiEntry: null,
  unique: null,

  openCursor: function(range, direction, onsuccess) {
    return _openCursor(this._idbIndex, range, direction, onsuccess);
  },

  openKeyCursor: function(range, direction, onsuccess) {
    return _openCursor(this._idbIndex, range, direction, onsuccess, {keyOnly: true});
  },

  get: function(key) {
    return _request(this._idbIndex, "get", arguments);
  },

  getKey: function(key) {
    return _request(this._idbIndex, "getKey", arguments);
  },

  count: function(key) {
    return _request(this._idbIndex, "count", arguments);
  },

  getAll: function(range, direction) {
    return _getAll(this._idbIndex, range, direction);
  },

  hasKeyPath: function(path) {
    return _hasKeyPath(this, path);
  }
};

export Index;
