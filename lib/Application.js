var
  Promise = require('bluebird'),
  log4js = require('log4js'),
  Font = require('./Font'),
  Svg = require('./Svg'),
  SvgSet = require('./SvgSet')
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

    if (options.font) {
      serial = serial.then(function() {
        return self._loadFont();
      });
    }
    if (options.svg) {
      serial = serial.then(function() {
        return self._loadSvg();
      });
    }
    if (options.svgSet) {
      serial = serial.then(function() {
        return self._loadSvgSet();
      });
    }
    if (options.outSvg) {
      serial = serial.then(function() {
        return self._saveSvg();
      });
    }
    if (options.outSvgSet) {
      serial = serial.then(function() {
        return self._saveSvgSet();
      });
    }

    serial.then(
      function() {
        console.log('done');
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

  _loadFont: function() {
    var
      self = this,
      options = this._options,
      font = new Font(options, this._logger);

    return font.load(options.font, options.fontCss)
      .then(function() {
        self._appendCollection(font.getCollection());
      });
  },

  _loadSvg: function() {
    var
      self = this,
      options = this._options,
      svg = new Svg(options);

    return svg.load(options.svg)
      .then(function() {
        self._appendCollection(svg.getCollection());
      });
  },

  _loadSvgSet: function() {
    var
      self = this,
      options = this._options,
      svgSet = new SvgSet(options);

    return svgSet.load(options.svgSet)
      .then(function() {
        self._appendCollection(svgSet.getCollection());
      });
  },

  _saveSvg: function() {
    var
      options = this._options,
      svg = new Svg(options);

    svg.setCollection(this._collection);
    return svg.save(options.outSvg);
  },

  _saveSvgSet: function() {
    var
      options = this._options,
      svgSet = new SvgSet(options);

    svgSet.setCollection(this._collection);
    return svgSet.save(options.outSvgSet);
  }

};