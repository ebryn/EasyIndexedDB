import idbDatabase from './indexed_db';
import ObjectStore from './object_store';
import Transaction from './transaction';
import hook from './hook';

var Database = function(idbDatabase) {
  this._idbDatabase = idbDatabase;
  this.name = idbDatabase.name;
  this.version = idbDatabase.version;
  this.objectStoreNames = idbDatabase.objectStoreNames;

  idbDatabase.onabort = hook.triggerHandler('database.onabort');
  idbDatabase.onerror = hook.triggerHandler('database.onerror');
  idbDatabase.onversionchange =  hook.triggerHandler('database.onversionchange');
};

Database.prototype = {
  _idbDatabase: null,
  name: null,
  version: null,
  objectStoreNames: null,

  close: function() {
    return hook.try('database.close', this, arguments, function(self) {
      return self._idbDatabase.close();
    });
  },

  createObjectStore: function(name, options) {
    return hook.try('database.createObjectStore', this, arguments, function(self) {
      return new ObjectStore(self._idbDatabase.createObjectStore(name, options));
    });
  },

  deleteObjectStore: function(name) {
    return hook.try('database.deleteObjectStore', this, arguments, function(self) {
      return self._idbDatabase.deleteObjectStore(name);
    });
  },

  objectStore: function(name, opts) {
    return this.transactionFor(name, opts).objectStore(name);
  },

  transaction: function(objectStores, mode, opts) {
    var tx = hook.try('database.transaction', this, arguments, function(self) {
      if (mode !== undefined) {
        return self._idbDatabase.transaction(objectStores, mode);
      }

      return self._idbDatabase.transaction(objectStores);
    });

    return new Transaction(tx);
  },

  _transactionsMap: null,

  transactionFor: function(objectStore, opts) {
    var self = this;
    if (!this._transactionsMap) { this._transactionsMap = {}; }

    // Clear transaction references at the end of the browser event loop
    // TODO: Is this sane?
    setTimeout(function() {
      self._transactionsMap = {};
    }, 0);

    return this._transactionsMap[objectStore] = this._transactionsMap[objectStore] || this.transaction([objectStore], "readwrite", opts);
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
  },

  hasObjectStore: function(name) {
    return this.objectStoreNames.contains(name);
  }
};

export Database;
