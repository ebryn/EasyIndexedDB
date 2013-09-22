# EasyIndexedDB.js

EasyIndexedDB (EIDB) is a promise-based library that wraps the IndexedDB API. In addition, it provides convenience methods to simplify working with IndexedDB.

## IndexedDB

Information about working with IndexedDB can be found at the [Mozilla Developer Network website.](https://developer.mozilla.org/en-US/docs/IndexedDB) The specifications for the IndexedDB API are at the [W3C website.](http://www.w3.org/TR/IndexedDB/)

## Promises

EIDB uses the [RSVP.js promise](https://github.com/tildeio/rsvp.js) implementation to handle asynchronous calls to IndexedDB.

## Basic Usage

For asynchronous commands, if you do not need to handle the results of a command, then simply call the command. If you need to handle the results as soon as they become available, you will need to chain a `.then` call.

* Create/open a database

    ```javascript
    EIDB.open('myDB').then(function(db) {
      // do something with the db (database)
    });
    ```

* Create an object store

    ```javascript
    EIDB.createObjectStore('myDB', 'kids');
    ```

    If `myDB` was not previously created, EIDB will create it for you.

* Add a record

    ```javascript
    EIDB.addRecord('myDB', 'kids', {name: 'Kenny'});
    ```

    `.addRecord` also accepts an array of records:

    ```javascript
    var records = [{name: 'Kyle', name: 'Cartman'}];
    EIDB.addRecord('myDB' 'kids', records).then(function(ids) {
      // the return value is an array of the keys (ids) of the newly created records
    });
    ```

* Modify a record

    ```javascript
    EIDB.putRecord('myDB', 'kids', {name: {first: 'Kenny'}}, 1);  // 1 is the record key
    ```

    `.putRecord` can also be used to add a record if does not exist yet

* Delete a record

    ```javascript
    EIDB.deleteRecord('myDB', 'kids', 1);  // 1 is the record key
    ```

### List of EIDB functions
* `open(dbName, version, upgradeCallback, opts)`
* `openOnly(dbName, version, upgradeCallback, opts)`: In Chrome, this will not create a database if the requested one does not exist. For other browsers, it will fall back to `open`.
* `bumpVersion(dbName, upgradeCallback, opts)`: creates a new database version and allows you to perform upgrade actions on the database.
* `storeAction(dbName, storeName, callback, openOpts)`: Object store is provided as the parameter in the callback function. (Not to be used for "onupgradeneeded" actions.)
* `version(dbName)`
* `delete(dbName)`
* `createObjectStore(dbName, storeName, storeOpts)`
* `deleteObjectStore(dbName, storeName)`
* `createIndex(dbName, storeName, indexName, keyPath, indexOpts)`
* `getIndexes(dbName, storeName)`
* `getAll(dbName, storeName, range, direction)`
* `addRecord(dbName, storeName, value, key)`
* `putRecord(dbName, storeName, value, key)`
* `getRecord(dbName, storeName, key)`
* `deleteRecord(dbName, storeName, key)`
* `webkitGetDatabaseNames()`: Only works in Chrome.
* `isGetDatabaseNamesSupported`: A property that returns true for Chrome.
* `getDatabaseNames()`: Will use `webkitGetDatabaseNames` if in Chrome. For other browsers, it will return a promise that results in an empty array.

## Basic Queries

Say your records look something like this {id: 1, name: 'Stan', color: 'red'}

* Find records that have an exact value

    ```javascript
    EIDB.find('myDB', 'kids', {name: 'Stan'}).then(function(records) {
      // do something with the array of records
    });
    ```
    ```javascript
    EIDB.find('myDB', 'kids', {name: 'Stan', color: 'red'});
    ```

* Find records by chaining criteria

    ```javascript
    EIDB.find('myDB', 'kids')
        .eq('name', 'Stan')  // name should equal 'Stan'
        .gte('color', 'green')  // color should be greater than or equal to 'green'
        .run()
        .then(function(results) { /* ... */ });
    ```

    ```javascript
    EIDB.find('myDB', 'kids')
        .match('name', /tan/)
        .first();
        .then(function(results) { /* ... */ });
    ```

    Methods you can use in a query chain:
    * `eq` or `equal`: exact matches
    * `gt`: greater than
    * `gte`: greater than or equal to
    * `lt`: less than
    * `lte`: less than or equal to
    * `range`: combines `gte` and `lte`

    ```javascript
    .range('id', [10,20])
    ```

    * `match`: test a record against a regular expression
    * `filter`: create your own filter

    ```javascript
    .filter(function(record) { return record.name.first === 'Chef'})
    ```

    * `run`: run the query. If you want to run the query in reverse direction pass it a 'prev' argument

    ```javascript
    .run('prev')
    ```

    * `first`: use this instead of `run` to get just the first record
    * `last`: use this instead of `run` to get just the last record

### Indexing
If you search for records through `EIDB.find`, EIDB will automatically created the appropriate indexes for you if they do not exist. So if you call `eq('color', 'blue')`, EIDB will create an index called 'color'. If you call `eq({name: 'Kyle', color: 'blue'})`, EIDB will create an index called 'color_name'.

## Error Handing

EIDB can funnel error handling into one place by setting `EIDB.ERROR_HANDLING = true' (false by default.) If you want to process the error in your application, then you can register an error handler with EIDB.

```javascript
EIDB.registerErrorHandler(function(err) {
   /* have the app process the error */
});
```

If `EIDB.ERROR_LOGGING = true` (default), then you will see error information in the browser console as well.

## Database Tracking

Currently, only Chrome natively supports retrieving the names of the databases that aleady exists. If your web app allows end users to create their own databases, then you'll need to manually keep track of those databases in browsers such as Firefox.

IF `EIDB.DATABASE_TRACKING` is set to true, EIDB will keep track of the names of databases created through EIDB in a database called "__eidb__". (Databases created directly though the IndexedDB API will not be tracked.)

## Working Closer to the IndexedDB API
EIDB will automatically take care of some of the details of using IndexedDB (database versioning, placing a "_key" value in records when out-of-line object stores are used, creating indexes as needed, etc.). If this does not suite your needs, you can work at a more granular level. Here is an example:

```javascript
var results = [];

EIDB.open('myDB', 1, function(db) {
  var store = db.createObjectStore('kids', {keyPath: 'id'});
  var index = store.createIndex('by_name', 'name', {unique: false});

}).then(function(db) {
  var store = db.objectStore('kids');

  store.add({id: 1, name: 'Kenny'});
  store.add({id: 2, name: 'Kenny'});

  return EIDB.open('myDB', 1);
}).then(function(db) {
  var tx = db.transaction('kids'),
      index = tx.objectStore('kids').index('by_name');
      res = [];

  index.openCursor('Kenny', 'prev', function(cursor, resolve) {
    if (cursor) {
      res.push(cursor.value);
      cursor.continue();
    } else {
      resolve(res);
    }
  }).then(function(res) {
    results = res;
  });
});
```
