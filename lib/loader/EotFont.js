var
  fs = require('fs'),
  Promise = require('bluebird'),
  bufferToArrayBuffer = require('b3b').bufferToArrayBuffer,
  SvgFont = require('./SvgFont'),
  ttf2svg = require('fonteditor-core').ttf2svg,
  eot2ttf = require('fonteditor-core').eot2ttf
  ;

module.exports = EotFont;

function EotFont(options) {
  this._options = options || {};
  this._collection = [];
}

EotFont.has = function(options) {
  return options && options.eotFont;
};

EotFont.prototype = {

  load: function(options) {
    var
      self = this,
      promise,
      fontFileName,
      svgFontLoader;

    options = options || {};
    fontFileName = options.eotFont;

    svgFontLoader = new SvgFont(this._options);

    promise = Promise.fromNode(function(callback) {
      fs.readFile(fontFileName, callback);
    })
      .then(function(content) {
        var
          svgFontContent;

        svgFontContent = ttf2svg(eot2ttf(bufferToArrayBuffer(content)));
        svgFontLoader._parseFont(svgFontContent, options);

        Array.prototype.push.apply(
          self._collection,
          svgFontLoader._collection
        );
      });

    return promise;
  },

  getCollection: function() {
    return this._collection;
  }


};
