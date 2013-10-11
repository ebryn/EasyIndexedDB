// globals: RSVP, EIDB

(function(RSVP, EIDB) {

var addHook = EIDB.addHook,
    DB_NAME = '__eidb__',
    STORE_NAME = 'databases';

function suppressErrorHandling(code) {
  var ret,
      oldErrorHandling = EIDB.ERROR_HANDLING;

  EIDB.ERROR_HANDLING = false;
  try {
    ret = code();
    EIDB.ERROR_HANDLING = oldErrorHandling;
    return ret;
  }
  catch (e) {
    EIDB.ERROR_HANDLING = oldErrorHandling;
    throw 'error getting database tracking object store';
  }
}


function addNameToDb(target) {
  return function() {
    return EIDB.open(DB_NAME).then(function(db) {

      var store = suppressErrorHandling(function() {
        return db.objectStore(STORE_NAME);
      });

      return store.put({ name: target.name });
    });
  };
}

function createStore() {
  return function() {
    return EIDB.createObjectStore(DB_NAME, STORE_NAME, {keyPath: 'name'});
  };
}

function trackDb(db) {
  var EIDB = window.EIDB;

  if (db.name === DB_NAME) { return; }

  addNameToDb(db)()
    .then(null, createStore())
    .then(addNameToDb(db))
    .then(null, function(){}) // if tracking db is deleted unexpectedly
    .then(function() { EIDB.trigger('databaseTracking.tracked', db.name); });
}

function removeDB(evtResult, args) {
  var EIDB = window.EIDB,
      method = args[1],
      dbName = args[2] && args[2][0];

  if (dbName === DB_NAME || method !== 'deleteDatabase') { return; }

  EIDB.open(DB_NAME).then(function(db) {
    var store = suppressErrorHandling(function() {
      return db.objectStore(STORE_NAME);
    });

    return store.delete(dbName);
  }).then(function() {
    EIDB.trigger('databaseTracking.untracked');

  }).then(null, function(e) {
    EIDB.trigger('databaseTracking.untracked.error', dbName);
  });
}

addHook('open.onsuccess.resolve.before', trackDb);
addHook('_request.onsuccess.resolve.before', removeDB);

})(RSVP, EIDB);
