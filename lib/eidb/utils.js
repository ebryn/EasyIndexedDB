import Promise from './promise';
import { _rsvpErrorHandler } from './error_handling';

function __instrument__(methodCallback) {
  if (__instrument__.setup) {
    return __instrument__.setup(methodCallback);
  }
  return methodCallback();
}

function _warn(condition, statement) {
  if (condition) { console.warn(statement); }
}

function _request(idbObj, method, args) {
  var EIDB = window.EIDB,
      _args = args ? Array.prototype.slice.call(args) : null;

  return new Promise(function(resolve, reject) {
    var req = idbObj[method].apply(idbObj, _args);

    req.onsuccess = function(evt) {
      EIDB.error = null;
      resolve(evt.target.result);
    };
    req.onerror = function(evt) {
      reject(evt);
    };
  }).then(null, function(e) {
    _rsvpErrorHandler(e, idbObj, method, args);
  });
}

function _openCursor(idbObj, range, direction, onsuccess, opts) {
  var EIDB = window.EIDB,
      method = opts && opts.keyOnly ? "openKeyCursor" : "openCursor";

  range = range || null;
  direction = direction || 'next';

  return new Promise(function(resolve, reject) {
    var req = idbObj[method](range, direction);

    req.onsuccess = function(event) {
      EIDB.error = null;
      onsuccess(event.target.result, resolve);
    };
    req.onerror = function(event) {
      reject(event);
    };
  }).then(null, function(e) {
    _rsvpErrorHandler(e, idbObj, method, [range, direction, onsuccess, opts]);
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

export { __instrument__, _warn, _request, _openCursor, _getAll };
