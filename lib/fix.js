const iconvlite = require('iconv-lite');
const entities = new require('html-entities').AllHtmlEntities;

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

    return url;
  }

  static text(str) {
    if (!str) {
      return;
    }

    // Fix bad DB encoding
    str = iconvlite.encode(str, 'windows-1252');
    str = iconvlite.decode(str, 'utf8');

    str = str
      .replace(/\r\n/g, '<br>')
      .replace(/\t/g, '');

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

}
