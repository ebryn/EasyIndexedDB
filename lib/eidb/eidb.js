import indexedDB from './indexed_db';
import { Promise, RSVP } from './promise';
import Database from './database';
import { _warn, _request, __instrument__ } from './utils';
import { _rsvpErrorHandler } from './error_handling';
import { hook } from './hook';

function open(dbName, version, upgradeCallback, opts) {
  return new Promise(function(resolve, reject) {
    var EIDB = window.EIDB,
        req = version ? indexedDB.open(dbName, version) : indexedDB.open(dbName);

    req.onsuccess = function(event) {
      var db = new Database(req.result);

      hook('open.onsuccess.resolve', resolve, db);

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
      if (upgradeCallback) {
        hook('open.onupgradeneeded.callback', upgradeCallback, ret);
      }
    };
  }).then(null, _rsvpErrorHandler(indexedDB, "open", [dbName, version, upgradeCallback, opts]));
}

function _delete(dbName) {
  return _request(indexedDB, "deleteDatabase", arguments);
}

function version(dbName){
  return openOnly(dbName).then(function(db) {
    if (!db) { return null; }
    return db.version;
  });
}

function webkitGetDatabaseNames() {
  return _request(indexedDB, "webkitGetDatabaseNames");
}

var isGetDatabaseNamesSupported = (function() {
  return 'webkitGetDatabaseNames' in indexedDB;
})();

function getDatabaseNames() {
  if (isGetDatabaseNamesSupported) {
    return webkitGetDatabaseNames();
  }

  _warn(true, "EIDB.getDatabaseNames is currently only supported in Chrome" );
  return RSVP.resolve([]);
}

function openOnly(dbName, version, upgradeCallback, opts) {
  if (isGetDatabaseNamesSupported) {
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
  if (!dbName) { return RSVP.resolve(null); }

  return open(dbName).then(function(db) {
    return open(dbName, db.version + 1, function(res) {
      if (upgradeCallback && window.EIDB.ERROR_HANDLING) {
        try {
          upgradeCallback(res);
        } catch (e) {
          _rsvpErrorHandler(db, "bumpVersion", [dbName, upgradeCallback, opts])(e);
        }
      } else if (upgradeCallback) {
        upgradeCallback(res);
      }
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

function storeAction(dbName, storeName, callback, openOpts) {
  var db;
  return open(dbName, null, null, openOpts).then(function(_db) {
    db = _db;
    var store = db.objectStore(storeName, openOpts);

    if (openOpts && openOpts.keepOpen) {
      return callback(store, db);
    }

    return callback(store);
  }).then(null, _rsvpErrorHandler(db, "storeAction", [dbName, storeName, callback, openOpts]));
}

// TODO - refactor?
// note ObjectStore#insertWith_key will close the database
function _insertRecord(dbName, storeName, value, key, method) {
  return storeAction(dbName, storeName, function(store, db) {

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
  return storeAction(dbName, storeName, function(store) {
    return store.get(key);
  });
}

function deleteRecord(dbName, storeName, key) {
  return storeAction(dbName, storeName, function(store) {
    return store.delete(key);
  });
}

function getAll(dbName, storeName, range, direction) {
  return storeAction(dbName, storeName, function(store) {
    return store.getAll(range, direction);
  });
}

function getIndexes(dbName, storeName) {
  return storeAction(dbName, storeName, function(store) {
    return store.getIndexes();
  });
}

export { open, _delete, openOnly, bumpVersion };
export { version, webkitGetDatabaseNames, isGetDatabaseNamesSupported, getDatabaseNames };
export { createObjectStore, deleteObjectStore, createIndex };
export { addRecord, getRecord, putRecord, deleteRecord, getAll };
export { getIndexes, storeAction };
