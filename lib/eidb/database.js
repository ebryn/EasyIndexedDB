import idbDatabase from './indexed_db';
import ObjectStore from './object_store';
import Transaction from './transaction';

var Database = function(idbDatabase) {
  this._idbDatabase = idbDatabase;
  this.name = idbDatabase.name;
  this.version = idbDatabase.version;
  this.objectStoreNames = idbDatabase.objectStoreNames;
};

Database.prototype = {
  _idbDatabase: null,
  name: null,
  version: null,
  objectStoreNames: null,

  close: function() {
    return this._idbDatabase.close();
  },

  createObjectStore: function(name, options) {
    return new ObjectStore(this._idbDatabase.createObjectStore(name, options));
  },

  deleteObjectStore: function(name) {
    return this._idbDatabase.deleteObjectStore(name);
  },

  objectStore: function(name) {
    return this.transactionFor(name).objectStore(name);
  },

  transaction: function(objectStores, mode) {
    var tx;

    if (mode !== undefined) {
      tx = this._idbDatabase.transaction(objectStores, mode);
    } else {
      tx = this._idbDatabase.transaction(objectStores);
    }

    return new Transaction(tx);
  },

  _transactionsMap: null,

  transactionFor: function(objectStore) {
    var self = this;
    if (!this._transactionsMap) { this._transactionsMap = {}; }

    // Clear transaction references at the end of the browser event loop
    // TODO: Is this sane?
    setTimeout(function() {
      self._transactionsMap = {};
    }, 0);

    return this._transactionsMap[objectStore] = this._transactionsMap[objectStore] || this.transaction([objectStore], "readwrite");
  },

  add: function(objectStore, id, obj) {
    var store = this.objectStore(objectStore),
        key = store.keyPath;

    obj[key] = id;
    return store.add(obj).then(function(event) {
      return obj;
    });
  },

  get: function(objectStore, id) {
    var store = this.objectStore(objectStore);
    return store.get(id);
  },

  put: function(objectStore, id, obj) {
    var store = this.objectStore(objectStore),
        key = store.keyPath;

    obj[key] = id;
    return store.put(obj);
  },

  "delete": function(objectStore, id) {
    return this.objectStore(objectStore).delete(id);
  }
};

export Database;
