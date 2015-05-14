var
  fs = require('fs'),
  Promise = require('bluebird'),
  globby = require('globby'),
  pathLib = require('path')
  ;

module.exports = Svg;

function Svg(options) {
  this._options = options || {};

  this._collection = [];
}


Svg.prototype = {

  load: function(pattern) {
    var
      self = this,
      promise;

    promise = Promise.fromNode(function(callback) {
      globby(pattern, { nodir: true }, callback);
    })
      .each(function(fileName) {
        return Promise.fromNode(function(callback) {
          fs.readFile(fileName, { encoding: 'utf8' }, callback);
        })
          .then(function(content) {
            return self._parseSvg(
              pathLib.basename(fileName, pathLib.extname(fileName)),
              content
            );
          });
      })
    ;

    return promise;
  },

  save: function(path) {
    var
      promise;

    promise = Promise.resolve(this._collection)
      .each(function(entity) {
        var
          fileName = pathLib.normalize(pathLib.join(path, entity.name) + '.svg')
        ;
        return Promise.fromNode(function(callback) {
          fs.writeFile(fileName, entity.svg, { encoding: 'utf8' }, callback);
        })
      });

    return promise;
  },

  getCollection: function() {
    return this._collection;
  },

  setCollection: function(collection) {
    if (!Array.isArray(collection)) {
      return;
    }
    this._collection.length = 0;
    Array.prototype.push.apply(this._collection, collection);
  },

  _parseSvg: function(name, content) {
    this._collection.push({
      name: name,
      svg: content
    });
  }

};