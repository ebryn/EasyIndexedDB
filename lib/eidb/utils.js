import Promise from './promise';

function _warn(condition, statement) {
  if (condition) { console.warn(statement); }
}

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

 function _openCursor(idbObj, range, direction, onsuccess, opts) {
    var method = opts && opts.keyOnly ? "openKeyCursor" : "openCursor";

    range = range || null;
    direction = direction || 'next';

    return new Promise(function(resolve, reject) {
      var req = idbObj[method](range, direction);

      req.onsuccess = function(event) {
        onsuccess(event.target.result, resolve);
      };
      req.onerror = function(event) {
        reject(event);
      };
    });
  }

  function _getAll(idbObj, range, direction) {
    var res = [];

    return _openCursor(idbObj, range, direction, function(cursor, resolve) {
      if (cursor) {
        res.push(cursor.value);
        cursor.continue();
      } else {
        resolve(res);
      }
    });
  }

export { _warn, _request, _openCursor, _getAll };
