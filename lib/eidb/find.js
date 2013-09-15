import { _storeAction } from './eidb';

function mergeObj(obj1, obj2) {
  var attr, obj3 = {};
  for (attr in obj1) { obj3[attr] = obj1[attr]; }
  for (attr in obj2) { obj3[attr] = obj2[attr]; }
  return obj3;
}

var Range = window.IDBKeyRange;

var Query = function(dbName, storeName) {
  this.dbName = dbName;
  this.storeName = storeName;
  this.queries = [];
  this.filters = [];
  this.params = {};
};

Query.prototype = {
  store: null,
  storindex: null,
  range: null,

  equal: function() {
    if (arguments.length === 1) {
      this.params = mergeObj(this.params, arguments[0]);
    } else {
      this.params[arguments[0]] = arguments[1];
    }

    this.queries.push(['_equal']);
    return this;
  },

  _equal: function() {
    var keys, path,
        storindex, keyPath,
        store = this.store,
        range = [],
        indexes = this.store.getIndexes(),
        params = this.params;

    keys = Object.keys(params),
    path = keys.length === 1 ? keys[0] : keys;

    // set store/index
    indexes.forEach(function(_index) {
      if (_index.hasKeyPath(path)) {
        storindex = this.storindex = _index;
      }
    }, this);

    if (!storindex && store.keyPath === path) {  // TODO - handle array store keyPath
      storindex = this.storindex = store;
    }  // TODO - else create a new index

    // set range
    if (keys.length === 1) {
      range = params[path];
    } else {
      keyPath = storindex.keyPath;

      for (var i=0; i < keyPath.length; i++) {
        range.push(params[keyPath[i]]);
      }
    }

    this.range = Range.only(range);
    return this;
  },

  match: function(key, regex) {
    var filter = function(value) {
      return value[key].match(regex);
    };

    this.filters.push(filter);
    return this;
  },

  run: function() {
    var method, methodArgs, hit,
        self = this,
        queries = this.queries,
        filters = this.filters,
        results = [];

    return _storeAction(this.dbName, this.storeName, function(store) {
      self.store = store;
      self.storindex = store;

      if (queries.length > 0) {
        method = self[queries[0][0]];
        method.call(self);
      }

      return self.storindex.openCursor(self.range, null, function(cursor, resolve) {
        if (cursor) {
          if (filters.length > 0) {
            var value = cursor.value;

            hit = filters.every(function(filter) {
              return filter(value);
            });

            if (hit) { results.push(value); }

          } else {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
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
