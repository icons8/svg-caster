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

  save: function(options) {
    var
      promise,
      path;

    options = options || {};
    path = options.outSvgSet || '';

    promise = Promise.resolve(this._buildSvgSet(options))
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

  _parseSvgSet: function(content, options) {
    var
      collection = this._collection,
      svgSetDoc,
      viewBox,
      svg
    ;

    svgSetDoc = cheerio.load(content, {
      xmlMode: true,
      decodeEntities: true,
      normalizeWhitespace: true
    });

    svg = svgSetDoc('svg').first();
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
      element = svgSetDoc(element);
      name = element.attr('id');
      element = normalizeSvgElement(element);

      collection.push({
        name: name,
        svg: svgSetDoc.html(element)
      });
    });

  },


  _buildSvgSet: function(options) {
    const
      PRETTY_SIZE = 24,
      PRETTY_PADDING = 3;

    var
      svgSetDoc,
      root,
      shorty,
      pretty,
      attributes,
      svgElementCollection = [];

    options = options || {};
    shorty = options.shorty;
    pretty = options.pretty;

    svgSetDoc = cheerio.load('<svg xmlns="http://www.w3.org/2000/svg">');
    root = svgSetDoc('svg')
      .first();

    this._collection.forEach(function(entity) {
      var
        parts,
        width,
        height,
        svgDoc,
        svgElement;

      svgDoc = cheerio.load(entity.svg, {
        xmlMode: true,
        decodeEntities: true,
        normalizeWhitespace: true
      });
      svgElement = svgDoc('svg')
        .first()
        .attr('id', entity.name);

      if (shorty) {
        attributes = svgElement.get(0).attribs;
        Object.keys(attributes)
          .filter(function(name) {
            return ['viewBox', 'id'].indexOf(name) == -1
          })
          .forEach(function(name) {
            svgElement.removeAttr(name);
          });
      }

      parts = (svgElement.attr('viewBox') || '').split(/\s+/);
      width = parseFloat(parts[2]);
      height = parseFloat(parts[3]);

      root.append(svgElement);
      svgElementCollection.push({
        width: width,
        height: height,
        element: svgElement
      });
    });

    function prettify() {
      var
        ratio,
        size,
        padding,
        columns;

      ratio = Math.sqrt(svgElementCollection.length);
      columns = Math.ceil(ratio);
      size = PRETTY_SIZE;
      padding = PRETTY_PADDING;

      svgElementCollection.forEach(function(entity, index) {
        var
          width = entity.width,
          height = entity.height,
          element = entity.element,
          x = index % columns,
          y = Math.floor(index / columns);

        x *= size + padding*2;
        y *= size + padding*2;
        x += padding;
        y += padding;


        if (height > width) {
          width = size * width / height;
          height = size;
          x += (size - width) / 2;
        }
        else {
          height = size * height / width;
          width = size;
          y += (size - height) / 2;
        }

        element.attr('width', width.toFixed(0));
        element.attr('height', height.toFixed(0));
        element.attr('x', x.toFixed(0));
        element.attr('y', y.toFixed(0));
      });

      root.attr('width', Math.ceil(ratio) * (size + padding*2) + padding*2);
      root.attr('height', Math.ceil(ratio) * (size + padding*2) + padding*2);
    }

    if (pretty && svgElementCollection.length > 0) {
      prettify();
    }

    return svgSetDoc.html();
  }

};