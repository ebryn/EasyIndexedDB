var __args,
    __slice = Array.prototype.slice,
    __beforeHooks = {},
    __afterHooks = {};

function __applyHook(hook) {
  hook.apply(hook, __args);
}

function hook(eventName, fn) {
  __args = __slice.call(arguments, 2);
  var beforeEventHooks = __beforeHooks[eventName];
  var afterEventHooks = __afterHooks[eventName];
  var ret;

  if (beforeEventHooks) {
    beforeEventHooks.forEach(__applyHook);
  }

  ret = fn.apply(fn, __args);

  if (afterEventHooks) {
    afterEventHooks.forEach(__applyHook);
  }

  return ret;
}

hook.addBeforeHook = function(eventName, hook) {
  var hooks = __beforeHooks[eventName] = __beforeHooks[eventName] || [];
  hooks.push(hook);
};

hook.addAfterHook = function(eventName, hook) {
  var hooks = __afterHooks[eventName] = __afterHooks[eventName] || [];
  hooks.push(hook);
};

export { hook };
