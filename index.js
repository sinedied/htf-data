'use strict';

const minimist = require('minimist');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const iconvlite = require('iconv-lite');
const popsicle = require('popsicle')
const entities = new require('html-entities').AllHtmlEntities;
const franc = require('franc');
const _ = require('lodash');

const pkg = require('./package.json');
const findCountryCode = require('./lib/country');
const preprocess = require('./lib/preprocess');

const artistPicturesBaseUrl = 'http://www.hadra.net/HTF2017/ph_artists/';
const artistImagesFolder = 'artists';
const imagesPrefix = 'images/artists/';

const help =
`${chalk.bold('Usage:')} htf <db_export.json> [options]
Process Hadra Trance Festival database export into valid data for the app.

${chalk.bold('Options:')}
  -p, --preprocess         Preprocess database extract (removes extra data)
  -o, --out <folder>       Data output folder [default: dist]
  -f, --fixes <file.json>  Data fixes         [default: fixes.json]
`;

class Htf {
  constructor(args) {
    this._args = minimist(args, {
      boolean: ['help', 'version', 'verbose', 'preprocess'],
      string: ['out', 'fixes'],
      alias: {
        v: 'verbose',
        h: 'help',
        o: 'out',
        f: 'fixes',
        p: 'preprocess'
      },
      default: {
        out: 'dist',
        fixes: 'fixes.json'
      }
    });
  }

  run() {
    if (this._args.help) {
      this._exit(help, 0);
    } else if (this._args.version) {
      this._exit(pkg.version, 0);
    } else if (this._args._.length === 1) {
      if (this._args.preprocess) {
        this._preprocess(this._args._[0])
      } else {
        this._process(this._args._[0], this._args);
      }
    } else {
      this._exit(help);
    }
  }

  _preprocess(file) {
    file = path.resolve(file);
    const json = require(file);
    const cleanedJson = preprocess(json);
    fs.writeFileSync(file, JSON.stringify(cleanedJson, null, 2));
    console.log('Data preprocess successfull');
  }

  _process(file, options) {
    file = path.resolve(file);
    const out = path.resolve(options.out);
    const fixesFile = path.resolve(options.fixes);
    const imagesFolder = path.join(out, artistImagesFolder);
    fs.ensureDirSync(imagesFolder);

    const scenes = [
      {
        name: "Main",
        hide: false,
        sets: []
      },
      {
        name: "Alternative",
        hide: false,
        sets: []
      },
      {
        name: "Chillout",
        hide: false,
        sets: []
      }
    ];
    let artists = [];
    const json = require(file);
    let fixes = {};
    if (fs.existsSync(fixesFile)) {
      fixes = require(fixesFile);
    }

    const promises = [];
    const duplicates = {};
    let numPhotos = 0;
    let numBanners = 0;

    console.log(`Loaded ${json.length} artists`);

    json.forEach(a => {
      let artist = {};
      let buffer, filename, promise;

      // Fix encoding
      a.name = fixUnicode(a.name);
      a.bio = fixUnicode(a.bio);
      a.nationality = fixUnicode(a.nationality);
      a.label = fixUnicode(a.label);

      // Cleanup
      artist.id = '' + a.id;
      artist.name = fixName(a.name).trim();
      if (a.bio) {
        const lang = franc(a.bio);
        artist.bio = {};
        artist.bio[lang === 'eng' ? 'en' : 'fr'] = a.bio;
      }
      artist.country = findCountryCode(a.nationality);
      // artist.originalCountry = a.nationality;
      artist.label = a.label;
      artist.website = cleanUrl(a.website);
      artist.mixcloud = cleanUrl(fixUrl(a.mixcloud, 'mixcloud.com'));
      artist.soundcloud = cleanUrl(fixUrl(a.soundcloud, 'soundcloud.com'));
      artist.facebook = cleanUrl(fixUrl(a.facebook, 'facebook.com'));

      if (a.photo) {
        // let photoName = `photo-${artist.id}${path.extname(a.photo)}`;
        // const promise = getImage(artistPicturesBaseUrl + a.photo, path.join(imagesFolder, photoName))
        //   .catch(() => {
        //     // Retry with .jpg extension
        //     photoName = `photo-${artist.id}.jpg`;
        //     return getImage(artistPicturesBaseUrl + a.photo.replace('.jpeg', '.jpg'), path.join(imagesFolder, photoName));
        //   })
        //   .then(() => {
        //     numPhotos++;
        //     artist.photo = imagesPrefix + photoName;
        //   })
        //   .catch(err => {
        //     console.error(err);
        //   });
        // promises.push(promise);
        // buffer = new Buffer(artist.photo, 'base64');
        // filename = 'photo-' + artist.id + '.jpg';
        // fs.writeFileSync(path.join(imagesFolder, filename), buffer);
        // numPhotos++;
        // artist.photo = imagesPrefix + filename;
    // } else if (artist.facebook) {
    //   promise = getFacebookUserId(artist.facebook)
    //     .then(function(id) {
    //       return getFacebookPhoto(id);
    //     })
    //     .then(function(data) {
    //       console.log('Got ' + artist.name + '\'s photo from facebook');
    //       // var buffer = new Buffer(data, 'binary');
    //       var filename = 'photo-' + artist.id + '.jpg';
    //       fs.writeFileSync(path.join(imagesFolder, filename), data, 'binary');
    //       numPhotos++;
    //       artist.photo = imagesPrefix + filename;
    //     })
    //     .catch(function(err) {
    //       console.warn('Error, cannot get artist ' + artist.name + ' photo from facebook!');
    //       // console.warn('Error details: ' + err);
    //     })
    //   promises.push(promise);
      }

      if (a.banner) {
        // buffer = new Buffer(artist.banner, 'base64');
        // filename = 'banner-' + artist.id + '.jpg';
        // fs.writeFileSync(path.join(imagesFolder, filename), buffer);
        // numBanners++;
        // artist.banner = imagesPrefix + filename;
    // } else if (artist.facebook) {
    //   promise = getFacebookUserId(artist.facebook)
    //     .then(function(id) {
    //       return getFacebookCover(id);
    //     })
    //     .then(function(data) {
    //       console.log('Got ' + artist.name + '\'s cover from facebook');
    //       var filename = 'banner-' + artist.id + '.jpg';
    //       fs.writeFileSync(path.join(imagesFolder, filename), data, 'binary');
    //       numBanners++;
    //       artist.banner = imagesPrefix + filename;
    //     })
    //     .catch(function(err) {
    //       console.warn('Error, cannot get artist ' + artist.name + ' cover from facebook!');
    //     })
    //   promises.push(promise);
      }

      artist = applyArtistFix(artist, fixes);

      if (!artist.bio || (!artist.bio.fr && !artist.bio.en)) {
        console.warn(`Artist ${artist.name} does not have a bio! | ${artist.id}`);
      }

      // if (artist.website) {
      //   console.log(`Artist ${artist.name} has website`);
      // }

      if (!artist.photo) {
        console.warn(`Artist ${artist.name} does not have a photo! | ${artist.id}`);
      }

      if (!artist.banner) {
        console.warn(`Artist ${artist.name} does not have a banner! | ${artist.id}`);
      }

      let duplicate = _.find(artists, { name: artist.name });
      let skip = false;

      if (duplicate) {
        console.warn(`Duplicate artist ${artist.name} | ${artist.id}, ${duplicate.id}`);
        duplicates[artist.name] = duplicate;
        skip = true;
        console.log(`Fixed duplicate artist ${artist.name} | ${artist.id}, ${duplicate.id}`);
      }

      var duplicateInfos = _.find(artists, { facebook: artist.facebook });
      if (!duplicate && duplicateInfos) {
        console.warn(`Duplicate artist info ${artist.name} | ${artist.id} -> ${duplicateInfos.id}`);
      }

      const stage = a.stage - 1;
      if (!scenes[stage]) {
        console.warn(`No scene defined at index ${stage}`);
      } else {
        if (!skip) {
          artists.push(artist);
        }

        const set = {
          type: a.type,
          start: a.start,
          end: a.end,
          artistId: duplicate ? duplicates[artist.name].id : artist.id
        };
        scenes[stage].sets.push(set);
      }
    });

    artists = _.sortBy(artists, ['name']);

    scenes.forEach(scene => {
      scene = applyLineupFix(scene, fixes);
      scene.sets = _.sortBy(scene.sets, ['start']);
    });

    // Check for orphan artists
    _.each(artists, artist => {
      var sets = [];
      _.each(scenes, scene => {
        _.each(scene.sets, set => {
          if (set.artistId === artist.id) {
            sets.push(set);
          };
        });
      });
      if (!sets.length) {
        console.warn(`Warning, artist ${artist.name} has no sets!`);
      }
    });

    // Check for holes in lineup
    _.each(scenes, scene => {
      var previous = null;
      _.each(scene.sets, set => {
        if (previous && previous.end !== set.start && previous.start !== set.start) {
          console.warn(`Warning, hole between sets: ${previous.artistId} [${previous.end}] -> ${set.artistId}[${set.start}] on scene ${scene.name}`);
        }
        previous = set;
      });
    });


    var newJson = {lineup: scenes, artists: artists};

    Promise.all(promises).then(function() {
      fs.writeFileSync(path.join(out, 'data.json'), JSON.stringify(newJson, null, 2));

      console.log(`Extracted: ${numPhotos} photos, ${numBanners} banners`);

      // if (baseJson) {
      //   _.assign(baseJson, newJson);
      //   fs.writeFileSync(baseJsonPath, JSON.stringify(baseJson, null, 2));
      //   console.log(`Updated ${baseJsonPath}`);
      // }
    });
  }

  _exit(error, code = 1) {
    console.error(error);
    process.exit(code);
  }
}

module.exports = Htf;

// Internal
// ------------------------------------

function fixUrl(url, site) {
  if (!url) {
    return null;
  }

  if (url.indexOf(site) === -1) {
    return site + '/' + url;
  }

  return url;
}

function cleanUrl(url) {
  if (!url) {
    return null;
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

function fixUnicode(str) {
  if (!str) {
    return;
  }

  // Fix bad DB encoding (utf8 encoded as latin1)
  str = iconvlite.encode(str, 'windows-1252');
  str = iconvlite.decode(str, 'utf8');

  str = str
    .replace(/\r\n/g, '<br>')
    .replace(/\t/g, '');
    // .replace(/&amp;/g, '&')
    // .replace(/&quot;/g, '"')
    // .replace(/�\?\?/g, '\'')
    // .replace(/��"/g, '\'');

  str = entities.decode(str);
  return str;
}

function fixName(name) {
  return capitalize(name.toLowerCase())
    .replace('Dj', 'DJ');
}

function applyArtistFix(artist, fixes) {
  var fix = _.find(fixes.artists, {id: artist.id});
  if (fix) {
    _.assign(artist, fix);
  }
  return artist;
}

function applyLineupFix(lineup, fixes) {
  var fix = _.find(fixes.lineup, {name: lineup.name});

  if (fix) {
    _.assign(lineup, fix);
  }

  return lineup;
}

function capitalize(str) {
  return str.replace(/\b\w/g, function (l) {
    return l.toUpperCase();
  });
}

function getImage(url, filename) {
  return popsicle.get({
      url,
      transport: popsicle.createTransport({type: 'buffer'})
    })
    .then(response => {
      if (response.status >= 200 && response.status < 400 && response.url.indexOf('/404.htm') === -1) {
        return fs.writeFile(filename, response.body);
      } else {
        throw new Error(`Image not found: ${url}`);
      }
    });
}
