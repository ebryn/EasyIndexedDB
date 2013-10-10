// globals: RSVP, EIDB

var addHook = EIDB.addHook,
    DB_NAME = '__eidb__',
    STORE_NAME = 'databases';

function addNameToDb(target) {
  return function() {
    return EIDB.open(DB_NAME).then(function(db) {
      var store = db.objectStore(STORE_NAME);
      return store.put({ name: target.name });
    });
  };
}

function createStore() {
  return function() {
    return EIDB.createObjectStore(DB_NAME, STORE_NAME, {keyPath: 'name'});
  };
}

function trackDb(target) {
  var EIDB = window.EIDB;

  if (target.name === DB_NAME) { return; }

  addNameToDb(target)()
    .then(null, createStore())
    .then(addNameToDb(target))
    .then(null, function(){}) // if tracking db is deleted unexpectedly
    .then(function() { EIDB.trigger('dbWasTracked', target.name); });
}

function removeDB(evtResult, method, args) {
  var EIDB = window.EIDB,
      dbName = args && args[0];

  if (dbName === DB_NAME || method !== 'deleteDatabase') { return; }

  EIDB.open(DB_NAME).then(function(db) {
    var store = db.objectStore(STORE_NAME);
    return store.delete(dbName);

  }).then(function() {
    EIDB.trigger('dbWasUntracked');

  }).then(null, function(e) {
    EIDB.trigger('trackingDbDeletedError', dbName);
  });
}

addHook('open.onsuccess.resolve.before', trackDb);
addHook('_request.onsuccess.resolve.before', removeDB);
