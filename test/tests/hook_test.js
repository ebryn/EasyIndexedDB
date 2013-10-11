module("EIDB.hook", {
  setup: function() {
    EIDB.delete('foo');
  },
  teardown: function() {
    EIDB.delete('foo');
  }
});

asyncTest('rsvpErrorHandler', function() {
  expect(2);

  EIDB.on('open.promise.error', function(evt) {
    ok(evt.error instanceof Error, "open.promise.error is triggered");
  });

  EIDB.open('foo', -1).then(null, function(e) {

    ok(e instanceof Error, "RSVP error is passed on");
    start();
  });
});

asyncTest('try', function() {
  expect(1);

  EIDB.createObjectStore('foo', 'bar').then(function(db) {
    var store = db.objectStore('bar');

    try { store.index('nope'); }
    catch (e) {

      ok(e instanceof Error, "IndexedDB error is passed on");
      start();
    }
  });
});
