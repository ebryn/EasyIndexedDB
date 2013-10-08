import { RSVP } from './promise';
import { _handleErrors } from './error_handling';
import { hook } from './hook';

var DATABASE_TRACKING = false,
    DB_NAME = '__eidb__',
    STORE_NAME = 'databases',
    opts = { stopErrors: true };

function __addNameToDb(target, eidb) {
  return function() {
    return eidb.open(DB_NAME).then(function(db) {

      var store = _handleErrors('db tracking', arguments, function() {
        return db.objectStore(STORE_NAME, opts);
      }, opts);

      return store.put({ name: target.name });
    });
  };
}

function __createStore(eidb) {
  return function() {
    return eidb.createObjectStore(DB_NAME, STORE_NAME, {keyPath: 'name'});
  };
}

function __trackDb(target) {
  var EIDB = window.EIDB;

  if (target.name === DB_NAME || !EIDB.DATABASE_TRACKING) { return; }

  __addNameToDb(target, EIDB)()
    .then(null, __createStore(EIDB))
    .then(__addNameToDb(target, EIDB))
    .then(null, function(){}) // if tracking db is deleted unexpectedly
    .then(function() { EIDB.trigger('dbWasTracked', target.name); });
}

function __removeDB(evtResult, method, args) {
  var EIDB = window.EIDB,
      oldErrorHandling = EIDB.ERROR_HANDLING,
      dbName = args && args[0];

  if (dbName === DB_NAME || method !== 'deleteDatabase' || !EIDB.DATABASE_TRACKING) { return; }

  EIDB.open(DB_NAME).then(function(db) {

    EIDB.ERROR_HANDLING = false;
    var store = db.objectStore(STORE_NAME);

    EIDB.ERROR_HANDLING = oldErrorHandling;
    return store.delete(dbName);

  }).then(function() {
    EIDB.trigger('dbWasUntracked');

  }).then(null, function(e) {
    EIDB.ERROR_HANDLING = oldErrorHandling;
    EIDB.trigger('trackingDbDeletedError', dbName);
  });
}

hook.addBeforeHook('EIDB.open.onsuccess', __trackDb);
hook.addBeforeHook('EIDB._request.onsuccess', __removeDB);

export { DATABASE_TRACKING };
