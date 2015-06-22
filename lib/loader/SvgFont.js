var
  fs = require('fs'),
  Promise = require('bluebird'),
  SvgPath = require('svgpath'),
  cheerio = require('cheerio'),
  cssParser = require('css'),
  CssSelectorParser = require('css-selector-parser').CssSelectorParser,
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
      fontFileName,
      fontCssFileName;

    options = options || {};
    fontFileName = options.svgFont;
    fontCssFileName = options.svgFontCss;

    promise = Promise.fromNode(function(callback) {
      fs.readFile(fontFileName, { encoding: 'utf8' }, callback);
    })
      .then(function(content) {
        return self._parseFont(content, options);
      });

    if (fontCssFileName) {
      promise = promise.then(function() {
        return Promise.fromNode(function(callback) {
          fs.readFile(fontCssFileName, { encoding: 'utf8' }, callback);
        })
          .then(function(content) {
            return self._parseFontCss(content, options);
          });
      })
    }

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

  },

  _parseFontCss: function(content, options) {
    var
      collection,
      map = {},
      cssTree,
      cssSelectorParser,
      cssSelectorPrefix;

    options = options || {};
    cssSelectorPrefix = options.svgFontCssPrefix || '';

    cssSelectorParser = new CssSelectorParser();
    cssSelectorParser.registerSelectorPseudos('has');
    cssSelectorParser.registerNestingOperators('>', '+', '~');
    cssSelectorParser.registerAttrEqualityMods('^', '$', '*', '~');
    cssSelectorParser.enableSubstitutes();

    collection = this._collection;
    collection.forEach(function(glyph) {
      map[glyph.code] = glyph;
    });
    collection.length = 0;

    cssTree = cssParser.parse(content);
    cssTree.stylesheet.rules
      .filter(function(rule) {
        return rule.type == 'rule' && Array.isArray(rule.declarations);
      })
      .forEach(function(rule) {
        rule.declarations
          .filter(function(declaration) {
            return declaration.property == 'content' && declaration.value;
          })
          .forEach(function(declaration) {
            var
              match,
              glyph,
              code,
              value;

            match = declaration.value.match(/^["'\s]*([^"'\s]*)/i);
            value = match
              ? match[1]
              : '';

            code = value.replace(/\\([0-9a-f]{1,6})/ig, function(match, hex) {
              return fixedFromCharCode(parseInt(hex, 16));
            });

            while (code && !map.hasOwnProperty(code)) {
              code = code.slice(0, -1);
            }

            if (code) {
              glyph = map[code];

              rule.selectors.forEach(function(selector) {
                var
                  rule,
                  classNames,
                  className,
                  filtered;

                rule = cssSelectorParser.parse(selector);
                while (rule) {
                  if (rule.rule) {
                    rule = rule.rule;
                    continue;
                  }
                  classNames = rule.classNames || [];
                  break;
                }

                filtered = classNames
                  .filter(function(className) {
                    return className.slice(0, cssSelectorPrefix.length) === cssSelectorPrefix;
                  })
                  .map(function(className) {
                    return className.slice(cssSelectorPrefix.length);
                  });

                if (!filtered.length) {
                  filtered = classNames;
                }
                className = filtered.slice(-1)[0];
                if (!className) {
                  return;
                }

                collection.push({
                  name: className,
                  svg: glyph.svg
                });
              })
            }
          });
      });
  }

};

// @see https://github.com/fontello/svg-font-dump/blob/ef8484a520100a07383cc75f967fad802c3e863d/svg-font-dump.js#L41
// Int to char, with fix for big numbers
// see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/fromCharCode
//
function fixedFromCharCode(code) {
  /*jshint bitwise: false*/
  if (code > 0xffff) {
    code -= 0x10000;

    var surrogate1 = 0xd800 + (code >> 10)
      , surrogate2 = 0xdc00 + (code & 0x3ff);

    return String.fromCharCode(surrogate1, surrogate2);
  } else {
    return String.fromCharCode(code);
  }
}