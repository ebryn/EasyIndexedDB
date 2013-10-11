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
    hook.trigger(eventName, { error: e, eidbInfo: args });
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

export { hook, ERROR_CATCHING };
