var
  Promise = require('bluebird'),
  log4js = require('log4js'),
  SvgFontLoader = require('./loader/SvgFont'),
  SvgLoader = require('./loader/Svg'),
  SvgSetLoader = require('./loader/SvgSet'),
  SvgSaver = require('./saver/Svg'),
  SvgSetSaver = require('./saver/SvgSet'),
  SvgoPerformer = require('./performer/Svgo'),
  NamePerformer = require('./performer/Name')
  ;


module.exports = Application;

function Application(options) {
  this._options = options || {};
  this._collection = [];

  this._logger = log4js.getLogger();
}

Application.prototype = {

  run: function() {
    var
      self = this,
      logger = this._logger,
      serial = Promise.resolve(),
      options = this._options;

    [
      SvgFontLoader,
      SvgLoader,
      SvgSetLoader
    ]
      .forEach(function(Loader) {
        if (Loader.has(options)) {
          serial = serial.then(function() {
            var
              loader = new Loader(options);

            return loader.load(options)
              .then(function() {
                self._appendCollection(loader.getCollection());
              });
          });
        }
      });

    [
      SvgoPerformer,
      NamePerformer
    ]
      .forEach(function(Performer) {
        if (Performer.has(options)) {
          serial = serial.then(function() {
            var
              performer = new Performer(options);

            return performer.perform(self._getCollection(), options)
              .then(function(collection) {
                self._setCollection(collection);
              });
          });
        }
      });

    serial = serial.then(function() {
      return self._checkCollection();
    });

    [
      SvgSaver,
      SvgSetSaver
    ]
      .forEach(function(Saver) {
        if (Saver.has(options)) {
          serial = serial.then(function() {
            var
              saver = new Saver(options);

            saver.setCollection(self._getCollection());
            return saver.save(options);
          });
        }
      });

    serial.then(
      function() {
        logger.info('Done.', self._collection.length, 'icons processed.');
      },
      function(error) {
        logger.error(error);
      }
    );

    return serial;
  },

  _appendCollection: function(collection) {
    if (!Array.isArray(collection)) {
      return;
    }
    Array.prototype.push.apply(this._collection, collection);
  },

  _getCollection: function() {
    return this._collection;
  },

  _setCollection: function(collection) {
    return this._collection = collection;
  },

  _checkCollection: function() {
    var
      map = {},
      logger = this._logger,
      index,
      collection,
      entity;

    collection = this._collection;
    for (index = 0; index < collection.length; index++) {
      entity = collection[index];
      if (!entity.name) {
        logger.warn('Entity "' + (entity.code || entity.unicode || entity.svg) + '" has no name');
        collection.splice(index--, 1);
        continue;
      }
      if (map.hasOwnProperty(entity.name)) {
        logger.warn('Entity name "' + entity.name + '" has duplicate');
        collection.splice(index--, 1);
        continue;
      }
      map[entity.name] = true;
    }

    return collection;
  }

};