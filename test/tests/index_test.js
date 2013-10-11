module("Index", {
  setup: function() {
    EIDB.delete('foo');
  },
  teardown: function() {
    EIDB.delete('foo');
  }
});

asyncTest('API - properties', function() {
  expect(5);

  EIDB.open('foo', 1, function(db) {
    var store = db.createObjectStore("people", {keyPath: "id"});
    var index = store.createIndex('by_name', 'name', {unique: true, multiEntry: true });

    equal(index.name, 'by_name', "name property is correct");
    equal(index.objectStore, store, "objectStore property is correct");
    equal(index.keyPath, 'name', "keyPath property is correct");
    ok(index.multiEntry, "multiEntry property is correct");
    ok(index.unique, 'unique property is correct');

    start();
  });
});

asyncTest('API - requests', function() {
  expect(13);

  EIDB.open('foo', 1, function(db) {
    var store = db.createObjectStore("people", {keyPath: "id"});
    store.createIndex('by_name', 'name');
  }).then(function(db) {
    db.add('people', 1, {name: "Erik"});
    db.add('people', 2, {name: "Erik"});
    db.add('people', 3, {name: "Kris"});

    return EIDB.open('foo', 1);
  }).then(function(db) {
    var tx = db.transaction('people');
    var index = tx.objectStore('people').index('by_name');

    var res = [];
    index.openCursor('Erik', 'prev', function(cursor, resolve) {

      if (cursor && cursor.value.id === 1) {
        equal(cursor.key, 'Erik', "#openCursor range param is passed");
        equal(cursor.direction, 'prev', "#openCursor direction param is passed");
        ok('value' in cursor, "#openCursor provides a result value");
      }

      if (cursor) {res.push(cursor.value); cursor.continue();} else {resolve(res);}
    }).then(function(res) {
      var expected = [{id:2, name: "Erik"}, {id: 1, name: "Erik"}];
      deepEqual(res, expected, "#openCursor takes a function as a 3rd param that is used in the onsuccess callback");

      start();
    });

    var _res = [];
    index.openKeyCursor('Erik', 'prev', function(cursor, resolve) {

      if (cursor && cursor.primaryKey === 2) {
        equal(cursor.key, 'Erik', "#openKeyCursor range param is passed");
        equal(cursor.direction, 'prev', "#openKeyCursor direction param is passed");
        ok(!('value' in cursor), "#openKeyCursor doesn't provide a result value");
      }

      if (cursor) {_res.push(cursor.primaryKey); cursor.continue();} else {resolve(_res);}
    }).then(function(res) {
      deepEqual(res, [2,1], "#openKeyCursor takes a function as a 3rd param that is used in the onsuccess callback");
    });

    index.get('Erik').then(function(obj) {
      equal(obj.id, 1, "#get returns the first matched record");
    });

    index.getKey('Erik').then(function(obj){
      equal(obj, 1, "#getKey returns the first matched key");
    });

    index.count('Erik').then(function(count) {
      equal(count, 2, "#count returns the number of matched records");
    });

    index.count().then(function(count) {
      equal(count, 3, "#count returns the total number of records if no key given");
    })

    index.getAll('Erik').then(function(result) {
      var expected = [{id: 1, name: "Erik"}, {id:2, name: "Erik"}];
      deepEqual(result, expected, "#getAll collects the #openCursor results");
    });
  });
});

asyncTest('#hasKeyPath', function() {
  expect(6);

  EIDB.open('foo', null, function(db) {
    var store = db.createObjectStore('bar'),
        index = store.createIndex('by_name', 'name'),
        index2 = store.createIndex('by_name_color', ['name', 'color']);

    ok(index.hasKeyPath('name'), "#hasKeyPath returns true if the index has the keyPath (string)")
    equal(index2.hasKeyPath('name'), false, "#hasKeyPath returns false if non-array arg given for an index with an array keyPath");
    ok(index2.hasKeyPath(['name', 'color']), "#hasKeyPath returns true if the index has the keyPath (array)")
    ok(index2.hasKeyPath(['color', 'name']), "#hasKeyPath returns true if the index has the keyPath (array, position independent)")
    ok(!index2.hasKeyPath(['color']), "#hasKeyPath returns false if argument does not contain all of the keyPath elements");
    ok(!index2.hasKeyPath(['color', 'color']), "#hasKeyPath returns false if argument does not contain all of the keyPath elements");

    start();
  });
});
