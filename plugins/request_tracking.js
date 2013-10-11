// globals: RSVP, EIDB

// TODO - implement deleteRequest

(function(EIDB) {

var addHook = EIDB.hook.addHook,
    addFactory = EIDB.hook.addFactory,
    deleteFactory = EIDB.hook.deleteFactory,
    DB_NAME = '__eidb__',
    STORE_NAME = '__eidb__requests__';

var addOpts = {
      dbName: DB_NAME,
      storeName: STORE_NAME
    },
    addRequest = addFactory(addOpts, addSetup, addSuccess);

function addSetup(args) {
  var o = {},
      reqResult = args[0],
      reqInfo = args[1],
      idbObj = reqInfo[0],
      name = reqInfo[0].name,
      method = reqInfo[1],
      methodArgs = reqInfo[2] && reqInfo[2][0],
      timestamp = args[2];

  if (idbObj instanceof IDBObjectStore && !(/__eidb__/.test(name)) && method != 'get') {

    o.method = method;
    o.timestamp = timestamp;

    if (method == 'add' || method == 'put') {
      o[name] = JSON.parse(JSON.stringify(methodArgs));
    } else if (method == 'delete') {
      o[name] = {}
    }

    o[name].id = reqResult;
    return o;
  }
}

function addSuccess(args) {

}

function removeSetup(args) {

}

function removeSuccess(args) {

}

function removeError(key) {  // should be args instead of key

}

addHook('_request.onsuccess.resolve.before', addRequest);

})(EIDB);
