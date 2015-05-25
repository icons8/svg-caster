var
  fs = require('fs'),
  Promise = require('bluebird'),
  globby = require('globby'),
  Path = require('path'),
  cheerio = require('cheerio')
  ;

module.exports = Svg;

function Svg(options) {
  this._options = options || {};
  this._collection = [];
}

Svg.has = function(options) {
  return options && options.svg;
};

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
              Path.basename(fileName, Path.extname(fileName)),
              content,
              options
            );
          });
      })
    ;

    return promise;
  },

  getCollection: function() {
    return this._collection;
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
  }

};