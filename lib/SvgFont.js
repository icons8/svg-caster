var
  fs = require('fs'),
  Promise = require('bluebird'),
  SvgPath = require('svgpath'),
  cheerio = require('cheerio'),
  cssParser = require('css'),
  CssSelectorParser = require('css-selector-parser').CssSelectorParser
  ;

module.exports = SvgFont;

function SvgFont(options) {
  this._options = options || {};
  this._collection = [];
}

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
    // @see https://github.com/fontello/svg-font-dump/blob/ef8484a520100a07383cc75f967fad802c3e863d/svg-font-dump.js#L71
    var
      collection = this._collection,
      fontDoc = cheerio.load(content, {
        xmlMode: true,
        decodeEntities: true,
        normalizeWhitespace: true
      }),
      font = fontDoc('font').first(),
      fontFace = fontDoc('font-face').first(),
      glyphs = fontDoc('glyph'),

      horizAdvX = font.attr('horiz-adv-x'),
      ascent = fontFace.attr('ascent'),
      unitsPerEm = fontFace.attr('units-per-em') || horizAdvX || 1000;

    glyphs.each(function(index, glyph) {
      var
        d,
        unicode,
        name,
        width,
        height,
        code,
        svg;

      glyph = fontDoc(glyph);
      d = glyph.attr('d');

      // Now just ignore glyphs without image, however
      // that can be space. Does anyone needs it?
      if (!d) {
        return;
      }

      unicode = glyph.attr('unicode') || null;
      name = glyph.attr('glyph-name');

      if (!unicode && !name) {
        return;
      }

      if (unicode) {
        // Convert multibyte unicode char to number
        unicode = fixedCharCodeAt(unicode);
      }

      code = unicode
        ? unicode.toString(16)
        : name;

      name = name || code;

      d = new SvgPath(d)
        .translate(0, -ascent)
        .scale(1, -1)
        .abs()
        .round(1)
        .rel()
        .round(1)
        .toString();

      // Fix for FontForge: need space between old and new polyline
      d = d.replace(/zm/g, 'z m');

      width = glyph.attr('horiz-adv-x') || horizAdvX;

      width = parseFloat(width);
      height = unitsPerEm;

      svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg"><path d="' + d + '"/></svg>';

      collection.push({
        unicode: unicode,
        name: name,
        code: code,
        svg: svg
      });
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
