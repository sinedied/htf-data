const iconvlite = require('iconv-lite');
const entities = new require('html-entities').AllHtmlEntities;
const _ = require('lodash');

module.exports = class Fix {
  static url(url, site) {
    if (!url) {
      return null;
    }

    if (site && url.indexOf(site) === -1) {
      url = site + '/' + url;
    }

    if (url.indexOf('http:') === 0) {
      url = url.replace('http:', 'https:')
    } else if (url.indexOf('http') !== 0) {
      url = 'https://' + url;
    }

    url = url
      .replace('?fref=ts', '')
      .replace('//facebook.com', '//www.facebook.com')
      .replace('//mixcloud.com', '//www.mixcloud.com')
      .replace('m.facebook.com', 'www.facebook.com')
      .replace('m.soundcloud.com', 'soundcloud.com')

    if (site) {
      if (url.endsWith(site) || url.endsWith(site + '/')) {
        return null;
      }
    }

    return url;
  }

  static text(str) {
    if (!str) {
      return;
    }

    // Fix bad DB encoding (mojibake)
    str = iconvlite.encode(str, 'windows-1252');
    str = iconvlite.decode(str, 'utf8');

    str = str
      .replace(/\r\n/g, '<br>')
      .replace(/\t/g, '')
      // Fix lost unicode symbols
      .replace(/e�\?/g, 'é')
      .replace(/��\?/g, '”');

    str = unicodeDragon(str)
      .replace(/\uFFFD/g, '');

    // Removed garbage???
    str = encodeURIComponent(str)
      .replace(/%E2%80%A8/g, ' ');
    str = decodeURIComponent(str);
    str = entities.decode(str);

    return str.trim();
  }

  static name(str) {
    return str
      .toLowerCase()
      // Capitalize
      .replace(/\b\w/g, function (l) {
        return l.toUpperCase();
      })
      .replace('Dj', 'DJ')
      .replace(' Vs ', ' vs ');
  }

  static artist(artist, fixes) {
    const fix = _.find(fixes.artists, {id: artist.id});
    if (fix) {
      _.assign(artist, fix);
    }
    return artist;
  }

  static lineup(lineup, fixes) {
    const fix = _.find(fixes.lineup, {name: lineup.name});
    if (fix) {
      _.assign(lineup, fix);
    }
    return lineup;
  }
};

function unicodeDragon(string) {
  return string.replace(/[\uD800-\uDFFF]/g, function (chr, pos) {
      if (chr.charCodeAt(0) >= 0xD800 && chr.charCodeAt(0) <= 0xDBFF) {
          if (string.charCodeAt(pos + 1) >= 0xDC00 && string.charCodeAt(pos + 1) <= 0xDFFF) {
              return chr;
          } else {
              return "\uFFFD";
          }
      } else {
          if (string.charCodeAt(pos - 1) >= 0xD800 && string.charCodeAt(pos - 1) <= 0xDBFF) {
              return chr;
          } else {
              return "\uFFFD";
          }
      }
  });
}
