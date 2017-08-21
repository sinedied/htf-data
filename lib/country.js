const Fuse = require('fuse.js');
const _ = require('lodash');

const countries = require('./data/countries.json');
const fuse = new Fuse(_.map(countries, (code, name) => {
  return {
    name,
    code
  }
}), {
  shouldSort: true,
  threshold: 0.6,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 2,
  keys: ['name'],
  id: 'code'
});

module.exports = function findCountryCode(country) {
  if (!country) {
    return null;
  }
  const countries = country.split('/').map(c => c ? c.trim() : c);
  if (countries.length === 2) {
    // 2 countries
    const codes1 = fuse.search(countries[0]);
    const codes2 = fuse.search(countries[1]);
    if (codes1.length && codes2.length) {
      return `${codes1[0]}, ${codes2[0]}`;
    }
  } else {
    // 1 country
    const codes = fuse.search(country);
    if (codes.length) {
      return codes[0];
    }
  }
  return null;
}
