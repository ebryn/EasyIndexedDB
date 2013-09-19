import { RSVP } from './promise';

var DATABASE_TRACKING = false,
    TRACKING_DB_NAME = '__eidb__',
    TRACKING_DB_STORE_NAME = 'databases';

function _trackDb(target, resolve) {
  var EIDB = window.EIDB;

  if (target.name === TRACKING_DB_NAME) { return; }

  EIDB.open(TRACKING_DB_NAME).then(function(db) {
    if (db.objectStoreNames.contains(TRACKING_DB_STORE_NAME)) {
      return db.add(TRACKING_DB_STORE_NAME, target.name, {}).then(function(res) {
        EIDB.trigger('dbWasTracked');
      });
    }

    EIDB.createObjectStore(TRACKING_DB_NAME, TRACKING_DB_STORE_NAME, {keyPath: 'name'}).then(function(db) {
      return db.add(TRACKING_DB_STORE_NAME, target.name, {});
    }).then(function() {
      EIDB.trigger('dbWasTracked');
    });
  });
}

_trackDb.remove = function(dbName) {
  if (dbName === TRACKING_DB_NAME) { return; }

  var EIDB = window.EIDB;

  EIDB.deleteRecord(TRACKING_DB_NAME, TRACKING_DB_STORE_NAME, dbName);
  EIDB.trigger('dbWasUntracked');
};

export { _trackDb, DATABASE_TRACKING };
