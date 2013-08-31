asyncTest("EIDB.open", function() {
  expect(2);

  EIDB.open("foo", 2).then(function(db) {
    ok(db instanceof EIDB.Database, "Received an EIDB.Database object");

    start();
  });

  EIDB.open('foo').then(function(db) {
    equal(db.version, 2, "Received the most recent database when no version param given");
  });
});

asyncTest('EIDB API', function() {
  if ('webkitGetDatabaseNames' in indexedDB)
    expect(2);
  else
    expect(1);

  EIDB.open('foo', 1).then(function(db) {
    return EIDB.version('foo');
  }).then(function(version) {

    equal(version, 1, 'EIDB.version result is correct');

    start();
    if ('webkitGetDatabaseNames' in indexedDB) {
      EIDB.webkitGetDatabaseNames().then(function(names) {
        ok(names.contains('foo'), "EIDB.webkitGetDatabaseNames returns a list of database names (Chrome)");
      });
    }
  });
});

asyncTest('EIDB.bumpVersion', function() {
  expect(3);

  EIDB.bumpVersion('foo', function(db) {
    db.createObjectStore('bar');
  }).then(function(db) {
    equal(db.version, 2, 'EIDB.bumpVersion will start a new database at version 2');
    ok(db.objectStoreNames.contains('bar'), "EIDB.bumpVersion takes a upgrade callback");

    return EIDB.bumpVersion('foo');
  }).then(function(db) {
    equal(db.version, 3, 'EIDB.bumpVersion will increase an existing database version by 1');

    start();
  });
});

asyncTest('EIDB.createObjectStore', function() {
  expect(3);

  EIDB.createObjectStore('foo', 'dogs', {autoIncrement: true}).then(function(db) {
    var store = db.objectStore('dogs');

    equal(db.name, 'foo', "The correct database is used");
    ok(db.objectStoreNames.contains('dogs'), "The store is created");
    ok(store.autoIncrement, "Store options are passed");

    start();
  });
});

asyncTest('EIDB.deleteObjectStore', function() {
  expect(1);

  EIDB.createObjectStore('foo', 'dogs').then(function(db) {
    return EIDB.deleteObjectStore('foo', 'dogs');
  }).then(function(db) {
    ok(!db.objectStoreNames.contains('dogs'), "Deletes the store");

    start();
  });
});
