/* global EIDB */

QUnit.config.testTimeout = 1000;
QUnit.config.requireExpects = true;

RSVP.configure('onerror', function(error) {
  console.log('RSVP onerror', error, error.message + '', error.stack);
});
