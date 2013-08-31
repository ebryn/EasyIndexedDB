asyncTest("Database API", function() {
  expect(7);

  EIDB.open("foo", 1, function(db) {
    ok(db instanceof EIDB.Database, "Received an EIDB.Database object");

    var store = db.createObjectStore("gremlins", { keyPath: "id" });
    ok(store instanceof EIDB.ObjectStore, "Received an EIDB.ObjectStore object");

  }).then(function(db) {
    db.close();
  });

  EIDB.open('foo', 2, function(db) {
    db.createObjectStore("people", { keyPath: "id" });
  }).then(function(db) {

    equal(db.name, 'foo', "EIDB.Database has name property");
    equal(db.version, 2, "EIDB.Database has version property");
    ok(db.objectStoreNames.contains('people'), "EIDB.Database has objectStoreNames property");

    db.close();
  });

  EIDB.open('foo', 2).then(function(db) {
    var store = db.objectStore('people');
    ok(store instanceof EIDB.ObjectStore, "EIDB.Database can get an object store");

    db.close();
  });

  EIDB.open('foo', 3, function(db) {
    db.deleteObjectStore('people');
  }).then(function(db) {

    ok(!db.objectStoreNames.contains('people'), "EIDB.Database can delete an object store");

    start();
    db.close();
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
