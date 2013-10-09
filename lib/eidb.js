import { open, _delete, version, webkitGetDatabaseNames, isGetDatabaseNamesSupported, getDatabaseNames, openOnly, bumpVersion, storeAction, createObjectStore, deleteObjectStore, createIndex, addRecord, getRecord, putRecord, deleteRecord, getAll, getIndexes } from './eidb/eidb';
import { find } from './eidb/find';
import Database from './eidb/database';
import ObjectStore from './eidb/object_store';
import Transaction from './eidb/transaction';
import Index from './eidb/index';
import { __instrument__ } from './eidb/utils';
import { ERROR_HANDLING, ERROR_LOGGING, error } from './eidb/error_handling';
import { hook } from './eidb/hook';

__exports__.delete = _delete;
__exports__.on = hook.on;
__exports__.off = hook.off;
__exports__.trigger = hook.trigger;
__exports__._promiseCallbacks = hook._promiseCallbacks;
__exports__.addHook = hook.addHook;

// TODO - don't make __instrument__ public. (For now, need it for testing.)
// TODO - probably don't need to export error. But will need to fix error_hanlding_test.js
export { open, version, webkitGetDatabaseNames, isGetDatabaseNamesSupported, getDatabaseNames, openOnly, bumpVersion, storeAction, createObjectStore, deleteObjectStore, createIndex };
export { addRecord, getRecord, putRecord, deleteRecord, getAll };
export { Database, ObjectStore, Transaction, Index, __instrument__ };
export { ERROR_HANDLING, ERROR_LOGGING, error };
export { getIndexes, find };
