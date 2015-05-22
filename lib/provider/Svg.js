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
    this._collection.push({
      name: name,
      svg: content
    });
  },

  _buildSvg: function(content, options) {
    var
      svgDoc,
      shorty,
      svgElement,
      attributes,
      defaultAttributes;

    options = options || {};
    shorty = options.shorty;

    svgDoc = cheerio.load(content, {
      xmlMode: true,
      decodeEntities: true,
      normalizeWhitespace: true
    });
    svgElement = svgDoc('svg')
      .first();

    if (shorty) {
      attributes = svgElement.get(0).attribs;
      Object.keys(attributes)
        .filter(function(name) {
          return ['viewBox'].indexOf(name) == -1
        })
        .forEach(function(name) {
          svgElement.removeAttr(name);
        });
    }

    defaultAttributes = {
      xmlns: 'http://www.w3.org/2000/svg'
    };

    Object.keys(defaultAttributes)
      .forEach(function(name) {
        if (!svgElement.attr(name)) {
          svgElement.attr(name, defaultAttributes[name]);
        }
      });

    if (content.indexOf('xlink:') != -1) {
      svgElement.attr('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    }

    return svgDoc.html();
  }

};