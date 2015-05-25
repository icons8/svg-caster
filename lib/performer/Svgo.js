var
  SVGO = require('svgo'),
  Promise = require('bluebird');

module.exports = Svgo;

function Svgo(options) {
  options = options || {};

  this._svgo = new SVGO();
}

Svgo.has = function(options) {
  return options && options.svgo;
};

Svgo.prototype = {

  perform: function(entity) {
    var
      self = this,
      svgo = this._svgo,
      promise;

    promise = Promise.resolve(entity);

    if (Array.isArray(entity)) {
      return promise
        .each(function(entity) {
          return self.perform(entity);
        });
    }

    if (entity.svg) {
      promise = promise
        .then(function(entity) {
          return new Promise(function(resolve, reject) {
            svgo.optimize(entity.svg, function(result) {
              if (!result.data || result.error) {
                reject(result.error || 'Unknown svgo optimize error for "' + entity.name + '"');
                return;
              }
              entity.svg = result.data;
              resolve(entity);
            });
          });
        });
    }

    return promise;
  }

};