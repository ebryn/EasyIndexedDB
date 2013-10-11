// globals: EIDB

(function(EIDB) {

var addHook = EIDB.hook.addHook,
    addFactory = EIDB.hook.addFactory,
    deleteFactory = EIDB.hook.deleteFactory,
    DB_NAME = '__eidb__',
    STORE_NAME = '__eidb__databases__';

var addOpts = {
      dbName: DB_NAME,
      storeName: STORE_NAME,
      storeOpts: { keyPath: 'name' }
    },
    addDb = addFactory(addOpts, addSetup, addSuccess);

var removeOpts = {
      dbName: DB_NAME,
      storeName: STORE_NAME
    },
    removeDB = deleteFactory(removeOpts, removeSetup, removeSuccess, removeError);


function addSetup(args) {
  var db = args[0];

  if (db.name === DB_NAME) { return; }
  return { name: db.name };
}

function addSuccess(args) {
  var db = args[0];

  return function() {
    EIDB.trigger('databaseTracking.tracked', db.name);
  };
}

function removeSetup(args) {
  var EIDB = window.EIDB,
      method = args[1],
      dbName = args[2] && args[2][0];

  if (dbName === DB_NAME || method !== 'deleteDatabase') { return; }
  return dbName;
}

function removeSuccess(args) {
  return function() {
    EIDB.trigger('databaseTracking.untracked');
  };
}

function removeError(key) {
  return function(e) {
    EIDB.trigger('databaseTracking.untracked.error', key);
  };
}

addHook('open.onsuccess.resolve.before', addDb);
addHook('_request.onsuccess.resolve.before', removeDB);

})(EIDB);
