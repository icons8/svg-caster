var
  fs = require('fs'),
  Promise = require('bluebird'),
  globby = require('globby'),
  pathLib = require('path'),
  cheerio = require('cheerio')
  ;

module.exports = Svg;

function Svg(options) {
  this._options = options || {};
  this._collection = [];
}


Svg.prototype = {

  load: function(options) {
    var
      self = this,
      promise,
      pattern;

    options = options || {};
    pattern = options.svg || '';

    promise = Promise.fromNode(function(callback) {
      globby(pattern, { nodir: true }, callback);
    })
      .each(function(fileName) {
        return Promise.fromNode(function(callback) {
          fs.readFile(fileName, { encoding: 'utf8' }, callback);
        })
          .then(function(content) {
            return self._parseSvg(
              pathLib.basename(fileName, pathLib.extname(fileName)),
              content,
              options
            );
          });
      })
    ;

    return promise;
  },

  save: function(options) {
    var
      promise,
      dir,
      self = this;

    options = options || {};
    dir = options.outSvg || '';

    promise = Promise.resolve(this._collection)
      .each(function(entity) {
        var
          fileName = pathLib.normalize(pathLib.join(dir, entity.name) + '.svg')
        ;

        return Promise.resolve(self._buildSvg(entity.svg, options))
          .then(function(svg) {
            return Promise.fromNode(function(callback) {
              fs.writeFile(fileName, svg, { encoding: 'utf8' }, callback);
            })
          });
      });

    return promise;
  },

  getCollection: function() {
    return this._collection;
  },

  setCollection: function(collection) {
    if (!Array.isArray(collection)) {
      return;
    }
    this._collection.length = 0;
    Array.prototype.push.apply(this._collection, collection);
  },

  _parseSvg: function(name, content, options) {
    var
      svgDoc,
      element,
      defaultAttributes,
      width,
      height;

    svgDoc = cheerio.load(content, {
      xmlMode: true,
      decodeEntities: true,
      normalizeWhitespace: true
    });
    element = svgDoc('svg')
      .first();

    defaultAttributes = {
      xmlns: 'http://www.w3.org/2000/svg'
    };

    Object.keys(defaultAttributes)
      .forEach(function(name) {
        if (!element.attr(name)) {
          element.attr(name, defaultAttributes[name]);
        }
      });

    if (!element.attr('viewBox')) {
      width = element.attr('width');
      height = element.attr('height');
      if (typeof width != 'undefined' && typeof height != 'undefined') {
        element.attr('viewBox', '0 0 ' + parseFloat(width) + ' ' + parseFloat(height));
      }
    }

    this._collection.push({
      name: name,
      svg: svgDoc.html()
    });
  },

  _buildSvg: function(content, options) {
    return content;
  }

};