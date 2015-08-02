var
  fs = require('fs'),
  Promise = require('bluebird'),
  SvgPath = require('svgpath'),
  cheerio = require('cheerio'),
  svgPathBoundingBox = require('svg-path-bounding-box'),
  svgNumbers = require('svg-numbers')
  ;

module.exports = SvgFont;

function SvgFont(options) {
  this._options = options || {};
  this._collection = [];
}

SvgFont.has = function(options) {
  return options && options.svgFont;
};

SvgFont.prototype = {

  load: function(options) {
    var
      self = this,
      promise,
      fontFileName;

    options = options || {};
    fontFileName = options.svgFont;

    promise = Promise.fromNode(function(callback) {
      fs.readFile(fontFileName, { encoding: 'utf8' }, callback);
    })
      .then(function(content) {
        return self._parseFont(content, options);
      });

    return promise;
  },

  getCollection: function() {
    return this._collection;
  },

  _parseFont: function(content, options) {
    var
      collection = this._collection,
      minY,
      maxY,
      offsetTop,
      elements = [],

      fontDoc = cheerio.load(content, {
        xmlMode: true,
        decodeEntities: true,
        normalizeWhitespace: true
      }),
      font = fontDoc('font').first(),
      fontFace = fontDoc('font-face').first(),
      glyphs = fontDoc('glyph'),

      height = +fontFace.attr('units-per-em') || 1000,
      ascent = +fontFace.attr('ascent'),

      bbox = svgNumbers(font.attr('bbox') || ''),

      horizOriginX = (+font.attr('horiz-origin-x') || 0) + (+bbox[0] || 0),
      horizOriginY = (+font.attr('horiz-origin-y') || 0) + (+bbox[1] || 0),
      horizAdvX = +font.attr('horiz-adv-x') || height
      ;

    minY = maxY = 0;

    glyphs.each(function(i, glyph) {
      var
        d,
        unicode,
        name,
        width,
        pathBoundingBox;

      glyph = fontDoc(glyph);
      d = glyph.attr('d');

      if (!d) {
        return;
      }

      unicode = glyph.attr('unicode') || null;
      name = glyph.attr('glyph-name');

      if (!unicode && !name) {
        return;
      }

      function isReadableText(text) {
        return /^[a-z0-9][-a-z0-9_]*$/.test(text);
      }

      name = name && isReadableText(name) && !isReadableText(unicode)
        ? name
        : unicode;

      d = new SvgPath(d)
        .translate(-horizOriginX, -horizOriginY) // move to origin (0, 0) in font coordinates
        .translate(0, -ascent) // move below x-axis
        .scale(1, -1) // invert y-axis (font coordinates -> initial coordinates)
        .toString();

      width = +glyph.attr('horiz-adv-x') || horizAdvX;

      pathBoundingBox = svgPathBoundingBox(d);

      minY = Math.min(minY, pathBoundingBox.y1);
      maxY = Math.max(maxY, pathBoundingBox.y2);

      elements.push({
        name: name,
        code: unicode,
        width: width,
        path: d,
        pathBoundingBox: pathBoundingBox
      });
    });

    offsetTop = minY < 0
      ? -minY
      : 0;

    if (maxY > height) {
      height = maxY;
    }
    height += offsetTop;

    elements.forEach(function(element) {
      var
        pathDriver,
        width,
        offsetLeft,
        pathBoundingBox;

      pathDriver = new SvgPath(element.path);

      pathBoundingBox = element.pathBoundingBox;
      offsetLeft = -Math.min(0, pathBoundingBox.x1);

      width = element.width;
      if (pathBoundingBox.x2 > width) {
        width = pathBoundingBox.x2;
      }
      width += offsetLeft;

      element.width = width;
      element.height = height;

      if (offsetTop || offsetLeft) {
        pathDriver.translate(offsetLeft, offsetTop);
      }
      element.path = pathDriver
        .round(4)
        .rel()
        .toString();

      element.svg = '<svg viewBox="0 0 ' +
        (+element.width.toFixed(4)) +
        ' ' +
        (+element.height.toFixed(4)) +
        '" xmlns="http://www.w3.org/2000/svg"><path d="' +
        element.path +
        '"/></svg>';

      collection.push(element);

    });

  }

};