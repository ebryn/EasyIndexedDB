define("eidb/database",
  ["eidb/indexed_db","eidb/object_store","eidb/transaction","eidb/error_handling","eidb/hook","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var idbDatabase = __dependency1__.idbDatabase;
    var ObjectStore = __dependency2__.ObjectStore;
    var Transaction = __dependency3__.Transaction;
    var _handleErrors = __dependency4__._handleErrors;
    var hook = __dependency5__.hook;

    var Database = function(idbDatabase) {
      this._idbDatabase = idbDatabase;
      this.name = idbDatabase.name;
      this.version = idbDatabase.version;
      this.objectStoreNames = idbDatabase.objectStoreNames;

      idbDatabase.onabort = hook.triggerHandler('database.onabort');
      idbDatabase.onerror = hook.triggerHandler('database.onerror');
      idbDatabase.onversionchange =  hook.triggerHandler('database.onversionchange');
    };

    Database.prototype = {
      _idbDatabase: null,
      name: null,
      version: null,
      objectStoreNames: null,

      close: function() {
        return _handleErrors(this, arguments, function(self) {
          return self._idbDatabase.close();
        }, {propogateError: true});
      },

      createObjectStore: function(name, options) {
        return _handleErrors(this, arguments, function(self) {
          return new ObjectStore(self._idbDatabase.createObjectStore(name, options));
        });
      },

      deleteObjectStore: function(name) {
        return _handleErrors(this, arguments, function(self) {
          return self._idbDatabase.deleteObjectStore(name);
        });
      },

      objectStore: function(name, opts) {
        return this.transactionFor(name, opts).objectStore(name);
      },

      transaction: function(objectStores, mode, opts) {
        var tx = _handleErrors(this, arguments, function(self) {
          if (mode !== undefined) {
            return self._idbDatabase.transaction(objectStores, mode);
          }

          return self._idbDatabase.transaction(objectStores);
        }, opts);

        return new Transaction(tx);
      },

      _transactionsMap: null,

      transactionFor: function(objectStore, opts) {
        var self = this;
        if (!this._transactionsMap) { this._transactionsMap = {}; }

        // Clear transaction references at the end of the browser event loop
        // TODO: Is this sane?
        setTimeout(function() {
          self._transactionsMap = {};
        }, 0);

        return this._transactionsMap[objectStore] = this._transactionsMap[objectStore] || this.transaction([objectStore], "readwrite", opts);
      },

      add: function(objectStore, id, obj) {
        var store = this.objectStore(objectStore),
            key = store.keyPath;

        obj[key] = id;
        return store.add(obj).then(function(event) {
          return obj;
        });
      },

      get: function(objectStore, id) {
        var store = this.objectStore(objectStore);
        return store.get(id);
      },

      put: function(objectStore, id, obj) {
        var store = this.objectStore(objectStore),
            key = store.keyPath;

        obj[key] = id;
        return store.put(obj);
      },

      "delete": function(objectStore, id) {
        return this.objectStore(objectStore).delete(id);
      },

      hasObjectStore: function(name) {
        return this.objectStoreNames.contains(name);
      }
    };


    __exports__.Database = Database;
  });
define("eidb/eidb",
  ["eidb/indexed_db","eidb/promise","eidb/database","eidb/utils","eidb/error_handling","eidb/hook","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    var indexedDB = __dependency1__.indexedDB;
    var Promise = __dependency2__.Promise;
    var RSVP = __dependency2__.RSVP;
    var Database = __dependency3__.Database;
    var _warn = __dependency4__._warn;
    var _request = __dependency4__._request;
    var __instrument__ = __dependency4__.__instrument__;
    var _rsvpErrorHandler = __dependency5__._rsvpErrorHandler;
    var hook = __dependency6__.hook;

    function open(dbName, version, upgradeCallback, opts) {
      return new Promise(function(resolve, reject) {
        var EIDB = window.EIDB,
            req = version ? indexedDB.open(dbName, version) : indexedDB.open(dbName);

        req.onsuccess = function(event) {
          var db = new Database(req.result);

          hook('open.onsuccess.resolve', resolve, db);

          if (!opts || (opts && !opts.keepOpen)) {
            setTimeout(function() {
              db.close();
            }, 0);
          }
        };
        req.onerror = function(event) {
          reject(event);
        };
        req.onupgradeneeded = function(event) {
          var db = new Database(req.result),
              ret = (opts && opts.returnEvent) ? {db: db, event: event} : db;
          if (upgradeCallback) {
            hook('open.onupgradeneeded.callback', upgradeCallback, ret);
          }
        };
      }).then(null, _rsvpErrorHandler(indexedDB, "open", [dbName, version, upgradeCallback, opts]));
    }

    function _delete(dbName) {
      return _request(indexedDB, "deleteDatabase", arguments);
    }

    function version(dbName){
      return openOnly(dbName).then(function(db) {
        if (!db) { return null; }
        return db.version;
      });
    }

    function webkitGetDatabaseNames() {
      return _request(indexedDB, "webkitGetDatabaseNames");
    }

    var isGetDatabaseNamesSupported = (function() {
      return 'webkitGetDatabaseNames' in indexedDB;
    })();

    function getDatabaseNames() {
      if (isGetDatabaseNamesSupported) {
        return webkitGetDatabaseNames();
      }

      _warn(true, "EIDB.getDatabaseNames is currently only supported in Chrome" );
      return RSVP.resolve([]);
    }

    function openOnly(dbName, version, upgradeCallback, opts) {
      if (isGetDatabaseNamesSupported) {
        return getDatabaseNames().then(function(names) {
          if (names.contains(dbName) && !version) {
            return open(dbName, version, upgradeCallback, opts);
          }

          if (names.contains(dbName) && version) {
            return open(dbName).then(function(db) {
              if (db.version >= version) {
                return open(dbName, version, upgradeCallback, opts);
              }
              return null;
            });
          }

          return null;
        });
      }

      _warn(true, "EIDB.openOnly acts like .open in non-supported browsers" );
      return open(dbName, version, upgradeCallback, opts);
    }

    function bumpVersion(dbName, upgradeCallback, opts) {
      if (!dbName) { return RSVP.resolve(null); }

      return open(dbName).then(function(db) {
        return open(dbName, db.version + 1, function(res) {
          if (upgradeCallback && window.EIDB.ERROR_HANDLING) {
            try {
              upgradeCallback(res);
            } catch (e) {
              _rsvpErrorHandler(db, "bumpVersion", [dbName, upgradeCallback, opts])(e);
            }
          } else if (upgradeCallback) {
            upgradeCallback(res);
          }
        }, opts);
      });
    }

    function createObjectStore(dbName, storeName, storeOpts) {
      var opts = storeOpts ? storeOpts : {autoIncrement: true};

      return bumpVersion(dbName, function(db) {
        db.createObjectStore(storeName, opts);
      });
    }

    function deleteObjectStore(dbName, storeName) {
      return bumpVersion(dbName, function(db) {
        db.deleteObjectStore(storeName);
      });
    }

    function createIndex(dbName, storeName, indexName, keyPath, indexOpts) {
      return bumpVersion(dbName, function(res) {
        var store = res.event.target.transaction.objectStore(storeName);
        store.createIndex(indexName, keyPath, indexOpts);
      }, {returnEvent: true});
    }

    function storeAction(dbName, storeName, callback, openOpts) {
      var db;
      return open(dbName, null, null, openOpts).then(function(_db) {
        db = _db;
        var store = db.objectStore(storeName, openOpts);

        if (openOpts && openOpts.keepOpen) {
          return callback(store, db);
        }

        return callback(store);
      }).then(null, _rsvpErrorHandler(db, "storeAction", [dbName, storeName, callback, openOpts]));
    }

    // TODO - refactor?
    // note ObjectStore#insertWith_key will close the database
    function _insertRecord(dbName, storeName, value, key, method) {
      return storeAction(dbName, storeName, function(store, db) {

        if (value instanceof Array) {
          return RSVP.all(value.map(function(_value, i) {

            if (!store.keyPath && key instanceof Array) {
              return store.insertWith_key(method, _value, key[i], db);
            }

            if (!store.keyPath) {
              return store.insertWith_key(method, _value, null, db);
            }

            // in-line keys
            db.close();
            return store[method](_value);
          }));
        }

        if (!store.keyPath) {
          return store.insertWith_key(method, value, key, db);
        }

        // in-line keys
        db.close();
        return store[method](value, key);
      }, {keepOpen: true});
    }

    function addRecord(dbName, storeName, value, key) {
      return _insertRecord(dbName, storeName, value, key, 'add');
    }

    function putRecord(dbName, storeName, value, key) {
      return _insertRecord(dbName, storeName, value, key, 'put');
    }

    function getRecord(dbName, storeName, key) {
      return storeAction(dbName, storeName, function(store) {
        return store.get(key);
      });
    }

    function deleteRecord(dbName, storeName, key) {
      return storeAction(dbName, storeName, function(store) {
        return store.delete(key);
      });
    }

    function getAll(dbName, storeName, range, direction) {
      return storeAction(dbName, storeName, function(store) {
        return store.getAll(range, direction);
      });
    }

    function getIndexes(dbName, storeName) {
      return storeAction(dbName, storeName, function(store) {
        return store.getIndexes();
      });
    }


    __exports__.open = open;
    __exports__._delete = _delete;
    __exports__.openOnly = openOnly;
    __exports__.bumpVersion = bumpVersion;
    __exports__.version = version;
    __exports__.webkitGetDatabaseNames = webkitGetDatabaseNames;
    __exports__.isGetDatabaseNamesSupported = isGetDatabaseNamesSupported;
    __exports__.getDatabaseNames = getDatabaseNames;
    __exports__.createObjectStore = createObjectStore;
    __exports__.deleteObjectStore = deleteObjectStore;
    __exports__.createIndex = createIndex;
    __exports__.addRecord = addRecord;
    __exports__.getRecord = getRecord;
    __exports__.putRecord = putRecord;
    __exports__.deleteRecord = deleteRecord;
    __exports__.getAll = getAll;
    __exports__.getIndexes = getIndexes;
    __exports__.storeAction = storeAction;
  });
define("eidb/error_handling",
  ["eidb/promise","eidb/hook","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var RSVP = __dependency1__.RSVP;
    var hook = __dependency2__.hook;

    var ERROR_HANDLING = false;
    var ERROR_LOGGING = true;
    var error = null;

    function _handleErrors(context, args, code, opts) {
      var EIDB = window.EIDB,
          logErrors = EIDB.ERROR_LOGGING;

      if (!opts || !opts.propogateError) { EIDB.error = null; }

      try {
        return code(context);
      } catch (e) {
        e.context = context;
        e.arguments = args;
        e.eidb_code = code;
        e._message = __createErrorMessage(e);

        EIDB.error = e;

        if (!EIDB.ERROR_HANDLING) { throw e; }
        if (logErrors && !(opts && opts.stopErrors)) { console.error(e); }
        if (opts && !opts.stopErrors) { EIDB.trigger('error', e); }

        return false;
      }
    }

    function __createErrorMessage(e) {
      var EIDB = window.EIDB,
          message = null;

      if (e.message) { message = e.message; }

      if (e.target && e.target.error && e.target.error.message) {
        message = e.target.error.message;
      }

      return message;
    }

    function _rsvpErrorHandler(idbObj, method, args) {
      var EIDB = window.EIDB,
          logErrors = EIDB.ERROR_LOGGING;

      return function(e) {
        var error = new Error();
        error._name = "EIDB request " + idbObj + " #" + method + " error";
        error._idbObj = idbObj;
        error._arguments = args;
        error._message = __createErrorMessage(e);
        error.originalError = e;

        if (!EIDB.ERROR_HANDLING) { throw e; }
        if (logErrors) { console.error(e); }

        EIDB.error = e;
        EIDB.trigger('error', e);
      };
    }

    function _clearError() {
      window.EIDB.error = null;
    }

    [
      'open.onsuccess.resolve.before',
      'open.onupgradeneeded.callback.before',
      '_request.onsuccess.resolve.before',
      '_openCursor.onsuccess.resolve.before'
    ].forEach(function(type) {
      hook.addHook(type, _clearError);
    });


    __exports__.ERROR_HANDLING = ERROR_HANDLING;
    __exports__.ERROR_LOGGING = ERROR_LOGGING;
    __exports__.error = error;
    __exports__._handleErrors = _handleErrors;
    __exports__._rsvpErrorHandler = _rsvpErrorHandler;
  });
define("eidb/find",
  ["eidb/eidb","eidb/error_handling","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var storeAction = __dependency1__.storeAction;
    var _warn = __dependency1__._warn;
    var _handleErrors = __dependency2__._handleErrors;

    function _createRange(lower, upper) {
      return function() {
        return Range.bound(lower.lower, upper.upper, lower.lowerOpen, upper.upperOpen);
      };
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

          obj3[attr] = _handleErrors(null, arguments, _createRange(lower, upper));
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

      // Since #setRange always includes the upper and lower bounds
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


    __exports__.find = find;
  });
define("eidb/hook",
  ["eidb/promise","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var RSVP = __dependency1__.RSVP;

    var __args,
        __slice = Array.prototype.slice;

    function hook(eventName, fn) {
      var ret;
      __args = __slice.call(arguments, 2);

      __trigger(eventName + '.before');
      ret = fn.apply(fn, __args);
      __trigger(eventName + '.after');

      return ret;
    }

    RSVP.EventTarget.mixin(hook);

    function __trigger(eventName) {
      hook.trigger(eventName, { args: __args });
    }

    hook.addHook = function(eventName, fn) {
      hook.on(eventName, function(evt) {
        fn.apply(fn, evt.args);
      });
    };

    hook.triggerHandler = function(eventName) {
      return function(evt) {
        hook.trigger(eventName, evt);
      };
    };


    __exports__.hook = hook;
  });
define("eidb/index",
  ["eidb/promise","eidb/utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Promise = __dependency1__.Promise;
    var _request = __dependency2__._request;
    var _openCursor = __dependency2__._openCursor;
    var _getAll = __dependency2__._getAll;
    var _hasKeyPath = __dependency2__._hasKeyPath;

    var Index = function(idbIndex, store) {
      this._idbIndex = idbIndex;
      this.name = idbIndex.name;
      this.objectStore = store;
      this.keyPath = idbIndex.keyPath;  // TODO - normalize to Array
      this.multiEntry = idbIndex.multiEntry;
      this.unique = idbIndex.unique;
    };

    Index.prototype = {
      _idbIndex: null,
      name: null,
      objectStore: null,
      keyPath: null,
      multiEntry: null,
      unique: null,

      openCursor: function(range, direction, onsuccess) {
        return _openCursor(this._idbIndex, range, direction, onsuccess);
      },

      openKeyCursor: function(range, direction, onsuccess) {
        return _openCursor(this._idbIndex, range, direction, onsuccess, {keyOnly: true});
      },

      get: function(key) {
        return _request(this._idbIndex, "get", arguments);
      },

      getKey: function(key) {
        return _request(this._idbIndex, "getKey", arguments);
      },

      count: function(key) {
        return _request(this._idbIndex, "count", arguments);
      },

      getAll: function(range, direction) {
        return _getAll(this._idbIndex, range, direction);
      },

      hasKeyPath: function(path) {
        return _hasKeyPath(this, path);
      }
    };


    __exports__.Index = Index;
  });
define("eidb/indexed_db",
  ["exports"],
  function(__exports__) {
    "use strict";
    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.IndexedDB;


    __exports__.indexedDB = indexedDB;
  });
define("eidb/object_store",
  ["eidb/promise","eidb/index","eidb/utils","eidb/error_handling","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var Promise = __dependency1__.Promise;
    var Index = __dependency2__.Index;
    var __instrument__ = __dependency3__.__instrument__;
    var _request = __dependency3__._request;
    var _openCursor = __dependency3__._openCursor;
    var _getAll = __dependency3__._getAll;
    var _hasKeyPath = __dependency3__._hasKeyPath;
    var _handleErrors = __dependency4__._handleErrors;

    var ObjectStore = function(idbObjectStore) {
      this._idbObjectStore = idbObjectStore;
      this.keyPath = idbObjectStore.keyPath;  // TODO - normalize to Array
      this.indexNames = idbObjectStore.indexNames;
      this.name = idbObjectStore.name;
      this.autoIncrement = idbObjectStore.autoIncrement;
    };

    ObjectStore.prototype = {
      _idbObjectStore: null,
      keyPath: null,
      name: null,
      autoIncrement: null,

      add: function(value, key) {
        return _request(this._idbObjectStore, 'add', arguments);
      },

      get: function(key) {
        return _request(this._idbObjectStore, 'get', arguments);
      },

      put: function(value, key) {
        return _request(this._idbObjectStore, 'put', arguments);
      },

      "delete": function(key) {
        return _request(this._idbObjectStore, 'delete', arguments);
      },

      count: function() {
        return _request(this._idbObjectStore, 'count');
      },

      clear: function() {
        return _request(this._idbObjectStore, 'clear');
      },

      openCursor: function(range, direction, onsuccess) {
        return _openCursor(this._idbObjectStore, range, direction, onsuccess);
      },

      getAll: function(range, direction) {
        return _getAll(this._idbObjectStore, range, direction);
      },

      // For use with out-of-line key stores. (Database doesn't
      // return the interal key when fetching records.)
      // Requires a database that has not been closed.
      // When does, it will close the database.
      insertWith_key: function(method, value, key, db) {
        var store = this;

        if (key) {
          value._key = key;
          db.close();
          return store[method](value, key);
        }

        return store.add(value).then(function(key) {
          value._key = key;

          return __instrument__(function() {  // __instrument__ is used in testing
            // if the transaction used for #add above gets put into the next
            // event loop cycle (happens when using Ember), we need to create
            // a new transaction fo the #put action

            var tx = _handleErrors(this, arguments, function(self) {
              return store._idbObjectStore.transaction.db.transaction(store.name, "readwrite");  // must keep this all chained
            });

            if (tx) {
              var newStore = new ObjectStore(tx.objectStore(store.name));

              return newStore.put(value, key).then(function(_key) {
                db.close();
                return _key;
              });
            }

            db.close();  // error occurred
            return false;
          });
        });
      },

      indexNames: null,

      index: function(name) {
        return _handleErrors(this, arguments, function(self) {
          return new Index(self._idbObjectStore.index(name), self);
        });
      },

      createIndex: function(name, keyPath, params) {
        var store = this._idbObjectStore;

        var index = _handleErrors(this, arguments, function(self) {
          return store.createIndex(name, keyPath, params);
        });

        this.indexNames = store.indexNames;
        return new Index(index, this);
      },

      deleteIndex: function(name) {
        var store = this._idbObjectStore;

        var res = _handleErrors(this, arguments, function(self) {
          return store.deleteIndex(name);
        });

        this.indexNames = store.indexNames;
        return res;
      },

      getIndexes: function() {
        var name,
            indexes = [],
            indexNames = this.indexNames;

        for (var i = 0; i < indexNames.length; i++) {
          name = indexNames[i];
          indexes.push(this.index(name));
        }

        return indexes;
      },

      hasKeyPath: function(path) {
        return _hasKeyPath(this, path);
      }
    };


    __exports__.ObjectStore = ObjectStore;
  });
define("eidb/promise",
  ["exports"],
  function(__exports__) {
    "use strict";
    var RSVP;

    if (window.RSVP) {
      RSVP = window.RSVP;
    } else if (window.Ember) {
      RSVP = window.Ember.RSVP;
    }

    var Promise = RSVP.Promise;


    __exports__.Promise = Promise;
    __exports__.RSVP = RSVP;
  });
define("eidb/transaction",
  ["eidb/object_store","eidb/error_handling","eidb/hook","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var ObjectStore = __dependency1__.ObjectStore;
    var _handleErrors = __dependency2__._handleErrors;
    var hook = __dependency3__.hook;

    var Transaction = function(idbTransaction) {
      this._idbTransaction = idbTransaction;

      idbTransaction.onabort = hook.triggerHandler('transaction.onabort');
      idbTransaction.oncomplete = hook.triggerHandler('transaction.oncomplete');
      idbTransaction.onerror = hook.triggerHandler('transaction.onerror');
    };

    Transaction.prototype = {
      _idbTransaction: null,

      objectStore: function(name) {
        return new ObjectStore(this._idbTransaction.objectStore(name));
      },

      abort: function() {
        _handleErrors(this, arguments, function(self) {
          return self._idbTransaction.abort();
        });
      }
    };


    __exports__.Transaction = Transaction;
  });
define("eidb/utils",
  ["eidb/promise","eidb/error_handling","eidb/hook","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Promise = __dependency1__.Promise;
    var _rsvpErrorHandler = __dependency2__._rsvpErrorHandler;
    var hook = __dependency3__.hook;

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


    __exports__.__instrument__ = __instrument__;
    __exports__._warn = _warn;
    __exports__._request = _request;
    __exports__._openCursor = _openCursor;
    __exports__._getAll = _getAll;
    __exports__._domStringListToArray = _domStringListToArray;
    __exports__._hasKeyPath = _hasKeyPath;
  });
define("eidb",
  ["eidb/eidb","eidb/find","eidb/database","eidb/object_store","eidb/transaction","eidb/index","eidb/utils","eidb/error_handling","eidb/hook","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __dependency9__, __exports__) {
    "use strict";
    var open = __dependency1__.open;
    var _delete = __dependency1__._delete;
    var version = __dependency1__.version;
    var webkitGetDatabaseNames = __dependency1__.webkitGetDatabaseNames;
    var isGetDatabaseNamesSupported = __dependency1__.isGetDatabaseNamesSupported;
    var getDatabaseNames = __dependency1__.getDatabaseNames;
    var openOnly = __dependency1__.openOnly;
    var bumpVersion = __dependency1__.bumpVersion;
    var storeAction = __dependency1__.storeAction;
    var createObjectStore = __dependency1__.createObjectStore;
    var deleteObjectStore = __dependency1__.deleteObjectStore;
    var createIndex = __dependency1__.createIndex;
    var addRecord = __dependency1__.addRecord;
    var getRecord = __dependency1__.getRecord;
    var putRecord = __dependency1__.putRecord;
    var deleteRecord = __dependency1__.deleteRecord;
    var getAll = __dependency1__.getAll;
    var getIndexes = __dependency1__.getIndexes;
    var find = __dependency2__.find;
    var Database = __dependency3__.Database;
    var ObjectStore = __dependency4__.ObjectStore;
    var Transaction = __dependency5__.Transaction;
    var Index = __dependency6__.Index;
    var __instrument__ = __dependency7__.__instrument__;
    var ERROR_HANDLING = __dependency8__.ERROR_HANDLING;
    var ERROR_LOGGING = __dependency8__.ERROR_LOGGING;
    var error = __dependency8__.error;
    var hook = __dependency9__.hook;

    __exports__.delete = _delete;
    __exports__.on = hook.on;
    __exports__.off = hook.off;
    __exports__.trigger = hook.trigger;
    __exports__._promiseCallbacks = hook._promiseCallbacks;
    __exports__.addHook = hook.addHook;

    // TODO - don't make __instrument__ public. (For now, need it for testing.)
    // TODO - probably don't need to export error. But will need to fix error_hanlding_test.js

    __exports__.open = open;
    __exports__.version = version;
    __exports__.webkitGetDatabaseNames = webkitGetDatabaseNames;
    __exports__.isGetDatabaseNamesSupported = isGetDatabaseNamesSupported;
    __exports__.getDatabaseNames = getDatabaseNames;
    __exports__.openOnly = openOnly;
    __exports__.bumpVersion = bumpVersion;
    __exports__.storeAction = storeAction;
    __exports__.createObjectStore = createObjectStore;
    __exports__.deleteObjectStore = deleteObjectStore;
    __exports__.createIndex = createIndex;
    __exports__.addRecord = addRecord;
    __exports__.getRecord = getRecord;
    __exports__.putRecord = putRecord;
    __exports__.deleteRecord = deleteRecord;
    __exports__.getAll = getAll;
    __exports__.Database = Database;
    __exports__.ObjectStore = ObjectStore;
    __exports__.Transaction = Transaction;
    __exports__.Index = Index;
    __exports__.__instrument__ = __instrument__;
    __exports__.ERROR_HANDLING = ERROR_HANDLING;
    __exports__.ERROR_LOGGING = ERROR_LOGGING;
    __exports__.error = error;
    __exports__.getIndexes = getIndexes;
    __exports__.find = find;
  });