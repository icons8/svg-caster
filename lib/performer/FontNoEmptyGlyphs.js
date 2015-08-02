var
  Promise = require('bluebird'),
  svgPathBoundingBox = require('svg-path-bounding-box');

module.exports = FontNoEmptyGlyphs;

function FontNoEmptyGlyphs(options) {
  options = options || {};
}

FontNoEmptyGlyphs.has = function(options) {
  return options && options.fontNoEmptyGlyphs;
};

FontNoEmptyGlyphs.prototype = {

  perform: function(collection) {
    return Promise.resolve(
      collection.filter(function(entity) {
        var
          pathBoundingBox;

        if (!entity.hasOwnProperty('path')) {
          return true;
        }

        pathBoundingBox = svgPathBoundingBox(entity.path);

        return pathBoundingBox.width && pathBoundingBox.height;
      })
    );
  }
};