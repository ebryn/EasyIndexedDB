import { open, _delete, version, webkitGetDatabaseNames, getDatabaseNames, bumpVersion, createObjectStore, deleteObjectStore, createIndex, addRecord, getRecord, putRecord, deleteRecord, getAll } from './eidb/eidb';
import Database from './eidb/database';
import ObjectStore from './eidb/object_store';
import Transaction from './eidb/transaction';
import Index from './eidb/index';
import { __instrument__ } from './eidb/utils';

__exports__.delete = _delete;

// TODO - don't make __instrument__ public. (For now, need it for testing.)
export { open, version, webkitGetDatabaseNames, getDatabaseNames, bumpVersion, createObjectStore, deleteObjectStore, createIndex, addRecord, getRecord, putRecord, deleteRecord, getAll, Database, ObjectStore, Transaction, Index, __instrument__ };
