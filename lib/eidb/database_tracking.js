import { RSVP } from './promise';
import { _handleErrors } from './error_handling';

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

function _trackDb(target) {
  if (target.name === DB_NAME) { return; }

  var EIDB = window.EIDB;

  __addNameToDb(target, EIDB)()
    .then(null, __createStore(EIDB))
    .then(__addNameToDb(target, EIDB))
    .then(function() { EIDB.trigger('dbWasTracked'); });
}

_trackDb.remove = function(dbName) {
  if (dbName === DB_NAME) { return; }

  var EIDB = window.EIDB;

  EIDB.deleteRecord(DB_NAME, STORE_NAME, dbName);
  EIDB.trigger('dbWasUntracked');
};

export { _trackDb, DATABASE_TRACKING };
