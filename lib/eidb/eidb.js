import indexedDB from './indexed_db';
import Promise from './promise';
import Database from './database';

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
  return new Promise(function(resolve, reject) {
    var req = indexedDB.deleteDatabase(name);
    req.onsuccess = function(event) {
      resolve(event);
    };
    req.onerror = function(event) {
      reject(event);
    };
  });
}

function version(dbName){
  return open(dbName).then(function(db) {
    return db.version;
  });
}

function webkitGetDatabaseNames() {
  var req = indexedDB.webkitGetDatabaseNames();

  return new Promise(function(resolve, reject) {
    req.onsuccess = function(evt) {
      resolve(evt.target.result);
    };
    req.onerror = function(evt) {
      reject(evt);
    };
  });
}

function bumpVersion(dbName, upgradeCallback, opts) {
  return open(dbName).then(function(db) {
    return open(dbName, db.version + 1, function(res) {
      if (upgradeCallback) { upgradeCallback(res); }
    }, opts);
  });
}

function createObjectStore(dbName, storeName, storeOpts) {
  return bumpVersion(dbName, function(db) {
    db.createObjectStore(storeName, storeOpts);
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

export { open, _delete, version, webkitGetDatabaseNames, bumpVersion, createObjectStore, deleteObjectStore, createIndex };
