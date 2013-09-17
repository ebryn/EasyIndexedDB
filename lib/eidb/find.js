import { _storeAction, _warn } from './eidb';

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

var Range = window.IDBKeyRange;

var _rangeMap = {
  eq: function(val) {
    return Range.only(val);
  },

  gt: function(val) {
    var upper = _maxBoundMap.upper[typeof val];
    return Range.bound(val, upper, true);
  },

  gte: function(val) {
    var upper = _maxBoundMap.upper[typeof val];
    return Range.bound(val, upper);
  },

  lt: function(val) {
    var lower = _maxBoundMap.lower[typeof val];
    return Range.bound(lower, val, false, true);
  },

  lte: function(val) {
    var lower = _maxBoundMap.lower[typeof val];
    return Range.bound(lower, val);
  }
};

var _maxBoundMap = {
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
  range: null,
  getOne: false,
  cursorDirection: 'next',

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

  setStorindex: function(store, callback) {
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

  setRange: function() {
    if (!this._isRangeNeeded()) { return null; }

    var attr, range,
        ranges = this.ranges,
        keyPath = this.storindex.keyPath,
        bounds = {lower: [], upper: []};

    if (Object.keys(ranges).length === 1) {
      return this.range = ranges[keyPath];
    }

    for (var i=0; i < keyPath.length; i++) {
      attr = keyPath[i];
      range = ranges[attr];

      this._addBoundFilter(attr, range);

      bounds['lower'].push(range.lower);
      bounds['upper'].push(range.upper);
    }

    return this.range = Range.bound(bounds.lower, bounds.upper);
  },

  // Since #setRange always includes the upper and lower bounds
  // with Range.bound, we need to filter out if the user specified
  // the exclude the bounds.
  _addBoundFilter: function(attr, range) {
    var filter, lowerUnbound, upperUnbound,
        upper = range.upper,
        lower = range.lower;

    function _createBoundFilter(attr, target) {
      return function(value) {
        if (value[attr] === target) { return false; }
        return true;
      };
    }

    // TODO - support Dates
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

    return _storeAction(this.dbName, this.storeName, function(store) {
      return self.setStorindex(store, function() {
        self.setRange();
        return self._runCursor();
      });
    });
  },

  _runCursor: function() {
    var hit,
        dir = this.cursorDirection,
        getOne = this.getOne,
        range = this.range,
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
    this.cursorDirection = 'prev';
    this.getOne = true;
    return this.run();
  }
};

Query.prototype.equal = Query.prototype.eq;

function find(dbName, storeName, params) {
  var query = new Query(dbName, storeName);
  if (params) { return query.equal(params).run(); }
  return query;
}

export find;
