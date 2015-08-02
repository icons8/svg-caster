var
  fs = require('fs'),
  Promise = require('bluebird'),
  cssParser = require('css'),
  CssSelectorParser = require('css-selector-parser').CssSelectorParser
  ;

module.exports = FontCss;

function FontCss(options) {
  this._options = options || {};
}

FontCss.has = function(options) {
  return options && (options.fontCss || options.svgFontCss);
};

FontCss.prototype = {

  perform: function(collection, options) {
    var
      self = this,
      fontCssFileName;

    options = options || {};
    fontCssFileName = options.fontCss || options.svgFontCss;

    return Promise.fromNode(function(callback) {
      fs.readFile(fontCssFileName, { encoding: 'utf8' }, callback);
    })
      .then(function(content) {
        self._parseFontCss(collection, content, options);
        return collection;
      });

  },

  _parseFontCss: function(collection, content, options) {
    var
      map = {},
      cssTree,
      cssSelectorParser,
      cssSelectorPrefix,
      offset;

    options = options || {};
    cssSelectorPrefix = options.svgFontCssPrefix || options.fontCssPrefix || '';

    cssSelectorParser = new CssSelectorParser();
    cssSelectorParser.registerSelectorPseudos('has');
    cssSelectorParser.registerNestingOperators('>', '+', '~');
    cssSelectorParser.registerAttrEqualityMods('^', '$', '*', '~');
    cssSelectorParser.enableSubstitutes();

    offset = 0;
    collection.slice().forEach(function(glyph, index) {
      if (glyph.hasOwnProperty('code')) {
        map[glyph.code] = glyph;
        collection.splice(index + (offset--), 1);
      }
    });

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