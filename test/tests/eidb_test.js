module("EIDB", {
  setup: function() {
    EIDB.delete('foo');
  },
  teardown: function() {
    EIDB.delete('foo');
  }
});

asyncTest(".open", function() {
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

asyncTest(".version", function() {
  expect(1);

  EIDB.open('foo').then(function() {
    return EIDB.version('foo');
  }).then(function(version) {
    equal(version, 1, ".version returns the version");

    start();
  });
});

if (EIDB.isGetDatabaseNamesSupported) {
  asyncTest('.webkitGetDatabaseNames', function() {
    expect(1);

    EIDB.open('foo').then(function(db) {
      EIDB.webkitGetDatabaseNames().then(function(names) {
        ok(names.contains('foo'), ".webkitGetDatabaseNames returns a list of database names (Chrome)");

        start();
      });
    });
  });

  asyncTest('.getDatabaseNames', function() {
    expect(1);

    EIDB.open('foo').then(function(db) {
      EIDB.getDatabaseNames().then(function(names) {
        ok(names.contains('foo'), ".getDatabaseNames returns a list of database names (Chrome)");

        start();
      });
    });
  });

  asyncTest('.openOnly (.getDatabaseNames is supported)', function() {
    expect(5);

    EIDB.openOnly('foo').then(function(res) {

      ok(res === null, ".openOnly returns null if the database does not exist");

      return EIDB.open('foo', 1).then(function() {
        return EIDB.openOnly('foo');
      });
    }).then(function(db) {

      equal(db.name, 'foo', ".openOnly returns the database with the correct name");
      equal(db.version, 1, ".openOnly returns the databse with the correct version");

      return EIDB.openOnly('foo', 2);
    }).then(function(res) {

      ok(res === null, ".openOnly returns null if requesting a version higher than the current");

      return EIDB.openOnly('foo', 1);
    }).then(function(res) {

      equal(res.version, 1, ".openOnly attempts to return the requested database version when it is lower than the current");

      start();
    });
  });

  asyncTest(".version", function() {
    expect(1);

    EIDB.version('foo').then(function(version) {
      ok(version === null, ".version doesn't create a database if .getDatabaseNames supported");

      start();
    });
  });
}

if (!('webkitGetDatabaseNames' in indexedDB)) {
  asyncTest('.getDatabaseNames', function() {
    expect(1);

    EIDB.open('foo').then(function(db) {
      EIDB.getDatabaseNames().then(function(names) {
        deepEqual(names, [], ".getDatabaseNames returns an empty array in unsupported browsers");

        start();
      });
    });
  });

  asyncTest('.openOnly (.getDatabaseNames is not supported)', function() {
    expect(1);

    EIDB.openOnly('foo', 6).then(function(db) {

      equal(db.version, 6, ".openOnly acts like .open");
      start();
    });
  });
}

asyncTest('.bumpVersion', function() {
  expect(4);

  EIDB.bumpVersion().then(function(db) {
    equal(db, null, ".bumpVersion will not create a database if no dbName argument given");
  });

  EIDB.bumpVersion('foo', function(db) {
    db.createObjectStore('bar');
  }).then(function(db) {
    equal(db.version, 2, '.bumpVersion will start a new database at version 2');
    ok(db.hasObjectStore('bar'), "EIDB.bumpVersion takes a upgrade callback");

    return EIDB.bumpVersion('foo');
  }).then(function(db) {
    equal(db.version, 3, '.bumpVersion will increase an existing database version by 1');

    start();
  });
});

asyncTest('.createObjectStore', function() {
  expect(4);

  EIDB.createObjectStore('foo', 'dogs', {keyPath: 'id'}).then(function(db) {
    var store = db.objectStore('dogs');

    equal(db.name, 'foo', "The correct database is used");
    ok(db.hasObjectStore('dogs'), "The store is created");
    equal(store.keyPath, 'id', "Store options are passed");

    return EIDB.createObjectStore('foo', 'cats');
  }).then(function(db) {
    var store = db.objectStore('cats');

    ok(store.autoIncrement, "If no options are passed, autoIncrement is true");
    start();
  });
});

asyncTest('.deleteObjectStore', function() {
  expect(1);

  EIDB.createObjectStore('foo', 'dogs').then(function(db) {
    return EIDB.deleteObjectStore('foo', 'dogs');
  }).then(function(db) {
    ok(!db.hasObjectStore('dogs'), "Deletes the store");

    start();
  });
});

asyncTest('.createIndex', function() {
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

asyncTest("CRUD records - in-line keys", function() {
  expect(6);

  var records;

  EIDB.createObjectStore("foo", "people", {keyPath: "id"}).then(function() {
    return EIDB.addRecord("foo", "people", {id: 1, name: "Erik"});
  }).then(function(key) {

    equal(key, 1, ".addRecord returns the record's key");

    return EIDB.getRecord('foo', 'people', 1);
  }).then(function(obj) {

    equal(obj.name, 'Erik', ".getRecord retrieves the record");

    return EIDB.putRecord('foo', 'people', {id: 1, name: 'Juanita'});
  }).then(function(key) {

    deepEqual(key, 1, ".putRecord updates an existing record");

    return EIDB.deleteRecord('foo', 'people', 1);
  }).then(function(res) {

    equal(res, undefined, ".deleteRecord returns undefined");

    records = [{id: 2, name: 'Olaf'}, {id: 3, name: 'Klaus'}];
    return EIDB.addRecord('foo', 'people', records);
  }).then(function(keys) {

    deepEqual(keys, [2, 3], ".addRecord can take an array of records and returns the record keys");

    records = [{id: 2, name: 'Hakim'}, {id: 3, name: 'Gizmo'}];
    return EIDB.putRecord('foo', 'people', records);
  }).then(function(objs) {

    deepEqual(objs, [2, 3], ".putRecord can take an array of records and returns the record keys");

    start();
  });
});

asyncTest("CRUD records - out-of-line keys", function() {
  expect(5);

  EIDB.createObjectStore('foo', 'pets').then(function(db) {
    return EIDB.addRecord('foo', 'pets', {name: 'Frank'}, 4).then(function() {
      return EIDB.addRecord('foo', 'pets', {name: 'Fido'});
    });
  }).then(function(key) {
    return EIDB.getRecord('foo', 'pets', key);
  }).then(function(obj) {

    deepEqual(obj, {_key: 5, name: 'Fido'}, ".addRecord adds a _key property for out-of-line key stores when a key was not given");

    return EIDB.getRecord('foo', 'pets', 4);
  }).then(function(obj) {

    deepEqual(obj, {_key: 4, name: 'Frank'}, ".addRecord adds a _key property for out-of-line key stores when a key was given");

    return EIDB.addRecord('foo', 'pets', [{a: 1}, {a: 2}]).then(function() {
      return EIDB.getRecord('foo', 'pets', 6);
    });
  }).then(function(obj) {

    deepEqual(obj, {_key: 6, a: 1}, ".addRecord adds _keys for an array of records for out-of-line key stores");

    return EIDB.putRecord('foo', 'pets', [{a: 11}, {a: 22}], [33, 44]).then(function() {
      return EIDB.getRecord('foo', 'pets', 44);
    });
  }).then(function(obj) {

    deepEqual(obj, {_key: 44, a: 22}, ".putRecord can add an array of records for an out-of-line key store for a given array of keys");

    return EIDB.putRecord('foo', 'pets', [{a: 'dog'}, {a: 'cat'}], [33, 44]).then(function() {
      return EIDB.getRecord('foo', 'pets', 44);
    });
  }).then(function(obj) {

    deepEqual(obj, {_key: 44, a: 'cat'}, ".putRecord can update an array of records for an out-of-line key store if given an array of keys");

    start();
  });
});

asyncTest('.getAll', function() {
  expect(2);

  var records = [{name: "Ronny"}, {name: "Bobby"}, {name: "Ricky"}, {name: "Mike"}];

  EIDB.createObjectStore('foo', 'new_edition').then(function(db) {
    return EIDB.addRecord('foo', 'new_edition', records);
  }).then(function() {
    return EIDB.getAll('foo', 'new_edition');
  }).then(function(res) {

    deepEqual(res, records, "#getAll gets the stores records");

    return EIDB.getAll('foo', 'new_edition', null, 'prev');
  }).then(function(res) {

    deepEqual(res, records.reverse(), "#getAll accepts a direction argument");
    start();
  });
});

asyncTest('.getIndexes', function() {
  expect(2);

  EIDB.createObjectStore('foo', 'kids').then(function() {
    return EIDB.createIndex('foo', 'kids', 'by_name', 'name');
  }).then(function() {
    return EIDB.createIndex('foo', 'kids', 'by_name_color', ['name', 'color']);
  }).then(function() {
    return EIDB.getIndexes('foo', 'kids');
  }).then(function(res) {
    equal(res.length, 2, ".getIndexes returns an array of indexes of the correct length");
    ok(res[0] instanceof EIDB.Index, ".getIndexes returns an array of indexes");

    start();
  });
});
