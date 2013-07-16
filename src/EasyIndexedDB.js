(function(global) {
  // In the following line, you should include the prefixes of implementations you want to test.
  var indexedDB = global.indexedDB = global.indexedDB || global.mozIndexedDB || global.webkitIndexedDB || global.msIndexedDB;
  // DON'T use "var indexedDB = ..." if you're not in a function.
  // Moreover, you may need references to some global.IDB* objects:
  global.IDBTransaction = global.IDBTransaction || global.webkitIDBTransaction || global.msIDBTransaction;
  global.IDBKeyRange = global.IDBKeyRange || global.webkitIDBKeyRange || global.msIDBKeyRange;
  // (Mozilla has never prefixed these objects, so we don't need global.mozIDB*)

  if (!global.indexedDB) {
      global.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
  }

  var Promise = RSVP.Promise;

  var EIDB = global.EIDB = {
    open: function(name, version, upgradeCallback) {
      version = version || 1;

      return new Promise(function(resolve, reject) {
        var req = indexedDB.open(name, version);
        req.onsuccess = function(event) {
          resolve(new Database(req.result));
        };
        req.onerror = function(event) {
          reject(event);
        };
        req.onupgradeneeded = function(event) {
          // console.log("onupgradeneeded", event);
          if (upgradeCallback) { upgradeCallback(new Database(req.result)); }
        };
      });
    }
  };

  var Database = EIDB.Database = function(idbDatabase) {
    this._idbDatabase = idbDatabase;
  };

  Database.prototype = {
    _idbDatabase: null,

    close: function() {
      return this._idbDatabase.close();
    },

    createObjectStore: function(name, options) {
      return new ObjectStore(this._idbDatabase.createObjectStore(name, options));
    },

    transaction: function(objectStores, mode) {
      var tx;

      if (mode !== undefined) {
        tx = this._idbDatabase.transaction(objectStores, mode);
      } else {
        tx = this._idbDatabase.transaction(objectStores);
      }

      return new Transaction(tx);
    }
  };

  var ObjectStore = EIDB.ObjectStore = function(idbObjectStore) {
    this._idbObjectStore = idbObjectStore;
  };

  ObjectStore.prototype = {
    _idbObjectStore: null,

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
    }
  };

  // transactions have onerror, onabort, and oncomplete events
  var Transaction = EIDB.Transaction = function(idbTransaction) {
    this._idbTransaction = idbTransaction;
  };

  RSVP.EventTarget.mixin(Transaction.prototype);

  Transaction.prototype = {
    _idbTransaction: null,

    objectStore: function(name) {
      return new ObjectStore(this._idbTransaction.objectStore(name));
    }
  };

  var Request = EIDB.Request = function(idbRequest) {
    this._idbRequest = idbRequest;
  };

  RSVP.EventTarget.mixin(Request.prototype);

  Request.prototype = {
    _idbRequest: null,


  };


})(this);