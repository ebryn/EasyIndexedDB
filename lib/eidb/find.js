import { _storeAction } from './eidb';

function _mergeObj(obj1, obj2) {
  var attr, obj3 = {};
  for (attr in obj1) { obj3[attr] = obj1[attr]; }
  for (attr in obj2) { obj3[attr] = obj2[attr]; }
  return obj3;
}

function _normalizeArgs(args) {
  if (args.length === 1) { return args[0]; }

  var obj = {};
  obj[args[0]] = args[1];
  return obj;
}

// used for a range that isn't supposed to include the lower or
// upper bound. (Multiple attribute ranges will include the lower
// or upper bound.
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
    return Range.lowerBound(val, true);
  },

  gte: function(val) {
    return Range.lowerBound(val);
  },

  lt: function(val) {
    return Range.upperBound(val, true);
  },

  lte: function(val) {
    return Range.upperBound(val);
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
  store: null,
  storindex: null,
  range: null,

  _addRanges: function(type, _args) {
    var ranges = {},
        args = _normalizeArgs(_args);

    for (var key in args) {
      ranges[key] = _rangeMap[type](args[key]);
    }

    this.ranges = _mergeObj(this.ranges, ranges);
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

  setStorindex: function() {
    var storindex,
        store = this.store,
        keys = Object.keys(this.ranges),
        path = keys.length === 1 ? keys[0] : keys;

    store.getIndexes().forEach(function(index) {
      if (index.hasKeyPath(path)) {
        storindex = index;
      }
    }, this);

    if (!storindex) {
      storindex = store;
    }  // TODO - else create a new index if ranges present

    return this.storindex = storindex;
  },

  setRange: function() {
    if (Object.keys(this.ranges).length < 1) { return null; }

    var attr, lower, upper, range, filter,
        ranges = this.ranges,
        keyPath = this.storindex.keyPath,
        bounds = {lower: [], upper: []};

    if (Object.keys(ranges).length === 1) {
      return this.range = ranges[keyPath];
    }

    for (var i=0; i < keyPath.length; i++) {
      attr = keyPath[i];
      range = ranges[attr];
      lower = range.lower;
      upper = range.upper;

      // TODO - support Dates
      if (upper === undefined) {
        if (range.lowerOpen) {
          filter = _createBoundFilter(attr, range.lower);
          this.filters.push(filter);
        }

        if (typeof lower === 'string') { upper = String.fromCharCode(65535); }
        else if (typeof lower === 'number') { upper = Infinity; }
      }

      if (lower === undefined) {
        if (range.upperOpen) {
          filter = _createBoundFilter(attr, range.upper);
          this.filters.push(filter);
        }

        if (typeof upper === 'string') { lower = String.fromCharCode(0); }
        else if (typeof upper === 'number') { lower = -Infinity; }
      }

      bounds['lower'].push(lower);
      bounds['upper'].push(upper);
    }

    return this.range = Range.bound(bounds.lower, bounds.upper);
  },

  match: function(key, regex) {
    var filter = function(value) {
      return value[key].match(regex);
    };

    this.filters.push(filter);
    return this;
  },

  run: function() {
    var hit,
        self = this,
        filters = this.filters,
        results = [];

    return _storeAction(this.dbName, this.storeName, function(store) {
      self.store = store;
      self.setStorindex();
      self.setRange();

      return self.storindex.openCursor(self.range, null, function(cursor, resolve) {
        if (cursor) {
          var value = cursor.value;

          if (filters.length > 0) {
            hit = filters.every(function(filter) { return filter(value); });
            if (hit) { results.push(value); }
          }
          else { results.push(value); }

          cursor.continue();
        }
        else { resolve(results); }
      });
    });
  }
};

Query.prototype.equal = Query.prototype.eq;

function find(dbName, storeName, params) {
  var query = new Query(dbName, storeName);
  if (params) { return query.equal(params).run(); }
  return query;
}

export find;
