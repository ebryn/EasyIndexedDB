import ObjectStore from './object_store';
import { _handleErrors } from './error_handling';

// transactions have onerror, onabort, and oncomplete events
var Transaction = function(idbTransaction) {
  this._idbTransaction = idbTransaction;
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

export Transaction;
