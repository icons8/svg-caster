var
  Promise = require('bluebird'),
  cheerio = require('cheerio'),
  svgBoundingBox = require('svg-bounding-box');

module.exports = CleanEmpty;

function CleanEmpty(options) {
  options = options || {};
}

CleanEmpty.has = function(options) {
  return options && (typeof options.empty != 'undefined' && !options.empty);
};

CleanEmpty.prototype = {

  perform: function(collection) {
    return Promise.resolve(collection)
      .filter(function(entity) {
        var
          doc,
          hasVisibleStrokes;

        if (!entity.hasOwnProperty('svg')) {
          return false;
        }

        return svgBoundingBox(entity.svg)
          .then(function(boundingBox) {
            if (boundingBox.width || boundingBox.height) {
              return true;
            }

            if (!/stroke/i.test(entity.svg)) {
              return false;
            }

            doc = cheerio.load(entity.svg, {
              xmlMode: true,
              decodeEntities: true,
              normalizeWhitespace: true
            });

            hasVisibleStrokes = false;
            doc('[stroke]').each(function(index, node) {
              var
                stroke = doc(node).attr('stroke');

              if (!hasVisibleStrokes && stroke && stroke != 'none') {
                hasVisibleStrokes = true;
              }
            });

            return hasVisibleStrokes;

          });
      });

  }
};