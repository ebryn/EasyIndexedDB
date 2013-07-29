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
  expect(1);

  EIDB.open("foo").then(function(db) {
    start();
    ok(db instanceof EIDB.Database, "Received an EIDB.Database object");

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
  expect(7);

  EIDB.open("foo", 1, function(db) {
    start();
    var store = db.createObjectStore("people", { keyPath: "id" });
  }).then(function(db) {
    stop();

    db.add("people", 1, {name: "Erik"}).then(function(obj) {
      start();
      equal(obj.id, 1, "obj from add is correct");
      equal(obj.name, "Erik", "obj from add is correct");

      stop();
      return db.get("people", 1);
    }).then(function(obj) {
      start();

      equal(obj.id, 1, "obj from get is correct");
      equal(obj.name, "Erik", "obj from get is correct");

      stop();
      obj.name = "Kris";
      return db.put("people", 1, obj);
    }).then(function(obj) {
      start();

      equal(obj.id, 1, "obj from put is correct");
      equal(obj.name, "Kris", "obj from put is correct");

      stop();
      return db.delete("people", 1);
    }).then(function(event) {
      start();
      ok(event, "Event was passed in when resolved");

      db.close();
    });
  });

});