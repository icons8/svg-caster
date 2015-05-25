var
  Promise = require('bluebird');

module.exports = Name;

function Name(options) {
  options = options || {};

  this._parser = options.nameParser
    ? new RegExp(options.nameParser, 'i')
    : null;

  this._replace = options.nameReplace
    ? new RegExp(options.nameReplace, 'ig')
    : null;

  this._replacement = options.nameReplacement || options.nameReplacement === 0
    ? options.nameReplacement
    : '';

  this._lower = options.nameLower || null;
}

Name.has = function(options) {
  return options && (options.nameParser || options.nameReplace || options.nameLower);
};

Name.prototype = {

  perform: function(entity) {
    var
      self = this,
      promise;

    promise = Promise.resolve(entity);

    if (Array.isArray(entity)) {
      return promise
        .each(function(entity) {
          return self.perform(entity);
        });
    }

    if (entity.name) {
      if (this._parser) {
        promise = promise.then(function(entity) {
          return self._performParser(entity);
        })
      }
      if (this._replace) {
        promise = promise.then(function(entity) {
          return self._performReplace(entity);
        })
      }
      if (this._lower) {
        promise = promise.then(function(entity) {
          return self._performLower(entity);
        })
      }
    }

    return promise;
  },

  _performParser: function(entity) {
    var
      match;

    match = entity.name.match(this._parser);
    if (match) {
      entity.name = match.slice(1).join('');
    }
    return entity;
  },

  _performReplace: function(entity) {
    entity.name = entity.name.replace(this._replace, this._replacement);
    return entity;
  },

  _performLower: function(entity) {
    entity.name = entity.name.toLowerCase();
    return entity;
  }

};