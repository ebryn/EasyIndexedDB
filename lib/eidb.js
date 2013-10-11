import { open, _delete, version, webkitGetDatabaseNames, isGetDatabaseNamesSupported, getDatabaseNames, openOnly, bumpVersion, storeAction, createObjectStore, deleteObjectStore, createIndex, addRecord, getRecord, putRecord, deleteRecord, getAll, getIndexes } from './eidb/eidb';
import { find } from './eidb/find';
import Database from './eidb/database';
import ObjectStore from './eidb/object_store';
import Transaction from './eidb/transaction';
import Index from './eidb/index';
import { __instrument__ } from './eidb/utils';
import { hook, ERROR_CATCHING } from './eidb/hook';
import { LOGGING } from './eidb/logger';

__exports__.delete = _delete;
__exports__.addHook = hook.addHook;

['on', 'off', 'trigger'].forEach(function(method) {
  __exports__[method] = function() { hook[method].apply(hook, arguments); };
});

// TODO - don't make __instrument__ public. (For now, need it for testing.)
// TODO - probably don't need to export error. But will need to fix error_hanlding_test.js
export { open, version, webkitGetDatabaseNames, isGetDatabaseNamesSupported, getDatabaseNames, openOnly, bumpVersion, storeAction, createObjectStore, deleteObjectStore, createIndex };
export { addRecord, getRecord, putRecord, deleteRecord, getAll };
export { Database, ObjectStore, Transaction, Index, __instrument__ };
export { getIndexes, find };
export { ERROR_CATCHING };
export { LOGGING };
