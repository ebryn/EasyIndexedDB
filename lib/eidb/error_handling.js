import { RSVP } from './promise';

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
    var error = EIDB.error = {  // TODO - make an Error object
      name: e.name,
      context: context,
      arguments: args,
      code: code,
      error: e
    };

    error.message = __createErrorMessage(e);

    if (!EIDB.ERROR_HANDLING) { throw error; }
    if (logErrors && !(opts && opts.stopErrors)) { console.error(error); }
    if (opts && !opts.stopErrors) { EIDB.trigger('error', error); }

    return false;
  }
}

function __createErrorMessage(e) {
  var EIDB = window.EIDB,
      message = null;

     if (e.message) {
      message = e.message;
    }

    if (e.target && e.target.error && e.target.error.message) {
      message = e.target.error.message;
    }

  return message;
}

function _rsvpErrorHandler(idbObj, method, args) {
  var EIDB = window.EIDB,
      logErrors = EIDB.ERROR_LOGGING;

  return function(e) {
    var error = EIDB.error = {
      name: "EIDB request " + idbObj + " #" + method + " error",
      error: e,
      idbObj: idbObj,
      arguments: args
    };

    error.message = __createErrorMessage(e);

    if (logErrors) { console.error(error); }

    EIDB.error = error;
    EIDB.trigger('error', error);
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

export { ERROR_HANDLING, ERROR_LOGGING, error, registerErrorHandler, _handleErrors, _rsvpErrorHandler };
