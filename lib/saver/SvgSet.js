var
  fs = require('fs'),
  Promise = require('bluebird'),
  Path = require('path'),
  cheerio = require('cheerio')
  ;

module.exports = SvgSet;

function SvgSet(options) {
  this._options = options || {};
  this._collection = [];
}

SvgSet.has = function(options) {
  return options && options.outSvgSet;
};

SvgSet.prototype = {

  save: function(options) {
    var
      promise,
      path;

    options = options || {};
    path = options.outSvgSet || '';

    promise = Promise.resolve(this._buildSvgSet(options))
      .then(function(svg) {
        var
          fileName = Path.join(
            Path.dirname(path),
            Path.basename(path, Path.extname(path))
          ) + '.svg'
          ;
        return Promise.fromNode(function(callback) {
          fs.writeFile(fileName, svg, { encoding: 'utf8' }, callback);
        })
      });

    return promise;
  },

  setCollection: function(collection) {
    if (!Array.isArray(collection)) {
      return;
    }
    this._collection.length = 0;
    Array.prototype.push.apply(this._collection, collection);
  },

  _buildSvgSet: function(options) {
    const
      PRETTY_SIZE = 24,
      PRETTY_PADDING = 3;

    var
      svgSetDoc,
      root,
      defs,
      views,
      pretty,
      attributes,
      svgSetAttributes = {},
      symbolCollection = [];

    options = options || {};
    pretty = options.pretty;

    svgSetDoc = cheerio.load('<svg xmlns="http://www.w3.org/2000/svg">');
    root = svgSetDoc('svg').first();

    defs = svgSetDoc('<defs />');
    root.append(defs);

    this._collection.forEach(function(entity) {
      var
        parts,
        width,
        height,
        svgDoc,
        svgElement,
        symbolElement,
        viewBox;

      svgDoc = cheerio.load(entity.svg, {
        xmlMode: true,
        decodeEntities: true,
        normalizeWhitespace: true
      });

      svgElement = svgDoc('svg').first();

      attributes = svgElement.get(0).attribs;
      Object.keys(attributes)
        .forEach(function(attrName) {
          if (attrName.indexOf('xmlns:') == 0) {
            svgSetAttributes[attrName] = attributes[attrName];
          }
        });
      viewBox = svgElement.attr('viewBox');

      symbolElement = svgDoc('<symbol />')
        .attr('id', entity.name)
        .attr('viewBox', viewBox);

      symbolElement.append(svgElement.children());

      parts = (viewBox || '').split(/\s+/);
      width = parseFloat(parts[2]);
      height = parseFloat(parts[3]);

      defs.append(symbolElement);
      symbolCollection.push({
        width: width,
        height: height,
        name: entity.name,
        element: symbolElement
      });
    });

    if (pretty && !svgSetAttributes.hasOwnProperty('xmlns:xlink')) {
      svgSetAttributes['xmlns:xlink'] = 'http://www.w3.org/1999/xlink';
    }

    Object.keys(svgSetAttributes)
      .forEach(function(attrName) {
        root.attr(attrName, svgSetAttributes[attrName]);
      });

    function prettify() {
      var
        ratio,
        size,
        padding,
        columns,
        count;

      ratio = Math.sqrt(symbolCollection.length);
      columns = Math.ceil(ratio);
      size = PRETTY_SIZE;
      padding = PRETTY_PADDING;
      count = symbolCollection.length;

      symbolCollection.forEach(function(entity, index) {
        var
          width = entity.width,
          height = entity.height,
          name = entity.name,
          element,
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

        element = svgSetDoc('<use />');
        element.attr('xlink:href', '#' + name);
        element.attr('width', width.toFixed(0));
        element.attr('height', height.toFixed(0));
        element.attr('x', x.toFixed(0));
        element.attr('y', y.toFixed(0));
        views.append(element);
      });

      root.attr('width', columns * (size + padding*2));
      root.attr('height', Math.ceil(count / columns) * (size + padding*2));
    }

    if (pretty && symbolCollection.length > 0) {
      views = svgSetDoc('<g />');
      root.append(views);

      prettify();
    }

    return svgSetDoc.html();
  }

};