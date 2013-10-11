import Promise from './promise';
import Index from './index';
import { __instrument__, _request, _openCursor, _getAll, _hasKeyPath } from './utils';
import hook from './hook';

var ObjectStore = function(idbObjectStore) {
  this._idbObjectStore = idbObjectStore;
  this.keyPath = idbObjectStore.keyPath;  // TODO - normalize to Array
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

  // For use with out-of-line key stores. (Database doesn't
  // return the interal key when fetching records.)
  // Requires a database that has not been closed.
  // When does, it will close the database.
  insertWith_key: function(method, value, key, db) {
    var store = this;

    if (key) {
      value._key = key;
      db.close();
      return store[method](value, key);
    }

    return store.add(value).then(function(key) {
      value._key = key;

      return __instrument__(function() {  // __instrument__ is used in testing
        // if the transaction used for #add above gets put into the next
        // event loop cycle (happens when using Ember), we need to create
        // a new transaction fo the #put action

        var tx = hook.try('objectStore.insertWith_key', store, arguments, function(self) {
          return store._idbObjectStore.transaction.db.transaction(store.name, "readwrite");  // must keep this all chained
        });

        if (tx) {
          var newStore = new ObjectStore(tx.objectStore(store.name));

          return newStore.put(value, key).then(function(_key) {
            db.close();
            return _key;
          });
        }

        db.close();  // error occurred
        return false;
      });
    });
  },

  indexNames: null,

  index: function(name) {
    return hook.try('objectStore.index', this, arguments, function(self) {
      return new Index(self._idbObjectStore.index(name), self);
    });
  },

  createIndex: function(name, keyPath, params) {
    var store = this._idbObjectStore;

    var index = hook.try('objectStore.createIndex', this, arguments, function(self) {
      return store.createIndex(name, keyPath, params);
    });

    this.indexNames = store.indexNames;
    return new Index(index, this);
  },

  deleteIndex: function(name) {
    var store = this._idbObjectStore;

    var res = hook.try('objectStore.deleteIndex', this, arguments, function(self) {
      return store.deleteIndex(name);
    });

    this.indexNames = store.indexNames;
    return res;
  },

  getIndexes: function() {
    var name,
        indexes = [],
        indexNames = this.indexNames;

    for (var i = 0; i < indexNames.length; i++) {
      name = indexNames[i];
      indexes.push(this.index(name));
    }

    return indexes;
  },

  hasKeyPath: function(path) {
    return _hasKeyPath(this, path);
  }
};

export ObjectStore;
