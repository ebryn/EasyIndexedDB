
asyncTest("adding, getting, putting, and removing a record", function() {
  expect(6);

  EIDB.open("foo", 1, function(db) {
    db.createObjectStore("people", { keyPath: "id" });
  }).then(function(db) {
    var tx = db.transaction(["people"], "readwrite"),
        store = tx.objectStore("people");

    var req = store.add({id: 1, name: "Erik"});

    req.then(function(event) {
      ok(event, "Event was passed in when resolved");

      store.get(1).then(function(obj) {

        equal(obj.id, 1);
        equal(obj.name, "Erik");

        obj.name = "Kris";
        store.put(obj).then(function(obj) {
          equal(obj.id, 1);
          equal(obj.name, "Kris");

          start();
        });
      });

      store.delete(1).then(function(event) {
        ok(event, "Event was passed in when resolved");
      });
    });
  });
});

asyncTest('ObjectStore - indexes', function() {
  expect(7);

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

    store.createIndex('by_name', 'name', {unique: true});
  }).then(function(db) {

    EIDB.open('foo', 2).then(function(db) {
      var store = db.transaction('people').objectStore('people');
      ok(store.indexNames.contains('by_name'), "new store object finds an existing index");

      start();
    });
  });
});

asyncTest('ObjectStore - properties', function() {
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
