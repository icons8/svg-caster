var
  fs = require('fs'),
  Promise = require('bluebird'),
  SvgPath = require('svgpath'),
  cheerio = require('cheerio'),
  cssParser = require('css'),
  CssSelectorParser = require('css-selector-parser').CssSelectorParser,
  svgPathBoundingBox = require('svg-path-bounding-box')
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
      minX,
      maxX,
      minY,
      maxY,
      offsetTop,
      offsetBottom,
      offsetLeft,
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

      horizOriginX = +font.attr('horiz-origin-x') || 0,
      horizOriginY = +font.attr('horiz-origin-y') || 0,
      horizAdvX = +font.attr('horiz-adv-x') || height
      ;

    minY = maxY = minX = maxX = 0;

    glyphs.each(function(i, glyph) {
      var
        d,
        unicode,
        name,
        width,
        code,
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

      if (unicode) {
        unicode = fixedCharCodeAt(unicode);
      }

      code = unicode
        ? unicode.toString(16)
        : name;

      name = name || code;

      d = new SvgPath(d)
        .translate(-horizOriginX, -horizOriginY) // move to origin (0, 0) in font coordinates
        .translate(0, -ascent) // move below x-axis
        .scale(1, -1) // invert y-axis (font coordinates -> initial coordinates)
        .toString();

      width = +glyph.attr('horiz-adv-x') || horizAdvX;

      pathBoundingBox = svgPathBoundingBox(d);

      minX = Math.min(minX, pathBoundingBox.x1);
      maxX = Math.max(maxX, pathBoundingBox.x2);
      minY = Math.min(minY, pathBoundingBox.y1);
      maxY = Math.max(maxY, pathBoundingBox.y2);

      elements.push({
        unicode: unicode,
        name: name,
        code: code,
        width: width,
        path: d,
        pathBoundingBox: pathBoundingBox
      });
    });

    offsetTop = minY < 0
      ? -minY
      : 0;

    offsetBottom = maxY > height
      ? maxY - height
      : 0;

    height += offsetBottom + offsetTop;

    offsetLeft = minX < 0
      ? -minX
      : 0;

    elements.forEach(function(element) {
      var
        pathDriver,
        width;

      pathDriver = new SvgPath(element.path);
      if (offsetTop || offsetLeft) {
        pathDriver.translate(offsetLeft, offsetTop);
      }
      element.path = pathDriver
        .round(4)
        .rel()
        .toString();

      width = element.width;
      if (maxX > width) {
        width = maxX;
      }
      width += offsetLeft;

      element.width = width;
      element.height = height;

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
              code = null,
              value;

            match = declaration.value.match(/^["'\s]*([^"'\s]*)/i);
            value = match
              ? match[1]
              : '';

            match = value.match(/^\\?([0-9a-f]+)$/i);
            if (match) {
              code = match[1];
            }
            else if (value.length == 2) {
              code = fixedCharCodeAt(value).toString(16);
            }

            if (code) {
              if (!map.hasOwnProperty(code)) {
                return;
              }
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

function fixedCharCodeAt(chr) {
  // @see https://github.com/fontello/svg-font-dump/blob/ef8484a520100a07383cc75f967fad802c3e863d/svg-font-dump.js#L54
  var
    char1 = chr.charCodeAt(0),
    char2 = chr.charCodeAt(1);

  if ((chr.length >= 2) &&
    ((char1 & 0xfc00) === 0xd800) &&
    ((char2 & 0xfc00) === 0xdc00)) {
    return 0x10000 + ((char1 - 0xd800) << 10) + (char2 - 0xdc00);
  }
  else {
    return char1;
  }
}
