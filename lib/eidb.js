import { open, _delete, version, webkitGetDatabaseNames, isGetDatabaseNamesSupported, getDatabaseNames, openOnly, bumpVersion, createObjectStore, deleteObjectStore, createIndex, addRecord, getRecord, putRecord, deleteRecord, getAll } from './eidb/eidb';
import Database from './eidb/database';
import ObjectStore from './eidb/object_store';
import Transaction from './eidb/transaction';
import Index from './eidb/index';
import { __instrument__ } from './eidb/utils';
import { LOG_ERRORS, error, registerErrorHandler } from './eidb/error_handling';
import { RSVP } from './eidb/promise';

__exports__.delete = _delete;

RSVP.EventTarget.mixin(__exports__);

__exports__.on('error', function(e) {
  registerErrorHandler.notify(e);
});

// TODO - don't make __instrument__ public. (For now, need it for testing.)
// TODO - probably don't need to export error. But will need to fix error_hanlding_test.js
export { open, version, webkitGetDatabaseNames, isGetDatabaseNamesSupported, getDatabaseNames, openOnly, bumpVersion, createObjectStore, deleteObjectStore, createIndex };
export { addRecord, getRecord, putRecord, deleteRecord, getAll };
export { Database, ObjectStore, Transaction, Index, __instrument__ };
export { LOG_ERRORS, error, registerErrorHandler };
