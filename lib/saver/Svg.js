var
  fs = require('fs'),
  Promise = require('bluebird'),
  Path = require('path')
  ;

module.exports = Svg;

function Svg(options) {
  this._options = options || {};
  this._collection = [];
}

Svg.has = function(options) {
  return options && options.outSvg;
};

Svg.prototype = {

  save: function(options) {
    var
      promise,
      dir,
      self = this;

    options = options || {};
    dir = options.outSvg || '';

    promise = Promise.resolve(this._collection)
      .each(function(entity) {
        var
          fileName = Path.normalize(Path.join(dir, entity.name) + '.svg')
        ;

        return Promise.resolve(self._buildSvg(entity.svg, options))
          .then(function(svg) {
            return Promise.fromNode(function(callback) {
              fs.writeFile(fileName, svg, { encoding: 'utf8' }, callback);
            })
          });
      });

    return promise;
  },

  setCollection: function(collection) {
    if (!Array.isArray(collection)) {
      return;
    }
    this._collection.length = 0;
    Array.prototype.push.apply(this._collection, collection);
  },

  _buildSvg: function(content, options) {
    return content;
  }

};