asyncTest("EIDB.open and .version", function() {
  expect(3);

  EIDB.open("foo", 2).then(function(db) {
    ok(db instanceof EIDB.Database, "Received an EIDB.Database object");
  });

  EIDB.open('foo', null, null, {keepOpen: true}).then(function(db) {
    db.close();

    ok(db, ".open keepOpen option requires the db to be manually closed");
  });

  EIDB.open('foo').then(function(db) {
    equal(db.version, 2, "Received the most recent database when no version param given");

    start();
  });
});

if ('webkitGetDatabaseNames' in indexedDB) {
  asyncTest('EIDB.webkitGetDatabaseNames', function() {
    expect(1);

    EIDB.open('foo', 1).then(function(db) {
      EIDB.webkitGetDatabaseNames().then(function(names) {
        ok(names.contains('foo'), "EIDB.webkitGetDatabaseNames returns a list of database names (Chrome)");

        start();
      });
    });
  });
}

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

asyncTest('EIDB.createIndex', function() {
  expect(5);

  EIDB.createObjectStore('foo', 'people').then(function(db) {
    return EIDB.createIndex('foo', 'people', 'by_name', 'name', {unique: true, multiEntry: true });
  }).then(function(db) {
    var store = db.objectStore('people'),
        index = store.index('by_name');

    equal(index.name, 'by_name', "name property is correct");
    equal(index.objectStore, store, "objectStore property is correct");
    equal(index.keyPath, 'name', "keyPath property is correct");
    ok(index.multiEntry, "multiEntry property is correct");
    ok(index.unique, 'unique property is correct');

    start();
  });
});

asyncTest("EIDB CRUD records", function() {
  expect(6);

  var records;

  EIDB.createObjectStore("foo", "people", {keyPath: "id"}).then(function() {
    return EIDB.addRecord("foo", "people", {id: 1, name: "Erik"});
  }).then(function(key) {

    equal(key, 1, "#addRecord returns the record's key");

    return EIDB.getRecord('foo', 'people', 1);
  }).then(function(obj) {

    equal(obj.name, 'Erik', "#getRecord retrieves the record");

    return EIDB.putRecord('foo', 'people', {id: 1, name: 'Juanita'});
  }).then(function(obj) {

    deepEqual(obj, {id: 1, name: 'Juanita'}, "#putRecord updates an existing record");

    return EIDB.deleteRecord('foo', 'people', 1);
  }).then(function(res) {

    equal(res, undefined, "#deleteRecord returns undefined");

    records = [{id: 2, name: 'Olaf'}, {id: 3, name: 'Klaus'}];
    return EIDB.addRecord('foo', 'people', records);
  }).then(function(keys) {

    deepEqual(keys, [2, 3], "#addRecord can take an array of records and returns the record keys");

    records = [{id: 2, name: 'Hakim'}, {id: 3, name: 'Gizmo'}];
    return EIDB.putRecord('foo', 'people', records);
  }).then(function(objs) {

    deepEqual(objs, records, "#putRecord can take an array of records and returns the objects");

    start();
  });
});
