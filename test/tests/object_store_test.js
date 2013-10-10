module("ObjectStore", {
  setup: function() {
    EIDB.delete('foo');
    EIDB.delete('foo2');
  },
  teardown: function() {
    EIDB.delete('foo');
    EIDB.delete('foo2');
  }
});

asyncTest('properties', function() {
  expect(3);

  EIDB.createObjectStore('foo', 'people', {keyPath: 'id'}).then(function(db) {
    var store = db.objectStore('people');

    equal(store.name, 'people', "name is correct");
    equal(store.keyPath, 'id', "keyPath is correct");

    return EIDB.createObjectStore('foo', 'dogs', {autoIncrement: true});
  }).then(function(db) {
    var store = db.objectStore('dogs');
    ok(store.autoIncrement, "autoIncrement is correct");

    start();
  });
});

asyncTest("CRUD records", function() {
  expect(7);

  EIDB.createObjectStore('foo', "people", { keyPath: "id" }).then(function(db) {
    var store = db.objectStore("people");

    store.add({id: 1, name: "Erik"}).then(function(key) {
      equal(key, 1, "#add returns the key of the record");

      store.get(1).then(function(obj) {

        equal(obj.id, 1);
        equal(obj.name, "Erik");

        obj.name = "Kris";
        store.put(obj).then(function(key) {
          equal(key, 1);
        });
      });

      store.delete(1).then(function(res) {
        equal(res, undefined, "#delete returns undefined");
      });
    });

    return EIDB.createObjectStore('foo', 'dogs', {autoIncrement: true});
  }).then(function(db) {
    var store = db.objectStore('dogs');

    store.add({name: 'Fido'}, 6).then(function(key) {
      equal(key, 6, "#add can accept out-of-line keys");

      start();
    });

    store.add({name: 'Spot'}).then(function(key) {
      equal(key, 7, "#add auto increments records with no specified key");
    });
  });
});

asyncTest('indexes', function() {
  expect(8);

  EIDB.open('foo', 1, function(db) {
    var _index, index, indexNames,
        store = db.createObjectStore("people", { keyPath: "myId" });

    _index = store.createIndex('by_name', 'name', {unique: true});

    index = store.index('by_name');
    indexNames = store.indexNames;

    ok(_index instanceof EIDB.Index, "#createIndex returns an EIDB.Index");
    ok(index instanceof EIDB.Index, "#index returns an EIDB.Index");
    ok(index.unique, '#createIndex passes along params');
    ok(indexNames instanceof DOMStringList, "#indexNames returns a DOMStringList");
    ok(indexNames.contains('by_name'), '#indexNames contains the names of the indexes');

    store.deleteIndex('by_name');
    ok(!store.indexNames.contains('by_name'), '#deleteIndex removes the index');

    try { store.index('nope'); }
    catch (e) {

      ok(true, '#index throws error for non-existent index');
    }

    store.createIndex('by_name', 'name', {unique: true});
  }).then(function(db) {

    EIDB.open('foo', 2).then(function(db) {
      var store = db.transaction('people').objectStore('people');
      ok(store.indexNames.contains('by_name'), "new store object finds an existing index");

      start();
    });
  });
});

asyncTest('#openCursor, #getAll, #count,  #clear', function() {
  expect(7);

  EIDB.createObjectStore('foo', 'people', {keyPath: 'id'}).then(function(db) {
    db.add('people', 1, {name: "Erik"});
    db.add('people', 2, {name: "Erik"});
    db.add('people', 3, {name: "Kris"});

    return EIDB.open('foo');
  }).then(function(db) {
    var store = db.objectStore('people'),
        res = [];
    store.openCursor(1, 'prev', function(cursor, resolve) {
      if (cursor && cursor.value.id === 1) {

        equal(cursor.key, 1, "#openCursor range param is passed");
        equal(cursor.direction, 'prev', "#openCursor direction param is passed");
        ok('value' in cursor, "#openCursor provides a result value");
      }

      if (cursor) {res.push(cursor.value); cursor.continue();} else {resolve(res);}
    }).then(function(res) {
      var expected = [{id:1, name: "Erik"}];

      deepEqual(res, expected, "#openCursor takes a function as a 3rd param that is used in the onsuccess callback");

      return store.getAll(null, 'prev');
    }).then(function(res) {
      var expected = [{id: 3, name: "Kris"}, {id: 2, name: "Erik"}, {id: 1, name: "Erik"}];

      deepEqual(res, expected, "#getAll collects the #openCursor results");

      return store.count();
    }).then(function(count) {

      equal(count, 3, "#count gets the number of records in the store");

      store.clear().then(function() {
        return store.count();
      }).then(function(count) {

        equal(count, 0, "#clear removes all records from the store");

        db.close();
        start();
      });
    });
  });
});

asyncTest("#insertWith_key", function() {
  expect(2);

  // TransactionInactiveError...
  // Simulate this error which occurs when using EIDB in Ember.
  // Otherwise, the error won't occur in the testing environment.
  EIDB.__instrument__.setup = function(method) {
    return new RSVP.Promise(function(resolve, reject) {
      setTimeout(function() {
        resolve(method());
      }, 1);
    });
  };

  EIDB.open('foo', null, function(db) {
    db.createObjectStore('bar', {autoIncrement: true});
  }, {keepOpen: true}).then(function(db) {
    var store = db.objectStore('bar');

    return store.insertWith_key('add', {name: 'baz'}, null, db).then(function(key) {
      return EIDB.getRecord('foo', 'bar', key);
    });
  }).then(function(obj) {

    equal(obj._key, 1, "#insertWith_key will #add an out-of-line key store object and then #put a _key property which is the interal key");

    return EIDB.open('foo', null, null, {keepOpen: true});
  }).then(function(_db) {
    var store = _db.objectStore('bar');
    return store.insertWith_key('add', {name: 'quz'}, 6, _db).then(function(_key) {
      return EIDB.getRecord('foo', 'bar', _key);
    });
  }).then(function(obj) {

    equal(obj._key, 6, "#insertWith_key accepts a key argument to generate the _key property");

    start();
  });
});
