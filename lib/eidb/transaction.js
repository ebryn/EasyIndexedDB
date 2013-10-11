import ObjectStore from './object_store';
import hook from './hook';

var Transaction = function(idbTransaction) {
  this._idbTransaction = idbTransaction;

  idbTransaction.onabort = hook.triggerHandler('transaction.onabort');
  idbTransaction.oncomplete = hook.triggerHandler('transaction.oncomplete');
  idbTransaction.onerror = hook.triggerHandler('transaction.onerror');
};

Transaction.prototype = {
  _idbTransaction: null,

  objectStore: function(name) {
    return new ObjectStore(this._idbTransaction.objectStore(name));
  },

  abort: function() {
    hook.try('transaction.abort', this, arguments, function(self) {
      return self._idbTransaction.abort();
    });
  }
};

export Transaction;
