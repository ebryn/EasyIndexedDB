import { RSVP } from './promise';

var __args,
    __slice = Array.prototype.slice,
    ERROR_CATCHING = false;

function hook(eventName, fn) {
  var ret;
  __args = __slice.call(arguments, 2);

  __trigger(eventName + '.before');
  ret = fn.apply(fn, __args);
  __trigger(eventName + '.after');

  return ret;
}

RSVP.EventTarget.mixin(hook);

function __trigger(eventName) {
  hook.trigger(eventName, { methodArgs: __args });
}

hook.addHook = function(eventName, fn) {
  hook.on(eventName, function(evt) {
    fn.apply(fn, evt.methodArgs);
  });
};

// used for indexedDB callbacks
hook.triggerHandler = function(eventName) {
  return function(evt) {
    hook.trigger(eventName, evt);
  };
};

hook.rsvpErrorHandler = function(eventName) {
  var args = __slice.call(arguments, 1);

  return function(e) {
    var errorCatching = window.EIDB.ERROR_CATCHING;

    hook.trigger(eventName, { error: e, eidbInfo: args });
    if (!errorCatching) { throw e; }
  };
};

hook.try = function(eventName, context, args, code) {
  var ret,
      _args = __slice.call(arguments, 1),
      errorCatching = window.EIDB.ERROR_CATCHING;

  try {
    ret = code(context);
    hook.trigger(eventName + ".success", ret);
    return ret;

  } catch (e) {
    hook.trigger(eventName + ".error", { error: e, eidbInfo: _args });
    if (errorCatching) { return false; }
    else { throw e; }
  }
};

/******************************************/
// the following is to support plugins that use dbs/stores
hook.addFactory = function addFactory(opts, setup, onsuccess, onerror) {
  var dbName = opts.dbName,
      storeName = opts.storeName,
      storeOpts = opts.storeOpts;

  onerror = onerror || function(){};

  return function() {
    var args = arguments,
        obj = setup(args);

    if (!obj) { return; }
    __addRecord(dbName, storeName, obj)()
      .then(null, __createStore(dbName, storeName, storeOpts, obj))
      .then(onsuccess(args))
      .then(null, onerror); // if db is deleted unexpectedly
    };
};

hook.deleteFactory = function deleteFactory(opts, setup, onsuccess, onerror) {
  var dbName = opts.dbName,
      storeName = opts.storeName;

  return function() {
    var args = Array.prototype.slice.call(arguments)[1],
        key = setup(args);

    if (!key) { return; }

    __deleteRecord(dbName, storeName, key)
        .then(onsuccess(args))
        .then(null, onerror(key));
    };
};

function __suppressErrorHandling(code) { //if using error_handling plugin
  var ret,
      oldErrorHandling = window.EIDB.ERROR_HANDLING;

  window.EIDB.ERROR_HANDLING = false;
  try {
    ret = code();
    window.EIDB.ERROR_HANDLING = oldErrorHandling;
    return ret;
  }
  catch (e) {
    window.EIDB.ERROR_HANDLING = oldErrorHandling;
    throw 'error getting plugin object store';
  }
}

function __addRecord(dbName, storeName, obj) {
  return function() {
    return window.EIDB.open(dbName).then(function(db) {

      var store = __suppressErrorHandling(function() {
        return db.objectStore(storeName);
      });

      return store.put(obj);
    });
  };
}

function __createStore(dbName, storeName, opts, obj) {
  return function() {
    return window.EIDB.createObjectStore(dbName, storeName, opts)
      .then(__addRecord(dbName, storeName, obj));
  };

}

function __deleteRecord(dbName, storeName, key) {
  return window.EIDB.open(dbName).then(function(db) {
    var store = __suppressErrorHandling(function() {
      return db.objectStore(storeName);
    });

    return store.delete(key);
  });
}

export { hook, ERROR_CATCHING };
