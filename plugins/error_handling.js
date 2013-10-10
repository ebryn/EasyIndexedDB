import { RSVP } from './promise';
import { hook } from './hook';

var ERROR_HANDLING = false;
var ERROR_LOGGING = true;
var error = null;

function handleError(e, args) {
  var EIDB = window.EIDB,
      logErrors = EIDB.ERROR_LOGGING;

  e.context = args.context;
  e.arguments = args.args;
  e.eidb_code = args.code;
  e._message = __createErrorMessage(e);

  EIDB.error = e;
  EIDB.trigger('error', e);

  if (!EIDB.ERROR_HANDLING) { throw e; }
  if (logErrors) { console.error(e); }
}

function __createErrorMessage(e) {
  var EIDB = window.EIDB,
      message = null;

  if (e.message) { message = e.message; }

  if (e.target && e.target.error && e.target.error.message) {
    message = e.target.error.message;
  }

  return message;
}

function rsvpErrorHandler(e, idbObj, method, args) {
  var EIDB = window.EIDB,
      logErrors = EIDB.ERROR_LOGGING;

  var error = new Error();
  error._name = "EIDB request " + idbObj + " #" + method + " error";
  error._idbObj = idbObj;
  error._arguments = args;
  error._message = __createErrorMessage(e);
  error.originalError = e;

  if (!EIDB.ERROR_HANDLING) { throw e; }
  if (logErrors) { console.error(e); }

  EIDB.error = e;
  EIDB.trigger('error', e);

}

function _clearError() {
  window.EIDB.error = null;
}

[
  'open.onsuccess.resolve.before',
  'open.onupgradeneeded.callback.before',
  '_request.onsuccess.resolve.before',
  '_openCursor.onsuccess.resolve.before'
].forEach(function(type) {
  hook.addHook(type, _clearError);
});

[
  'open.promise',
  'bumpVersion',
  'storeAction.promise',
  '_request.promise',
  '_openCursor.promise'
].forEach(function(type) {
  hook.on(type + ".error", function(evt) {
    var args = [evt.error].concat(evt.eidbInfo);
    rsvpErrorHandler.apply(rsvpErrorHandler, args);
  });
});

[
  'database.close',
  'database.createObjectStore',
  'database.deleteObjectStore',
  'database.transaction',
  'objectStore.insertWith_key',
  'objectStore.index',
  'objectStore.createIndex',
  'objectStore.deleteIndex',
  'transaction.abort'
].forEach(function(type) {

  if (type !== 'database.close') {
    hook.on(type + ".success", function(evt) {
      _clearError();
    });
  }

  hook.on(type + ".error", function(evt) {
    var args = [evt.error].concat(evt.eidbInfo);
    handleError.apply(handleError, args);
  });
});

export { ERROR_HANDLING, ERROR_LOGGING, error };
