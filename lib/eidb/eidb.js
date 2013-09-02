import indexedDB from './indexed_db';
import { Promise, RSVP } from './promise';
import Database from './database';
import _request from './utils';

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

function _storeAction(dbName, storeName, callback) {
  return open(dbName).then(function(db) {
    var store = db.objectStore(storeName);
    return callback(store);
  });
}

function _insertRecord(dbName, storeName, value, key, method) {
  return _storeAction(dbName, storeName, function(store) {
    if (value instanceof Array) {
      return RSVP.all(value.map(function(_value, i) {

        if (!store.keyPath && key instanceof Array) {
          return store.insertWith_key(method, _value, key[i]);
        }

        if (!store.keyPath) { return store.insertWith_key(method, _value); }

        return store[method](_value);  // in-line keys
      }));
    }

    if (!store.keyPath) { return store.insertWith_key(method, value, key); }

    return store[method](value, key);  // in-line keys
  });
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

export { open, _delete, version, webkitGetDatabaseNames, bumpVersion, createObjectStore, deleteObjectStore, createIndex, addRecord, getRecord, putRecord, deleteRecord, getAll };
