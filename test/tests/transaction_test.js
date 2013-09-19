module("Transaction", {
  teardown: function() {
    EIDB.delete('foo');
  }
});

asyncTest("native IDB transaction is not seen", function() {
  expect(2);

  EIDB.open("foo", 1, function(db) {
    db.createObjectStore("people", { keyPath: "id" });
  }).then(function(db) {
    var tx = db.transaction(["people"]);
    ok(tx instanceof EIDB.Transaction, "Received an EIDB.Transaction object");

    var store = tx.objectStore("people");
    ok(store instanceof EIDB.ObjectStore, "Received an EIDB.ObjectStore object");

    start();
  });
});
