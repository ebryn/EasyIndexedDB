// EIDB global

(function(EIDB) {

EIDB.ERROR_CATCHING = true;
EIDB.ERROR_LOGGING = true;
EIDB.ERROR_HANDLING = true;

var on = EIDB.on,
    trigger = EIDB.trigger,
    addHook = EIDB.hook.addHook,
    slice = Array.prototype.slice;

function handleError(evt) {
  if (EIDB.ERROR_HANDLING) {
    var e = evt.error,
        eidbInfo = evt.eidbInfo;

    e.eidbEvent = evt.type;
    e.eidbContext = eidbInfo[0];
    e.eidbMethodArguments = eidbInfo[1];
    e.eidbCode = eidbInfo[2];

    EIDB.error = e;
    trigger('error', e);
    if (EIDB.ERROR_LOGGING) { console.error(e, e.stack); }
  };
}

function createErrorMessage(e) {
  var message;

  if (e.message) { message = e.message; }
  if (e.target && e.target.error && e.target.error.message) {
    message = e.target.error.message;
  }
  return message;
}

function rsvpErrorHandler(evt) {
  if (EIDB.ERROR_HANDLING) {
    var e = new Error(),
        eidbInfo = evt.eidbInfo;

    e.eidbEvent = evt.type;
    e.eidbContext = eidbInfo[0];
    e.eidbMethod = eidbInfo[1];
    e.eidbMethodArguments = eidbInfo[2];
    e._message = createErrorMessage(e);
    e.originalError = evt.error;
    e.stack = evt.error.stack;

    EIDB.error = e;
    trigger('error', e);
    if (EIDB.ERROR_LOGGING) { console.error(e, e.stack); }
  }
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
  on(type + ".error", rsvpErrorHandler);
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

  on(type + ".error", handleError);

  if (type !== 'database.close') {
    on(type + ".success", clearError);
  }
});

})(EIDB);
