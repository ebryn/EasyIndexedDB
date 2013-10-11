/* global EIDB */

QUnit.config.testTimeout = 1000;
QUnit.config.requireExpects = true;

RSVP.configure('onerror', function(error) {
  console.log('RSVP onerror', error, error.message + '', error.stack);
});

function errorHandler(e) {
  return errorHandler.error = e;
}

EIDB.LOGGING = {
  // all: true
  // events: true
  // requests: true
  // cursors: true
  // opens: true
}
