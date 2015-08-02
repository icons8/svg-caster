var
  Promise = require('bluebird'),
  cheerio = require('cheerio'),
  ColorString = require('color-string');

module.exports = CleanColor;

function CleanColor(options) {
  options = options || {};
}

CleanColor.has = function(options) {
  return options && (typeof options.color != 'undefined' && !options.color);
};

CleanColor.prototype = {

  perform: function(collection) {
    return Promise.resolve(collection)
      .map(function(entity) {
        var
          doc;

        if (!entity.hasOwnProperty('svg')) {
          return entity;
        }

        if (!/fill|stroke/i.test(entity.svg)) {
          return entity;
        }

        doc = cheerio.load(entity.svg, {
          xmlMode: true,
          decodeEntities: true,
          normalizeWhitespace: true
        });

        doc('[stroke],[fill]').each(function(index, node) {
          var
            stroke,
            fill,
            element,
            rgba;

          element = doc(node);
          stroke = element.attr('stroke');
          fill = element.attr('fill');

          if (stroke && stroke != 'none') {
            rgba = ColorString.getRgba(stroke);
            if ((rgba[0] == 255 && rgba[1] == 255 && rgba[2] == 255) || rgba[3] == 0) {
              element.remove();
              return;
            }
          }
          if (fill && fill != 'none') {
            rgba = ColorString.getRgba(fill);
            if ((rgba[0] == 255 && rgba[1] == 255 && rgba[2] == 255) || rgba[3] == 0) {
              element.remove();
            }
          }
          else if (fill == 'none') {
            element.remove();
          }

        });

        doc('[stroke],[fill],[color],[stroke-width],[stroke-linejoin],[stroke-linecap],[opacity]').each(function(index, node) {
          doc(node)
            .removeAttr('stroke')
            .removeAttr('fill')
            .removeAttr('color')
            .removeAttr('stroke-width')
            .removeAttr('stroke-linejoin')
            .removeAttr('stroke-linecap')
            .removeAttr('opacity');
        });

        entity.svg = doc.html();

        return entity;
      });

  }
};