import { RSVP } from './promise';

var __args,
    __slice = Array.prototype.slice;

function __trigger(eventName) {
  hook.trigger(eventName, { args: __args });
}

function hook(eventName, fn) {
  var ret;
  __args = __slice.call(arguments, 2);

  __trigger(eventName + '.before');
  ret = fn.apply(fn, __args);
  __trigger(eventName + '.after');

  return ret;
}

RSVP.EventTarget.mixin(hook);

hook.addHook = function(eventName, fn) {
  this.on(eventName, function(evt) {
    fn.apply(fn, evt.args);
  });
};

export { hook };
