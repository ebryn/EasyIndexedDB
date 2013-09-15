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

var Range = window.IDBKeyRange;

var _rangeMap = {
  equal: function(val) {
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

  equal: function() {
    this._addRanges('equal', arguments);
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

    var attr,
        ranges = this.ranges,
        keyPath = this.storindex.keyPath,
        bounds = {lower: [], upper: []};

    if (Object.keys(ranges).length === 1) {
      return this.range = ranges[keyPath];
    }

    for (var i=0; i < keyPath.length; i++) {
      attr = keyPath[i];
      bounds['lower'].push(ranges[attr].lower);
      bounds['upper'].push(ranges[attr].upper);
    }

    return this.range = Range.bound(bounds.upper, bounds.lower);
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

function find(dbName, storeName, params) {
  var query = new Query(dbName, storeName);
  if (params) { return query.equal(params).run(); }
  return query;
}

export find;
