import { open, _delete, version, webkitGetDatabaseNames, bumpVersion, createObjectStore, deleteObjectStore, createIndex, addRecord, getRecord, putRecord, deleteRecord, getAll } from './eidb/eidb';
import Database from './eidb/database';
import ObjectStore from './eidb/object_store';
import Transaction from './eidb/transaction';
import Index from './eidb/index';

__exports__.delete = _delete;

export { open, version, webkitGetDatabaseNames, bumpVersion, createObjectStore, deleteObjectStore, createIndex, addRecord, getRecord, putRecord, deleteRecord, getAll, Database, ObjectStore, Transaction, Index };
