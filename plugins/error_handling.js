// EIDB global

EIDB.ERROR_CATCHING = true;

var on = EIDB.on,
    trigger = EIDB.trigger,
    addHook = EIDB.addHook;

function handleError(e, args) {
  e.context = args.context;
  e.arguments = args.args;
  e.eidb_code = args.code;
  e._message = createErrorMessage(e);

  EIDB.error = e;
  trigger('error', e);

  if (EIDB.ERROR_LOGGING) { console.error(e); }
}

function createErrorMessage(e) {
  var message;

  if (e.message) { message = e.message; }

  if (e.target && e.target.error && e.target.error.message) {
    message = e.target.error.message;
  }

  return message;
}

function rsvpErrorHandler(e, idbObj, method, args) {
  var error = new Error();

  error._name = "EIDB request " + idbObj + " #" + method + " error";
  error._idbObj = idbObj;
  error._arguments = args;
  error._message = createErrorMessage(e);
  error.originalError = e;

  EIDB.error = e;
  trigger('error', e);

  if (EIDB.ERROR_LOGGING) { console.error(e); }
}

function clearError() {
  EIDB.error = null;
}

[
  'open.onsuccess.resolve.before',
  'open.onupgradeneeded.callback.before',
  '_request.onsuccess.resolve.before',
  '_openCursor.onsuccess.resolve.before'
].forEach(function(type) {
  addHook(type, clearError);
});

[
  'open.promise',
  'bumpVersion',
  'storeAction.promise',
  '_request.promise',
  '_openCursor.promise'
].forEach(function(type) {
  EIDB.on(type + ".error", function(evt) {
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
    on(type + ".success", clearError);
  }

  EIDB.on(type + ".error", function(evt) {
    var args = [evt.error].concat(evt.eidbInfo);
    handleError.apply(handleError, args);
  });
});
