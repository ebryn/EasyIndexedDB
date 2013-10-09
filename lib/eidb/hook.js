import { RSVP } from './promise';

var __args,
    __slice = Array.prototype.slice;

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
  hook.trigger(eventName, { args: __args });
}

hook.addHook = function(eventName, fn) {
  hook.on(eventName, function(evt) {
    fn.apply(fn, evt.args);
  });
};

hook.triggerHandler = function(eventName) {
  return function(evt) {
    hook.trigger(eventName, evt);
  };
};

export { hook };
