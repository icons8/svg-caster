var
  fs = require('fs'),
  Promise = require('bluebird'),
  globby = require('globby'),
  cheerio = require('cheerio')
  ;

module.exports = SvgSet;

function SvgSet(options) {
  this._options = options || {};
  this._collection = [];
}

SvgSet.has = function(options) {
  return options && options.svgSet;
};

SvgSet.prototype = {

  load: function(options) {
    var
      self = this,
      promise,
      pattern;

    options = options || {};
    pattern = options.svgSet || '';

    promise = Promise.fromNode(function(callback) {
      globby(pattern, { nodir: true }, callback);
    })
      .each(function(fileName) {
        return Promise.fromNode(function(callback) {
          fs.readFile(fileName, { encoding: 'utf8' }, callback);
        })
          .then(function(content) {
            return self._parseSvgSet(content, options);
          });
      })
    ;

    return promise;
  },

  getCollection: function() {
    return this._collection;
  },

  _parseSvgSet: function(content, options) {
    var
      collection = this._collection,
      svgSetDoc,
      viewBox,
      svgRoot,
      svgRootAttributes
    ;

    svgSetDoc = cheerio.load(content, {
      xmlMode: true,
      decodeEntities: true,
      normalizeWhitespace: true
    });

    svgRoot = svgSetDoc('svg')
      .first();

    viewBox = svgRoot.attr('viewBox');
    svgRootAttributes = svgRoot.get(0).attribs;

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
          svgElement = svgSetDoc('<svg xmlns="http://www.w3.org/2000/svg">');
          attributes = node.attribs;
          Object.keys(attributes).forEach(function(name) {
            svgElement.attr(name, attributes[name]);
          });
          element = svgElement.append(element.children());
        }
        else {
          element = svgSetDoc('<svg xmlns="http://www.w3.org/2000/svg">').append(element);
        }
      }

      Object.keys(svgRootAttributes)
        .forEach(function(attrName) {
          if (attrName.indexOf('xmlns:') == 0) {
            element[attrName] = svgRootAttributes[attrName];
          }
        });

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
        if (viewBox) {
          element.attr('viewBox', viewBox);
        }
        else {
          width = element.attr('width');
          height = element.attr('height');
          if (typeof width != 'undefined' && typeof height != 'undefined') {
            element.attr('viewBox', '0 0 ' + parseFloat(width) + ' ' + parseFloat(height));
          }
        }
      }

      return element;
    }

    svgRoot.find('[id]').each(function(index, element) {
      var
        name;
      element = svgSetDoc(element);
      name = element.attr('id');
      element = normalizeSvgElement(element);

      collection.push({
        name: name,
        svg: svgSetDoc.html(element)
      });
    });

  }

};