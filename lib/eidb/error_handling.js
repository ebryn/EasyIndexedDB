import { RSVP } from './promise';
import { hook } from './hook';

var ERROR_HANDLING = false;
var ERROR_LOGGING = true;
var error = null;

function _handleErrors(context, args, code, opts) {
  var EIDB = window.EIDB,
      logErrors = EIDB.ERROR_LOGGING;

  if (!opts || !opts.propogateError) { EIDB.error = null; }

  try {
    return code(context);
  } catch (e) {
    e.context = context;
    e.arguments = args;
    e.eidb_code = code;
    e._message = __createErrorMessage(e);

    EIDB.error = e;

    if (!EIDB.ERROR_HANDLING) { throw e; }
    if (logErrors && !(opts && opts.stopErrors)) { console.error(e); }
    if (opts && !opts.stopErrors) { EIDB.trigger('error', e); }

    return false;
  }
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

function _rsvpErrorHandler(idbObj, method, args) {
  var EIDB = window.EIDB,
      logErrors = EIDB.ERROR_LOGGING;

  return function(e) {
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
  };
}

function _clearError() {
  window.EIDB.error = null;
}

[
  'open.onsuccess.before',
  'open.onupgradeneeded.before',
  '_request.onsuccess.before',
  '_openCursor.onsuccess.before'
].forEach(function(type) {
  hook.addHook(type, _clearError);
});

export { ERROR_HANDLING, ERROR_LOGGING, error, _handleErrors, _rsvpErrorHandler };
