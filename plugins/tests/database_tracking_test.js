module("database tracking", {
  setup: function() {
    window.tdbName = '__eidb__';
    window.tstoreName = 'databases';
    EIDB.delete(tdbName);
  },

  teardown: function() {
    EIDB.delete(tdbName);
    delete window.tdbName;
    delete window.tstoreName;
  }
});

asyncTest('Adding - No initial tracking database', function() {
  expect(2);

  EIDB.on('databaseTracking.tracked', function zzz(evt) {
    EIDB.off('databaseTracking.tracked', zzz);

    EIDB.open(tdbName).then(function(db) {
      ok(db.hasObjectStore(tstoreName), 'EIDB will internally track created databases and store');

      return db.objectStore(tstoreName).get('foo');
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

  EIDB.on('databaseTracking.tracked', function zzz() {
    EIDB.off('databaseTracking.tracked', zzz);

    EIDB.open(tdbName).then(function(db) {
      return EIDB.getRecord(tdbName, tstoreName, 'foo');
    }).then(function(res) {

      equal(res.name, 'foo', "The db's name is tracked.");

      EIDB.on('error', errorHandler);  // test_helper
      return EIDB.getRecord('foo', 'kids', 1);
    }).then(function() {

      ok(!errorHandler.error, 'No error is encountered when opening a db that is already being tracked.');

      start();
      EIDB.off('error', errorHandler);
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
  expect(2);

  EIDB.on('databaseTracking.untracked.error', function zzz(ev) {
    if (ev.detail === 'baz') {
      EIDB.off('databaseTracking.untracked.error', zzz);

      ok(true, 'Error is caught and databaseTracking.untracked.error event is triggered if tracking is db deleted and then another existing db is then deleted');

      start();
    }
  });

  EIDB.on('databaseTracking.tracked', function zzz(ev) {
    if (ev.detail === 'bar') {
      EIDB.off('databaseTracking.tracked');

      EIDB.on('databaseTracking.untracked', function zzz() {
        EIDB.off('databaseTracking.untracked', zzz);

        EIDB.getRecord(tdbName, tstoreName, 'bar').then(function(record) {

          ok(!record, "The deleted db was untracked");

          EIDB.open('baz').then(function() {
            return EIDB.delete(tdbName);
          }).then(function() {
            return EIDB.delete('baz');
          });
        });
      });

      EIDB.delete('bar');
    }
  });

  EIDB.open('bar');
});

asyncTest('Removing tracking db', function() {
  expect(1);

  EIDB.on('databaseTracking.untracked.error', function zzz() {
    EIDB.off('databaseTracking.untracked.error', zzz);

    ok(true, 'Error is caught and databaseTracking.untracked.error event should trigger if tracking is db deleted and then another existing db is then deleted');

    start();
  });

  setTimeout(function() {
    EIDB.open('baz').then(function() {
      return EIDB.delete(tdbName);
    }).then(function() {
      return EIDB.delete('baz');
    });
  }, 20);
});
