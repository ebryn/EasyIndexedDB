
module("database tracking", {
  setup: function() {
    EIDB.DATABASE_TRACKING = true
    window.tdbName = '__eidb__';
    window.tstoreName = 'databases';
  },

  teardown: function() {
    EIDB.DATABASE_TRACKING = false;
    EIDB.delete(tdbName);
    delete window.tdbName;
    delete window.tstoreName;
  }
});

asyncTest('Adding - No initial tracking database', function() {
  expect(2);

  EIDB.on('dbWasTracked', function zzz() {
    EIDB.off('dbWasTracked', zzz);

    EIDB.open(tdbName).then(function(db) {
      ok(db.hasObjectStore(tstoreName), 'EIDB will internally track created databases and store');
      var store = db.objectStore(tstoreName);

      return store.get('foo');
    }).then(function(res) {

      equal(res.name, 'foo', "The db's name is tracked");

      start();
      EIDB.delete('foo');
    });
  });

  EIDB.open('foo');
});

asyncTest('Adding - Initial tracking database exists', function() {
  expect(2);

  EIDB.on('dbWasTracked', function zzz() {
    EIDB.off('dbWasTracked', zzz);

    EIDB.open(tdbName).then(function(db) {
      return EIDB.getRecord(tdbName, tstoreName, 'foo');
    }).then(function(res) {

      equal(res.name, 'foo', "The db's name is tracked.");

      EIDB.registerErrorHandler(errorHandler);  // test_helper
      return EIDB.getRecord('foo', 'kids', 1);
    }).then(function() {

      ok(!errorHandler.error, 'No error is encountered when opening a db that is aleard being tracked.');

      start();
      EIDB.registerErrorHandler.clearHandlers();
      EIDB.delete('foo');
    });
  });

  EIDB.open(tdbName, null, function(db) {
    db.createObjectStore(tstoreName, {keyPath: 'name'});
  }).then(function() {
    EIDB.createObjectStore('foo', 'kids');
  });
});

asyncTest('Removing', function() {
  expect(1);

  EIDB.on('dbWasTracked', function zzz() {
    EIDB.off('dbWasTracked', zzz);

    EIDB.on('dbWasUntracked', function zzz() {
      EIDB.off('dbWasUntracked', zzz);

      EIDB.getRecord(tdbName, tstoreName, 'bar').then(function(record) {

        ok(!record, "The deleted db was untracked");

        start();
      });
    });

    EIDB.delete('bar');
  });

  EIDB.open('bar');
});

asyncTest('when turned off', function() {
  expect(1);

  EIDB.DATABASE_TRACKING = false;

  EIDB.open('foo').then(function() {
    setTimeout(function() {
      EIDB.open(tdbName).then(function(db) {
        ok(!db.hasObjectStore(tstoreName), "The db was not tracked");

        start();
        EIDB.delete('foo');
      });
    }, 30);
  });
});
