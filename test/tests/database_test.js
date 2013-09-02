asyncTest("Database API", function() {
  expect(7);

  EIDB.open("foo", 1, function(db) {
    ok(db instanceof EIDB.Database, "Received an EIDB.Database object");

    var store = db.createObjectStore("gremlins", { keyPath: "id" });
    ok(store instanceof EIDB.ObjectStore, "Received an EIDB.ObjectStore object");
  });

  EIDB.open('foo', 2, function(db) {
    db.createObjectStore("people", { keyPath: "id" });
  }).then(function(db) {

    equal(db.name, 'foo', "EIDB.Database has name property");
    equal(db.version, 2, "EIDB.Database has version property");
    ok(db.objectStoreNames.contains('people'), "EIDB.Database has objectStoreNames property");
  });

  EIDB.open('foo', 2).then(function(db) {
    var store = db.objectStore('people');
    ok(store instanceof EIDB.ObjectStore, "EIDB.Database can get an object store");
  });

  EIDB.open('foo', 3, function(db) {
    db.deleteObjectStore('people');
  }).then(function(db) {
    ok(!db.objectStoreNames.contains('people'), "EIDB.Database can delete an object store");

    start();
  });
});

asyncTest("Database - CRUD records", function() {
  expect(7);

  EIDB.open("foo", 1, function(db) {
    db.createObjectStore("people", { keyPath: "myId" });
  }, {keepOpen: true}).then(function(db) {
    db.add("people", 1, {name: "Erik"}).then(function(obj) {

      equal(obj.myId, 1, "obj from add is correct");
      equal(obj.name, "Erik", "obj from add is correct");

      return db.get("people", 1);
    }).then(function(obj) {

      equal(obj.myId, 1, "obj from get is correct");
      equal(obj.name, "Erik", "obj from get is correct");

      obj.name = "Kris";
      return db.put("people", 1, obj);
    }).then(function(key) {

      equal(key, 1, "#put returns the record's key");

      return db.put("people", 2, {name: "Kenny"});
    }).then(function(key) {

      equal(key, 2, "#put can add a new record");

      return db.delete("people", 1);
    }).then(function(res) {

      equal(res, undefined, "#delete returns undefined");

      db.close();
      start();
    });
  });
});
