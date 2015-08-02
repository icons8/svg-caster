var
  fs = require('fs'),
  Promise = require('bluebird'),
  bufferToArrayBuffer = require('b3b').bufferToArrayBuffer,
  SvgFont = require('./SvgFont'),
  ttf2svg = require('fonteditor-core').ttf2svg
  ;

module.exports = TtfFont;

function TtfFont(options) {
  this._options = options || {};
  this._collection = [];
}

TtfFont.has = function(options) {
  return options && options.ttfFont;
};

TtfFont.prototype = {

  load: function(options) {
    var
      self = this,
      promise,
      fontFileName,
      svgFontLoader;

    options = options || {};
    fontFileName = options.ttfFont;

    svgFontLoader = new SvgFont(this._options);

    promise = Promise.fromNode(function(callback) {
      fs.readFile(fontFileName, callback);
    })
      .then(function(content) {
        var
          svgFontContent;

        svgFontContent = ttf2svg(bufferToArrayBuffer(content));
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
