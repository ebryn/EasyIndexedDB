var LOG_ERRORS = true;
var error = null;

function _handleErrors(context, code, opts) {
  var EIDB = window.EIDB,
      logErrors = EIDB.LOG_ERRORS;

  if (!opts || !opts.propogateError) { EIDB.error = null; }

  try {
    return code(context);
  } catch (e) {
    var error = EIDB.error = {
      name: e.name,
      context: context,
      error: e
    };

    error.message = __createErrorMessage(e);

    if (logErrors) { console.error(error); }

    EIDB.trigger('error', error);
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

function _rsvpErrorHandler(e, idbObj, method, args) {
  var EIDB = window.EIDB,
      logErrors = EIDB.LOG_ERRORS;

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

export { LOG_ERRORS, error, registerErrorHandler, _handleErrors, _rsvpErrorHandler };
