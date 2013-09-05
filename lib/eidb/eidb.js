import indexedDB from './indexed_db';
import { Promise, RSVP } from './promise';
import Database from './database';
import { _warn, _request, __instrument__ } from './utils';

function open(name, version, upgradeCallback, opts) {
  return new Promise(function(resolve, reject) {
    var req = version ? indexedDB.open(name, version) : indexedDB.open(name);

    req.onsuccess = function(event) {
      var db = new Database(req.result);
      resolve(db);

      if (!opts || (opts && !opts.keepOpen)) {
        setTimeout(function() {
          db.close();
        }, 0);
      }
    };
    req.onerror = function(event) {
      reject(event);
    };
    req.onupgradeneeded = function(event) {
      var db = new Database(req.result),
          ret = (opts && opts.returnEvent) ? {db: db, event: event} : db;
      if (upgradeCallback) { upgradeCallback(ret); }
    };
  });
}

function _delete(name) {
  return _request(indexedDB, "deleteDatabase", arguments);
}

function version(dbName){
  return open(dbName).then(function(db) {
    return db.version;
  });
}

function webkitGetDatabaseNames() {
  return _request(indexedDB, "webkitGetDatabaseNames");
}

function getDatabaseNamesSupported() {
  return 'webkitGetDatabaseNames' in indexedDB;
}

function getDatabaseNames() {
  if (getDatabaseNamesSupported()) {
    return webkitGetDatabaseNames();
  }

  _warn(true, "EIDB.getDatabaseNames is currently only supported in Chrome" );
  return RSVP.all([]);
}

function openOnly(dbName, version, upgradeCallback, opts) {
  if (getDatabaseNamesSupported()) {
    return getDatabaseNames().then(function(names) {
      if (names.contains(dbName) && !version) {
        return open(dbName, version, upgradeCallback, opts);
      }

      if (names.contains(dbName) && version) {
        return open(dbName).then(function(db) {
          if (db.version >= version) {
            return open(dbName, version, upgradeCallback, opts);
          }
          return null;
        });
      }

      return null;
    });
  }

  _warn(true, "EIDB.openOnly acts like .open in non-supported browsers" );
  return open(dbName, version, upgradeCallback, opts);
}

function bumpVersion(dbName, upgradeCallback, opts) {
  return open(dbName).then(function(db) {
    return open(dbName, db.version + 1, function(res) {
      if (upgradeCallback) { upgradeCallback(res); }
    }, opts);
  });
}

function createObjectStore(dbName, storeName, storeOpts) {
  var opts = storeOpts ? storeOpts : {autoIncrement: true};

  return bumpVersion(dbName, function(db) {
    db.createObjectStore(storeName, opts);
  });
}

function deleteObjectStore(dbName, storeName) {
  return bumpVersion(dbName, function(db) {
    db.deleteObjectStore(storeName);
  });
}

function createIndex(dbName, storeName, indexName, keyPath, indexOpts) {
  return bumpVersion(dbName, function(res) {
    var store = res.event.target.transaction.objectStore(storeName);
    store.createIndex(indexName, keyPath, indexOpts);
  }, {returnEvent: true});
}

function _storeAction(dbName, storeName, callback, openOpts) {
  return open(dbName, null, null, openOpts).then(function(db) {
    var store = db.objectStore(storeName);

    if (openOpts && openOpts.keepOpen) {
      return callback(store, db);
    }

    return callback(store);
  });
}

// note ObjectStore#insertWith_key will close the database
function _insertRecord(dbName, storeName, value, key, method) {
  return _storeAction(dbName, storeName, function(store, db) {

    if (value instanceof Array) {
      return RSVP.all(value.map(function(_value, i) {

        if (!store.keyPath && key instanceof Array) {
          return store.insertWith_key(method, _value, key[i], db);
        }

        if (!store.keyPath) {
          return store.insertWith_key(method, _value, null, db);
        }

        // in-line keys
        db.close();
        return store[method](_value);
      }));
    }

    if (!store.keyPath) {
      return store.insertWith_key(method, value, key, db);
    }

    // in-line keys
    db.close();
    return store[method](value, key);
  }, {keepOpen: true});
}

function addRecord(dbName, storeName, value, key) {
  return _insertRecord(dbName, storeName, value, key, 'add');
}

function putRecord(dbName, storeName, value, key) {
  return _insertRecord(dbName, storeName, value, key, 'put');
}

function getRecord(dbName, storeName, key) {
  return _storeAction(dbName, storeName, function(store) {
    return store.get(key);
  });
}

function deleteRecord(dbName, storeName, key) {
  return _storeAction(dbName, storeName, function(store) {
    return store.delete(key);
  });
}

function getAll(dbName, storeName, range, direction) {
  return _storeAction(dbName, storeName, function(store) {
    return store.getAll(range, direction);
  });
}

export { open, _delete, version, webkitGetDatabaseNames, getDatabaseNamesSupported, getDatabaseNames, openOnly, bumpVersion, createObjectStore, deleteObjectStore, createIndex, addRecord, getRecord, putRecord, deleteRecord, getAll };
