/* global EIDB */

QUnit.config.testTimeout = 1000;

RSVP.configure('onerror', function(error) {
  console.log('RSVP onerror', error, error.message + '');
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

asyncTest("adding, getting, and removing a record", function() {
  expect(4);

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