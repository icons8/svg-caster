var
  Promise = require('bluebird'),
  fs = require('fs'),
  dsv = require('d3-dsv').dsv;

module.exports = FontCodes;

function FontCodes(options) {
  options = options || {};
}

FontCodes.has = function(options) {
  return options && (options.fontCodesDsv || options.fontCodesCsv || options.fontCodesTsv);
};

FontCodes.prototype = {

  perform: function(collection, options) {
    var
      self = this,
      dsvFileName;

    options = options || {};
    dsvFileName = options.fontCodesDsv || options.fontCodesCsv || options.fontCodesTsv;

    return Promise.fromNode(function(callback) {
      fs.readFile(dsvFileName, { encoding: 'utf8' }, callback);
    })
      .then(function(content) {
        self._parseDsv(collection, content, options);
        return collection;
      });

  },

  _parseDsv: function(collection, content, options) {
    var
      map = {},
      offset,
      delimiter,
      parser;

    options = options || {};
    delimiter = options.fontCodesDsvDelimiter || (options.fontCodesTsv && '\t') || ',';

    offset = 0;
    collection.slice().forEach(function(glyph, index) {
      if (glyph.hasOwnProperty('code')) {
        map[glyph.code] = glyph;
        collection.splice(index + (offset--), 1);
      }
    });

    parser = dsv(delimiter);

    (parser.parseRows(content) || []).forEach(function(row) {
      var
        name,
        code;

      name = String(row[0] || '');
      code = String(row[1] || '');

      code = code.replace(/\\?([0-9a-f]{1,6})/ig, function(match, hex) {
        return fixedFromCharCode(parseInt(hex, 16));
      });

      while (code && !map.hasOwnProperty(code)) {
        code = code.slice(0, -1);
      }

      if (name && code) {
        collection.push({
          name: name,
          svg: map[code].svg
        });
      }
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