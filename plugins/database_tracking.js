// globals: RSVP, EIDB

var addHook = EIDB.addHook,
    DB_NAME = EIDB.TRACKING_DB_NAME = '__eidb__',
    STORE_NAME = EIDB.TRACKING_STORE_NAME = 'databases',
    opts = { stopErrors: true };

EIDB.DATABASE_TRACKING = false;

function addNameToDb(target, eidb) {
  return function() {
    return eidb.open(DB_NAME).then(function(db) {
      var store = db.objectStore(STORE_NAME, opts);
      return store.put({ name: target.name });
    });
  };
}

function createStore(eidb) {
  return function() {
    return eidb.createObjectStore(DB_NAME, STORE_NAME, {keyPath: 'name'});
  };
}

function trackDb(target) {
  var EIDB = window.EIDB;

  if (target.name === DB_NAME || !EIDB.DATABASE_TRACKING) { return; }

  addNameToDb(target, EIDB)()
    .then(null, createStore(EIDB))
    .then(__addNameToDb(target, EIDB))
    .then(null, function(){}) // if tracking db is deleted unexpectedly
    .then(function() { EIDB.trigger('dbWasTracked', target.name); });
}

function removeDB(evtResult, method, args) {
  var EIDB = window.EIDB,
      dbName = args && args[0];

  if (dbName === DB_NAME || method !== 'deleteDatabase' || !EIDB.DATABASE_TRACKING) { return; }

  EIDB.open(DB_NAME).then(function(db) {
    var store = db.objectStore(STORE_NAME);
    return store.delete(dbName);

  }).then(function() {
    EIDB.trigger('dbWasUntracked');

  }).then(null, function(e) {
    EIDB.trigger('trackingDbDeletedError', dbName);
  });
}

addHook('open.onsuccess.before', trackDb);
addHook('_request.onsuccess.before', removeDB);
