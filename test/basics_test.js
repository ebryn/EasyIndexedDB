/* global EIDB */

QUnit.config.testTimeout = 1000;

RSVP.configure('onerror', function(error) {
  console.log('RSVP onerror', error, error.message + '', error.stack);
});

// function uniqueDBName(prefix) {
//   return prefix + Date.now();
// }

function deleteDB(name, callback) {
  console.log("attempting to delete DB", name);

  var req = window.indexedDB.deleteDatabase(name);
  req.onsuccess = function (event) {
    console.log("deleted DB", name);
    if (callback) { callback(event); }
  };
  req.onerror = function (event) {
    console.log("failed to delete DB", name);
    if (callback) { callback(event); }
  };

  return req;
}

module("EIDB", {
  teardown: function() {
    stop();
    deleteDB("foo", function() {
      start();
    });
  }
});

test("namespace exists", function() {
  ok(EIDB, "EIDB namespace exists");
});

asyncTest("opening a database", function() {
  expect(2);

  EIDB.open("foo", 2).then(function(db) {
    ok(db instanceof EIDB.Database, "Received an EIDB.Database object");

    start();
    db.close();
  });

  EIDB.open('foo').then(function(db) {
    equal(db.version, 2, "Received the most recent database when no version param given");

    db.close();
  });
});

asyncTest("creating an object store", function() {
  expect(2);

  EIDB.open("foo", 1, function(db) {
    start();
    ok(db instanceof EIDB.Database, "Received an EIDB.Database object");

    var store = db.createObjectStore("people", { keyPath: "id" });
    ok(store instanceof EIDB.ObjectStore, "Received an EIDB.ObjectStore object");

    db.close();
  });
});

asyncTest("creating a transaction", function() {
  expect(2);

  EIDB.open("foo", 1, function(db) {
    start();
    var store = db.createObjectStore("people", { keyPath: "id" });
  }).then(function(db) {
    var tx = db.transaction(["people"]);
    ok(tx instanceof EIDB.Transaction, "Received an EIDB.Transaction object");

    var store = tx.objectStore("people");
    ok(store instanceof EIDB.ObjectStore, "Received an EIDB.ObjectStore object");

    db.close();
  });
});

asyncTest("adding, getting, putting, and removing a record", function() {
  expect(6);

  EIDB.open("foo", 1, function(db) {
    start();
    var store = db.createObjectStore("people", { keyPath: "id" });
  }).then(function(db) {
    var tx = db.transaction(["people"], "readwrite"),
        store = tx.objectStore("people");

    var req = store.add({id: 1, name: "Erik"});
    stop();
    req.then(function(event) {
      start();
      ok(event, "Event was passed in when resolved");

      stop();
      store.get(1).then(function(obj) {
        start();

        equal(obj.id, 1);
        equal(obj.name, "Erik");

        stop();
        obj.name = "Kris";
        store.put(obj).then(function(obj) {
          start();

          equal(obj.id, 1);
          equal(obj.name, "Kris");
        });
      });

      stop();
      store.delete(1).then(function(event) {
        start();
        ok(event, "Event was passed in when resolved");

        db.close();
      });
    });
  });
});

asyncTest("simpler APIs", function() {
  expect(8);

  EIDB.open("foo", 1, function(db) {
    start();
    var store = db.createObjectStore("people", { keyPath: "myId" });
  }).then(function(db) {
    stop();

    db.add("people", 1, {name: "Erik"}).then(function(obj) {
      start();
      equal(obj.myId, 1, "obj from add is correct");
      equal(obj.name, "Erik", "obj from add is correct");

      stop();
      return db.get("people", 1);
    }).then(function(obj) {
      start();

      equal(obj.myId, 1, "obj from get is correct");
      equal(obj.name, "Erik", "obj from get is correct");

      stop();
      obj.name = "Kris";
      return db.put("people", 1, obj);
    }).then(function(obj) {
      start();

      equal(obj.myId, 1, "obj from put is correct");
      equal(obj.name, "Kris", "obj from put is correct");

      stop();
      return db.put("people", 2, obj);
    }).then(function(obj) {
      start();

      equal(obj.myId, 2, "obj from put has correct key path");

      stop();
      return db.delete("people", 1);
    }).then(function(event) {
      start();
      ok(event, "Event was passed in when resolved");

      db.close();
    });
  });
});

asyncTest('ObjectStore API - indexes', function() {
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
    db.close();

    EIDB.open('foo', 2).then(function(db) {
      var store = db.transaction('people').objectStore('people');
      ok(store.indexNames.contains('by_name'), "new store object finds an existing index");

      db.close();
      start();
    });
  });
});

asyncTest('Index API - properties', function() {
  expect(5);

  EIDB.open('foo', 1, function(db) {
    var store = db.createObjectStore("people", {keyPath: "id"});
    var index = store.createIndex('by_name', 'name', {unique: true, multiEntry: true });

    equal(index.name, 'by_name', "name property is correct");
    equal(index.objectStore, index._idbIndex.objectStore, "objectStore property is correct");
    equal(index.keyPath, 'name', "keyPath property is correct");
    ok(index.multiEntry, "multiEntry property is correct");
    ok(index.unique, 'unique property is correct');

    start();
    db.close();
  });
});

asyncTest('Index API - requests', function() {
  expect(13);

  EIDB.open('foo', 1, function(db) {
    var store = db.createObjectStore("people", {keyPath: "id"});
    store.createIndex('by_name', 'name');
  }).then(function(db) {
    db.add('people', 1, {name: "Erik"});
    db.add('people', 2, {name: "Erik"});
    db.add('people', 3, {name: "Kris"});
    db.close();

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

    start();
    db.close();
  });
});

asyncTest("Database API - properties", function() {
  expect(3);

  EIDB.open('foo', 2, function(db) {
    db.createObjectStore("people", { keyPath: "id" });
  }).then(function(db) {

    equal(db.name, 'foo', "EIDB.Database has name property");
    equal(db.version, 2, "EIDB.Database has version property");
    ok(db.objectStoreNames.contains('people'), "EIDB.Database has objectStoreNames property");

    start();
    db.close();
  });
});
