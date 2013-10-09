module("Error Handing", {
  setup: function() {
    EIDB.delete('foo');
    EIDB.delete('foo2');
    EIDB.ERROR_HANDLING = true;
    EIDB.ERROR_LOGGING = false;
  },

  teardown: function() {
    EIDB.delete('foo');
    EIDB.delete('foo2');
    EIDB.ERROR_HANDLING = false;
    EIDB.ERROR_LOGGING = true;
  }
});

asyncTest('ObjectStore', function() {
  expect(5);

  EIDB.open('foo', 1, function(db) {
    var store = db.createObjectStore('bar');

    store.index('by_nom');
    ok(EIDB.error instanceof DOMException, "index error is caught");

    store.createIndex('by_name', 'name');
    ok(!EIDB.error, "EIDB.error is cleared after the next direct indexedDB request");

    store.createIndex('by_name', 'name');
    ok(EIDB.error instanceof DOMException, "createIndex error is caught");

    store.deleteIndex('by_nom');
    ok(EIDB.error instanceof DOMException, "deleteIndex error is caught");

    start();
  });

  stop();
  EIDB.open('foo2', null, function(db) {
    db.createObjectStore('bar', {autoIncrement: true});
  }, {keepOpen: true}).then(function(db) {

    var store = db.objectStore('bar');
    db.close();

    store.insertWith_key('add', {name: 'baz'}, null, db).then(function() {

      ok(EIDB.error instanceof DOMException, "insertWith_key error is caught");
      start();
    });
  });
});

asyncTest('Utils', function() {
  expect(4);

  EIDB.createObjectStore('foo', 'bar').then(function(db) {
    EIDB.error = 'foo';
    var store = db.objectStore('bar');

    store.add().then(function() {
      ok(EIDB.error instanceof Object, "_request error is caught");

      var _store = db.transaction('bar', 'readwrite').objectStore('bar');
      return _store.add({a:1}, 1);
    }).then(function() {

      ok(!EIDB.error, "EIDB.error is cleared after next _request");
      start();
    });
  });

  stop();
  EIDB.open('foo2', 1, function(db) {
    EIDB.error = 'foo';

    var store = db.createObjectStore('bar');

    store.openCursor(null, 'errrrr').then(function() {
      ok(EIDB.error instanceof Object, "_openCursor error is caught");

      return store.openCursor('eh', null, function(cursor, resolve) {
        resolve();
      });
    }).then(function() {

      ok(!EIDB.error, "EIDB.error is cleared after next _openCursor");
      start();
    });
  });
});

// Database#close not tested, but error handling implement
asyncTest('Database', function() {
  expect(3);

  EIDB.open('foo', 1, function(db) {
    db.createObjectStore("people");
    db.createObjectStore('people');
    ok(EIDB.error instanceof DOMException, "createObjectStore error is caught");

    db.deleteObjectStore('dogs');
    ok(EIDB.error instanceof DOMException, "deleteObjectStore error is caught");

    db.transaction('nope');
    ok(EIDB.error instanceof DOMException, "transaction error is caught");


    start();
  });
});

asyncTest('Transaction', function() {
  expect(1);
  var tx;

  EIDB.createObjectStore('foo', 'bar').then(function(db) {
    tx = db.transaction('bar', 'readwrite');
    tx.objectStore('bar').add({a:1});

    tx._idbTransaction.oncomplete = function() {
      tx.abort();

      ok(EIDB.error instanceof DOMException, "abort error is caught");
      start();
    }
  });
});

asyncTest('EIDB.open', function() {
  expect(3);

  EIDB.open('foo', 1).then(function() {
    return EIDB.open('foo', -1);
  }).then(function() {
    ok(EIDB.error instanceof Object, "open error is caught");

    return EIDB.open('foo', 2);
  }).then(function() {

    ok(!EIDB.error, "EIDB.error is cleared after the next .open request");

    EIDB.error = {};
    EIDB.open('foo', 3, function(db) {

      ok(!EIDB.error, "EIDB.error is cleared after the next onupgradeneeded .open request");
      start();
    });
  });
});

asyncTest('EIDB.openOnly', function() {
  expect(1);

  EIDB.open('foo').then(function() {
    return EIDB.openOnly('foo', -1);
  }).then(function() {

    ok(EIDB.error, "openOnly error is caught");

    start();
  });
});

asyncTest('EIDB.bumpVersion', function() {
  expect(1);

  EIDB.on('error', errorHandler);

  EIDB.bumpVersion('foo', function() {
    throw new TypeError;
  }).then(function() {

    ok(errorHandler.error, "bumpVersion error is caught");

    start();
    EIDB.off('error', errorHandler);
  });
});

asyncTest('EIDB.storeAction', function() {
  expect(1);

  EIDB.storeAction('foo', 'nope').then(function() {

    ok(EIDB.error, 'storeAction error is caught');

    start();
  });
});
