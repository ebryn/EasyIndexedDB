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

function registerErrorHandler(handler) {
  var handlers = registerErrorHandler.handlers;
  handlers.push(handler);
  return true;
}

registerErrorHandler.handlers = [];

registerErrorHandler.notify = function(e) {
  var handlers = registerErrorHandler.handlers;
  handlers.forEach(function(handler) {
    handler(e);
  });
};

registerErrorHandler.clearHandlers = function() {
  registerErrorHandler.handlers = [];
};

function _clearError() {
  window.EIDB.error = null;
}

[
  'EIDB.open.onsuccess',
  'EIDB.open.onupgradeneeded',
  'EIDB._request.onsuccess',
  'EIDB._openCursor.onsuccess'
].forEach(function(type) {
  hook.addBeforeHook(type, _clearError);
});

export { ERROR_HANDLING, ERROR_LOGGING, error, registerErrorHandler, _handleErrors, _rsvpErrorHandler };
