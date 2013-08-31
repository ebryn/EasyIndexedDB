/* global EIDB */

QUnit.config.testTimeout = 1000;

RSVP.configure('onerror', function(error) {
  console.log('RSVP onerror', error, error.message + '', error.stack);
});

function deleteDB(name, callback) {
  // console.log("attempting to delete DB", name);

  var req = window.indexedDB.deleteDatabase(name);
  req.onsuccess = function (event) {
    // console.log("deleted DB", name);
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
