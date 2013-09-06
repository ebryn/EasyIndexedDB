/* global EIDB */

QUnit.config.testTimeout = 1000;

RSVP.configure('onerror', function(error) {
  console.log('RSVP onerror', error, error.message + '', error.stack);
});

module("EIDB", {
  teardown: function() {
    EIDB.delete('foo');
    EIDB.delete('foo2');
  }
});
