import indexedDB from './indexed_db';
import Promise from './promise';
import Database from './database';

function open(name, version, upgradeCallback, keepOpen) {
  return new Promise(function(resolve, reject) {
    var req = version ? indexedDB.open(name, version) : indexedDB.open(name);

    req.onsuccess = function(event) {
      var db = new Database(req.result);
      resolve(db);

      setTimeout(function() {
        if (!keepOpen) {db.close();}
      }, 0);
    };
    req.onerror = function(event) {
      reject(event);
    };
    req.onupgradeneeded = function(event) {
      if (upgradeCallback) { upgradeCallback(new Database(req.result)); }
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

function bumpVersion(dbName, upgradeCallback) {
  return open(dbName).then(function(db) {
    return open(dbName, db.version + 1, function(db) {
      if (upgradeCallback) { upgradeCallback(db); }
    });
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

export { open, _delete, version, webkitGetDatabaseNames, bumpVersion, createObjectStore, deleteObjectStore };
