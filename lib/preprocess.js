const _ = require('lodash');

const properties = [
  'id',
  'stage',
  'name',
  'live',
  'dj',
  'gig',
  'nationality',
  'label',
  'website',
  'facebook',
  'soundcloud',
  'mixcloud',
  'bandcamp',
  'myspace',
  'youtube',
  'bio',
  'photo'
];

module.exports = function preprocess(data) {
  return _.map(data, a => _.pickBy(a, (v, k) => _.includes(properties, k)));
}
