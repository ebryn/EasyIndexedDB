import Promise from './promise';

function _request(idbObj, method, args) {
  var _args = args ? Array.prototype.slice.call(args) : null;

  return new Promise(function(resolve, reject) {
    var req = idbObj[method].apply(idbObj, _args);

    req.onsuccess = function(evt) {
      resolve(evt.target.result);
    };
    req.onerror = function(evt) {
      reject(evt);
    };
  });
}

 function _openCursor(idbObj, range, direction, onsuccess) {
    range = range || null;
    direction = direction || 'next';

    return new Promise(function(resolve, reject) {
      var req = idbObj.openCursor(range, direction);

      req.onsuccess = function(event) {
        onsuccess(event.target.result, resolve);
      };
      req.onerror = function(event) {
        reject(event);
      };
    });
  }

export { _request, _openCursor };
