var
  Promise = require('bluebird'),
  cheerio = require('cheerio'),
  crypto = require('crypto');

module.exports = IdUniquifier;

function IdUniquifier(options) {
  options = options || {};
}

IdUniquifier.has = function(options) {
  return options && options.idUniquify;
};

IdUniquifier.prototype = {

  perform: function(entity) {
    var
      self = this,
      promise;

    promise = Promise.resolve(entity);

    if (Array.isArray(entity)) {
      return promise
        .each(function(entity) {
          return self.perform(entity);
        });
    }

    if (entity.svg) {
      promise = promise.then(function(entity) {
        return self._performUniquify(entity);
      })
    }

    return promise;
  },

  _performUniquify: function(entity) {
    var
      identifiedElements,
      idMap,
      doc;

    function createUniqueById(id) {
      var
        shasum = crypto.createHash('sha1');
      shasum.update(
        [
          id,
          entity.name,
          entity.svg
        ].join('ø')
      );

      return '_' + shasum.digest('base64').replace(/[+/=]/g, '').slice(0, 7);
    }

    doc = cheerio.load(entity.svg, {
      xmlMode: true,
      decodeEntities: true,
      normalizeWhitespace: true
    });

    idMap = {};
    identifiedElements = doc('[id]');
    if (identifiedElements.length == 0) {
      return entity;
    }

    identifiedElements.each(function(index, element) {
      var
        id;

      element = doc(element);
      id = element.attr('id');
      if (!idMap.hasOwnProperty(id)) {
        idMap[id] = createUniqueById(id);
      }
      element.attr('id', idMap[id]);
    });

    doc('*').each(function(index, element) {
      var
        attrs = element.attribs;

      element = doc(element);
      Object.keys(attrs).forEach(function(name) {
        var
          value,
          match,
          parsedId;

        value = String(attrs[name] || '');
        if (name == 'xlink:href') {
          match = value.match(/^\s*#([^\s#]+)\s*$/);
          parsedId = match && match[1];
          if (!parsedId || !idMap.hasOwnProperty(parsedId)) {
            element.removeAttr(name);
          }
          else {
            element.attr(name, '#' + idMap[parsedId]);
          }
        }
        else if (/url\s*\(/i.test(value)){
          match = value.match(/^\s*url\s*\(\s*#([^\s#)]+)\s*\)\s*$/i);
          parsedId = match && match[1];
          if (!parsedId || !idMap.hasOwnProperty(parsedId)) {
            element.removeAttr(name);
          }
          else {
            element.attr(name, 'url(#' + idMap[parsedId] + ')');
          }
        }
      });

    });

    entity.svg = doc.html();
    return entity
  }

};