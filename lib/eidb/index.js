import Promise from './promise';
import _openCursor from './utils';

var Index = function(idbIndex, store) {
  this._idbIndex = idbIndex;
  this.name = idbIndex.name;
  this.objectStore = store;
  this.keyPath = idbIndex.keyPath;
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
    var self = this;
    range = range || null;
    direction = direction || 'next';

    return new Promise(function(resolve, reject) {
      var req = self._idbIndex.openKeyCursor(range, direction);

      req.onsuccess = function(event) {
        onsuccess(event.target.result, resolve);
      };
      req.onerror = function(event) {
        reject(event);
      };
    });
  },

  get: function(key) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var req = self._idbIndex.get(key);

      req.onsuccess = function(event) {
        resolve(event.target.result);
      };
      req.onerror = function(event) {
        reject(event);
      };
    });
  },

  getKey: function(key) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var req = self._idbIndex.getKey(key);

      req.onsuccess = function(event) {
        resolve(event.target.result);
      };
      req.onerror = function(event) {
        reject(event);
      };
    });
  },

  count: function(key) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var req = key ? self._idbIndex.count(key) : self._idbIndex.count();

      req.onsuccess = function(event) {
        resolve(event.target.result);
      };
      req.onerror = function(event) {
        reject(event);
      };
    });
  },

  getAll: function(range, direction) {
    var res = [];

    return this.openCursor(range, direction, function(cursor, resolve) {
      if (cursor) {
        res.push(cursor.value);
        cursor.continue();
      } else {
        resolve(res);
      }
    });
  }
};

export Index;
