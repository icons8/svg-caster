var
  fs = require('fs'),
  Promise = require('bluebird'),
  globby = require('globby'),
  pathLib = require('path'),
  cheerio = require('cheerio')
  ;

module.exports = SvgSet;

function SvgSet(options) {
  this._options = options || {};

  this._collection = [];
}


SvgSet.prototype = {

  load: function(pattern) {
    var
      self = this,
      promise;

    promise = Promise.fromNode(function(callback) {
      globby(pattern, { nodir: true }, callback);
    })
      .each(function(fileName) {
        return Promise.fromNode(function(callback) {
          fs.readFile(fileName, { encoding: 'utf8' }, callback);
        })
          .then(function(content) {
            return self._parseSvgSet(content);
          });
      })
    ;

    return promise;
  },

  save: function(path) {
    var
      promise;

    promise = Promise.resolve(this._buildSvgSet())
      .then(function(svg) {
        var
          fileName = pathLib.join(
            pathLib.dirname(path),
            pathLib.basename(path, pathLib.extname(path))
          ) + '.svg'
          ;
        return Promise.fromNode(function(callback) {
          fs.writeFile(fileName, svg, { encoding: 'utf8' }, callback);
        })
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

  _parseSvgSet: function(content) {
    var
      collection = this._collection,
      document,
      viewBox,
      svg
    ;

    document = cheerio.load(content, {
      xmlMode: true,
      decodeEntities: true,
      normalizeWhitespace: true
    });

    svg = document('svg').first();
    viewBox = svg.attr('viewBox');

    function normalizeSvgElement(element) {
      var
        node,
        svgElement,
        attributes,
        defaultAttributes,
        width,
        height;

      [
        'id',
        'x',
        'y'
      ].forEach(function(attr) {
          element.removeAttr(attr);
        });

      node = element.get(0);
      if (node.tagName != 'svg') {
        if (node.tagName == 'symbol') {
          svgElement = document('<svg xmlns="http://www.w3.org/2000/svg">');
          attributes = node.attribs;
          Object.keys(attributes).forEach(function(name) {
            svgElement.attr(name, attributes[name]);
          });
          element = svgElement.append(document(node).children());
        }
        else {
          element = document('<svg xmlns="http://www.w3.org/2000/svg">').append(element);
        }
      }

      defaultAttributes = {
        xmlns: 'http://www.w3.org/2000/svg',
        version: '1.0'
      };

      Object.keys(defaultAttributes)
        .forEach(function(name) {
          if (!element.attr(name)) {
            element.attr(name, defaultAttributes[name]);
          }
        });

      if (!element.attr('viewBox')) {
        if (viewBox) {
          element.attr('viewBox', viewBox);
        }
        else {
          width = node.attr('width');
          height = node.attr('height');
          if (typeof width != 'undefined' && typeof height != 'undefined') {
            element.attr('viewBox', '0 0 ' + parseFloat(width) + ' ' + parseFloat(height));
          }
        }
      }

      return element;
    }

    svg.find('[id]').each(function(index, element) {
      var
        name;
      element = document(element);
      name = element.attr('id');
      element = normalizeSvgElement(element);

      collection.push({
        name: name,
        svg: document.html(element)
      });
    });

  },


  _buildSvgSet: function() {
    var
      document,
      root;

    document = cheerio.load('<svg xmlns="http://www.w3.org/2000/svg" version="1.0">');
    root = document('svg')
      .first();

    this._collection.forEach(function(entity) {
      var
        svgDocument,
        svgElement;

      svgDocument = cheerio.load(entity.svg);
      svgElement = svgDocument('svg')
        .first()
        .attr('id', entity.name);

      root.append(svgElement);
    });

    return document.html();
  }

};