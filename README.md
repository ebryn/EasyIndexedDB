# EasyIndexedDB.js

EasyIndexedDB (EIDB) is a promise-based library that wraps the IndexedDB API. In addition, it provides convenience methods to simplify working with IndexedDB.

## IndexedDB

Information about working with IndexedDB can be found at the [Mozilla Developer Network website.](https://developer.mozilla.org/en-US/docs/IndexedDB) The specifications for the IndexedDB API are at the [W3C website.](http://www.w3.org/TR/IndexedDB/)

## Promises

EIDB uses the [RSVP.js promise](https://github.com/tildeio/rsvp.js) implementation to handle asynchronous calls to IndexedDB.

## Basic Usage

For asynchronous commands, if you do not need to handle the results of a command, the simply call the command. If you need to handle the results as soon as they become available, you will need to chain a `.then` call.

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
    EIDB.addRecord('myDB' 'kids', [{},{}]).then(function(ids) {
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
        .then(function(results) { //... });
    ```
