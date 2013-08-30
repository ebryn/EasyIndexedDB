import ObjectStore from './object_store';

// transactions have onerror, onabort, and oncomplete events
var Transaction = function(idbTransaction) {
  this._idbTransaction = idbTransaction;
};

Transaction.prototype = {
  _idbTransaction: null,

  objectStore: function(name) {
    return new ObjectStore(this._idbTransaction.objectStore(name));
  }
};

export Transaction;
