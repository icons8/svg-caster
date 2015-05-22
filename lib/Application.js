var
  Promise = require('bluebird'),
  log4js = require('log4js'),
  SvgFont = require('./provider/SvgFont'),
  Svg = require('./provider/Svg'),
  SvgSet = require('./provider/SvgSet'),
  Svgo = require('./filter/Svgo')
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

    if (options.svgFont) {
      serial = serial.then(function() {
        return self.loadFont(options);
      });
    }
    if (options.svg) {
      serial = serial.then(function() {
        return self.loadSvg(options);
      });
    }
    if (options.svgSet) {
      serial = serial.then(function() {
        return self.loadSvgSet(options);
      });
    }
    if (options.svgo) {
      serial = serial.then(function() {
        return self.svgo(options);
      });
    }
    serial = serial.then(function() {
      return self._checkCollection();
    });
    if (options.outSvg) {
      serial = serial.then(function() {
        return self.saveSvg(options);
      });
    }
    if (options.outSvgSet) {
      serial = serial.then(function() {
        return self.saveSvgSet(options);
      });
    }

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
      logger = this._logger;

    this._collection.forEach(function(entity) {
      if (!entity.name) {
        logger.warn('Entity "' + (entity.code || entity.unicode || entity.svg) + '" has no name');
        return;
      }
      if (map.hasOwnProperty(entity.name)) {
        logger.warn('Entity name "' + entity.name + '" has duplicate');
        return;
      }
      map[entity.name] = true;
    });

    return this._collection;
  },

  loadFont: function(options) {
    var
      self = this,
      font = new SvgFont(this._options);

    return font.load(options)
      .then(function() {
        self._appendCollection(font.getCollection());
      });
  },

  loadSvg: function(options) {
    var
      self = this,
      svg = new Svg(this._options);

    return svg.load(options)
      .then(function() {
        self._appendCollection(svg.getCollection());
      });
  },

  loadSvgSet: function(options) {
    var
      self = this,
      svgSet = new SvgSet(this._options);

    return svgSet.load(options)
      .then(function() {
        self._appendCollection(svgSet.getCollection());
      });
  },

  svgo: function(options) {
    var
      self = this,
      svgo = new Svgo(this._options);

    return svgo.filter(this._getCollection(), options)
      .then(function(collection) {
        self._setCollection(collection);
      });
  },

  saveSvg: function(options) {
    var
      svg = new Svg(this._options);

    svg.setCollection(this._collection);
    return svg.save(options);
  },

  saveSvgSet: function(options) {
    var
      svgSet = new SvgSet(this._options);

    svgSet.setCollection(this._collection);
    return svgSet.save(options);
  }

};