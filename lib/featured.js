const Fuse = require('fuse.js');

const featuredRegexp = /^\s*?(.*?)\s*?\n/gm;

module.exports = class Featured {
  static import(featuredArtists, htfData) {
    if (!featuredArtists) {
      return;
    }
    const fuse = new Fuse(htfData.artists, {
      shouldSort: true,
      threshold: 0.6,
      location: 0,
      distance: 10,
      maxPatternLength: 32,
      minMatchCharLength: 2,
      keys: ['name']
    });

    let artists = [];
    let match = null;
    while ((match = featuredRegexp.exec(featuredArtists))) {
      const name = match[1];
      const artist = fuse.search(name)[0];
      if (!artist) {
        throw new Error(`Cannot find artist ${name} from featured!`);
      }
      artists.push(artist.id);
    }
    htfData.featuredArtistIds = artists;
    console.log(`Found ${artists.length} featured artists`);
  }
}
