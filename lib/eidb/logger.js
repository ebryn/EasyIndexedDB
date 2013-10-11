import hook from './hook';

var oldTrigger = hook.trigger,
    LOGGING = {
      // all: true
      // events: true
      // requests: true
      // cursors: true
      // opens: true
    };

function requesting(type) {
  var logging = window.EIDB.LOGGING;
  return logging && (logging[type] || logging['all']);
}

hook.trigger = function(name, obj) {
  var o = {
    eventName: name,
    payload: obj
  };

  oldTrigger.call(hook, 'event.trigger', o);
  oldTrigger.call(hook, name, obj);
};

hook.on('event.trigger', function(evt) {
  if (requesting('events')) {
    console.log({ name: evt.eventName, payload: evt.payload });
  }
});

hook.on('_request.onsuccess.resolve.before', function(obj) {
  if (requesting('requests')) {
    var o,
        args = obj.methodArgs[1],
        idbObj = args[0],
        method = args[1],
        duration = Date.now() - obj.methodArgs[2];

    o = {
      method: method,
      args: args[2] && args[2][0],
      duration: duration
    };

    if (idbObj.name) { o.storeName = idbObj.name; }

    console.log(o);
  }
});

hook.on('_openCursor.onsuccess.resolve.before', function(obj) {
  if (requesting('cursors')) {
    var args = obj.methodArgs,
        o = {
          cursor: args[0],
          duration: Date.now() - args[2]
        };

    console.log(o);
  }
});

hook.on('open.onsuccess.resolve.before', function(obj) {
  if (requesting('opens')) {
    var args = obj.methodArgs,
        o = {
          db: args[0],
          duration: Date.now() - args[1]
        };

    console.log(o);
  }
});

export LOGGING;
