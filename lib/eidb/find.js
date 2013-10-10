import { storeAction, _warn } from './eidb';
import { hook } from './hook';

function _createRange(lower, upper) {
  return Range.bound(lower.lower, upper.upper, lower.lowerOpen, upper.upperOpen);
}

function _mergeRanges(obj1, obj2) {
  var attr, range1, range2,
      upper = {},
      lower = {},
      obj3 = {};

  for (attr in obj1) { obj3[attr] = obj1[attr]; }
  for (attr in obj2) {
    range1 = obj1[attr];
    range2 = obj2[attr];

    if (range1 && range2) {
      lower = range1.lower > range2.lower ? range1 : range2;
      upper = range1.upper < range2.upper ? range1 : range2;

      try {
        obj3[attr] = _createRange(lower, upper);
      } catch (e) {
        obj3[attr] = undefined;
      }
    } else {
      obj3[attr] = obj2[attr];
    }
  }
  return obj3;
}

function _normalizeArgs(args) {
  if (args.length === 1) { return args[0]; }

  var obj = {};
  obj[args[0]] = args[1];
  return obj;
}

function _createBoundFilter(attr, target) {
  return function(value) {
    if (value[attr] === target) { return false; }
    return true;
  };
}

var Range = window.IDBKeyRange;

var _rangeMap = {
  eq: function(val) {
    return Range.only(val);
  },

  gt: function(val) {
    var upper = _boundsMap.upper[typeof val];
    return Range.bound(val, upper, true);
  },

  gte: function(val) {
    var upper = _boundsMap.upper[typeof val];
    return Range.bound(val, upper);
  },

  lt: function(val) {
    var lower = _boundsMap.lower[typeof val];
    return Range.bound(lower, val, false, true);
  },

  lte: function(val) {
    var lower = _boundsMap.lower[typeof val];
    return Range.bound(lower, val);
  }
};

// TODO - support Dates
var _boundsMap = {
  lower: {
    string: String.fromCharCode(0),
    number:  -Infinity
  },

  upper: {
    string: String.fromCharCode(65535),
    number: Infinity
  }
};

var Query = function(dbName, storeName) {
  this.dbName = dbName;
  this.storeName = storeName;
  this.filters = [];
  this.ranges = {};
  this.rangeFilters = [];
};

Query.prototype = {
  storindex: null,
  _range: null,
  getOne: false,
  cursorDirection: 'next',

  _addRanges: function(type, _args) {
    var ranges = {},
        args = _normalizeArgs(_args);

    for (var key in args) {
      ranges[key] = _rangeMap[type](args[key]);
    }

    this.ranges = _mergeRanges(this.ranges, ranges);
  },

  eq: function() {
    this._addRanges('eq', arguments);
    return this;
  },

  gt: function() {
    this._addRanges('gt', arguments);
    return this;
  },

  gte: function() {
    this._addRanges('gte', arguments);
    return this;
  },

  lt: function() {
    this._addRanges('lt', arguments);
    return this;
  },

  lte: function() {
    this._addRanges('lte', arguments);
    return this;
  },

  range: function() {
    var args = _normalizeArgs(arguments),
        attr = Object.keys(args)[0];

    this.gte(attr, args[attr][0]);
    this.lte(attr, args[attr][1]);
    return this;
  },

  filter: function(fn) {
    this.filters.push(fn);
    return this;
  },

  match: function(key, regex) {
    return this.filter(function(value) {
      return regex.test(value[key]);
    });
  },

  _isRangeNeeded: function() {
    return Object.keys(this.ranges).length > 0;
  },

  _setStorindex: function(store, callback) {
    var storindex, idxName,
        self = this,
        keys = Object.keys(this.ranges),
        path = keys.length === 1 ? keys[0] : keys;

    store.getIndexes().forEach(function(index) {
      if (index.hasKeyPath(path)) {
        storindex = index;
      }
    }, this);

    if (!storindex) {
      if (this._isRangeNeeded() && !store.hasKeyPath(path)) {
        keys.sort();
        idxName = keys.join("_");
        path = keys.length === 1 ? keys[0] : keys;

        return window.EIDB.createIndex(this.dbName, store.name, idxName, path).then(function(db) {
          self.storindex = db.objectStore(store.name).index(idxName);
          return callback();
        });
      } else {
        storindex = store;
      }
    }

    this.storindex = storindex;
    return callback();
  },

  _setRange: function() {
    if (!this._isRangeNeeded()) { return null; }

    var attr, range,
        ranges = this.ranges,
        keyPath = this.storindex.keyPath,
        bounds = {lower: [], upper: []};

    if (Object.keys(ranges).length === 1) {
      return this._range = ranges[keyPath];
    }

    for (var i=0; i < keyPath.length; i++) {
      attr = keyPath[i];
      range = ranges[attr];

      this._addBoundFilter(attr, range);

      bounds['lower'].push(range.lower);
      bounds['upper'].push(range.upper);
    }

    return this._range = Range.bound(bounds.lower, bounds.upper);
  },

  // Since #_setRange always includes the upper and lower bounds
  // with Range.bound, we need to filter out if the user specified
  // to exclude the bounds.
  _addBoundFilter: function(attr, range) {
    var filter, lowerUnbound, upperUnbound,
        upper = range.upper,
        lower = range.lower;

    if (range.lowerOpen) {
      filter = _createBoundFilter(attr, range.lower);
      this.filters.push(filter);
    }

    if (range.upperOpen) {
      filter = _createBoundFilter(attr, range.upper);
      this.filters.push(filter);
    }
  },

  run: function(dir) {
    var self = this;

    if (dir) { this.cursorDirection = dir; }

    return storeAction(this.dbName, this.storeName, function(store) {
      return self._setStorindex(store, function() {
        self._setRange();
        if (self._range === undefined) { return []; }
        return self._runCursor();
      });
    });
  },

  _runCursor: function() {
    var hit,
        dir = this.cursorDirection,
        getOne = this.getOne,
        range = this._range,
        filters = this.filters,
        results = [];

    return this.storindex.openCursor(range, dir, function(cursor, resolve) {
      if (cursor) {
        var value = cursor.value;

        if (filters.length > 0) {
          hit = filters.every(function(filter) { return filter(value); });
          if (hit) { results.push(value); }
        }
        else { results.push(value); }

        if (getOne && results.length > 0) { resolve(results[0]); }
        else { cursor.continue(); }
      }
      else { resolve(results); }
    });
  },

  first: function() {
    this.getOne = true;
    return this.run();
  },

  last: function() {
    this.getOne = true;
    return this.run('prev');
  }
};

Query.prototype.equal = Query.prototype.eq;

function find(dbName, storeName, params) {
  var query = new Query(dbName, storeName);
  if (params) { return query.equal(params).run(); }
  return query;
}

export find;
