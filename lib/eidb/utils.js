import Promise from './promise';
import { _rsvpErrorHandler } from './error_handling';
import { hook } from './hook';

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
      hook('_request.onsuccess.resolve', resolve, evt.target.result, method, args);
    };
    req.onerror = function(evt) {
      reject(evt);
    };
  }).then(null, _rsvpErrorHandler(idbObj, method, args));
}

function _openCursor(idbObj, range, direction, onsuccess, opts) {
  var EIDB = window.EIDB,
      method = opts && opts.keyOnly ? "openKeyCursor" : "openCursor";

  range = range || null;
  direction = direction || 'next';

  return new Promise(function(resolve, reject) {
    var req = idbObj[method](range, direction);

    req.onsuccess = function(event) {
      hook('_openCursor.onsuccess.resolve', onsuccess, event.target.result, resolve);
    };
    req.onerror = function(event) {
      reject(event);
    };
  }).then(null, _rsvpErrorHandler(idbObj, method, [range, direction, onsuccess, opts]));
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

function _domStringListToArray(list) {
  var arr = [];
  for (var i = 0; i < list.length; i++) { arr[i] = list[i]; }
  return arr;
}

function _hasKeyPath(storindex, path) {
  var keyPathContainsPath, hit, keyPathEl,
      keyPath = storindex.keyPath;

  if (!keyPath) { return false; }
  if (typeof keyPath === "string") { return keyPath === path; }
  if (!(path instanceof Array)) { return false; }

  if (!(keyPath instanceof Array)) {  // Chrome returns a DOMStringList, Firefox returns an array
    keyPath = _domStringListToArray(keyPath);
  }

  keyPathContainsPath = path.every(function(el) {
    return keyPath.some(function(_el) {
      return el === _el;
    });
  });

  if (!keyPathContainsPath) { return false; }

  function comp(el) {
    return el === keyPathEl;
  }

  for (var i=0; i < keyPath.length; i++) {
    keyPathEl = keyPath[i];
    hit = path.some(comp);
    if (!hit) { return false; }
  }

  return true;
}

export { __instrument__, _warn, _request, _openCursor, _getAll, _domStringListToArray, _hasKeyPath };
