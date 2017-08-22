'use strict';

const minimist = require('minimist');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const franc = require('franc');
const _ = require('lodash');
const pkg = require('./package.json');
const findCountryCode = require('./lib/country');
const preprocess = require('./lib/preprocess');
const Fix = require('./lib/fix');
const Image = require('./lib/image');
const Lineup = require('./lib/lineup');
const Infos = require('./lib/infos');

const artistImagesFolder = 'images/artists';
const festivalStart = '2017-09-09T00:00:00.000Z';
const scenes = [
  {
    name: 'Main',
    hide: false,
    sets: []
  },
  {
    name: 'Alternative',
    hide: false,
    sets: []
  },
  {
    name: 'Chill',
    hide: false,
    sets: []
  }
];

const help =
`${chalk.bold('Usage:')} htf <db_export.json> [options]
Process Hadra Trance Festival database export into valid data for the app.

${chalk.bold('Options:')}
  -u, --update <file>      Update data in target file
  -p, --preprocess         Preprocess database extract (removes extra data)
  -s, --skip-images        Do not attempt to download photos/banners
  -l, --lineup <file>      Lineup info        [default: lineup.txt]
  -f, --fixes <folder>     Data fixes         [default: fixes]
  -i, --infos <folder>     Additional infos   [default: infos]
  -o, --out <folder>       Data output folder [default: dist]
  `;

class Htf {
  constructor(args) {
    this._args = minimist(args, {
      boolean: ['help', 'version', 'verbose', 'preprocess', 'skip-images'],
      string: ['out', 'fixes', 'lineup', 'update', 'infos'],
      alias: {
        v: 'verbose',
        h: 'help',
        o: 'out',
        f: 'fixes',
        p: 'preprocess',
        s: 'skip-images',
        l: 'lineup',
        u: 'update',
        i: 'infos'
      },
      default: {
        out: 'dist',
        fixes: 'fixes',
        lineup: 'lineup.txt',
        infos: 'infos'
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
    const fixesFile = path.join(path.dirname(file), options.fixes, 'fixes.json');
    const lineupFile = path.join(path.dirname(file), options.lineup);
    const imagesFolder = path.join(out, artistImagesFolder);
    const infosFolder = path.join(path.dirname(file), options.infos);
    fs.ensureDirSync(imagesFolder);

    let artists = [];
    const json = require(file);
    let fixes = {};
    if (fs.existsSync(fixesFile)) {
      fixes = require(fixesFile);
    } else {
      console.warn('No fixes found!')
    }
    let lineup = null;
    if (fs.existsSync(lineupFile)) {
      lineup = fs.readFileSync(lineupFile, 'utf8');
    } else {
      console.warn('No lineup found!')
    }

    const promises = [];
    const duplicates = {};
    let numPhotos = 0;
    let numBanners = 0;
    let numDuplicates = 0;

    console.log(`Loaded ${json.length} artists`);

    json.forEach(a => {
      let artist = {};
      const stage = a.stage - 1;
      if (!scenes[stage]) {
        this._warn(`No scene defined at index ${stage}`);
        return;
      }

      // Fix encoding
      a.name = Fix.text(a.name);
      a.bio = Fix.text(a.bio);
      a.nationality = Fix.text(a.nationality);
      a.label = Fix.text(a.label);

      // Cleanup
      artist.id = '' + a.id;
      artist.name = Fix.name(a.name);
      if (a.bio) {
        const lang = franc(a.bio);
        artist.bio = {};
        artist.bio[lang === 'eng' ? 'en' : 'fr'] = a.bio;
      }
      artist.country = findCountryCode(a.nationality);
      // artist.originalCountry = a.nationality;
      artist.label = a.label;
      artist.website = Fix.url(a.website);
      artist.mixcloud = Fix.url(a.mixcloud, 'mixcloud.com');
      artist.soundcloud = Fix.url(a.soundcloud, 'soundcloud.com');
      artist.facebook = Fix.url(a.facebook, 'facebook.com');
      artist = Fix.artist(artist, fixes);

      let duplicate = _.find(artists, {name: artist.name});
      let skip = false;

      if (duplicate) {
        this._warn(`Duplicate artist ${artist.name} | ${artist.id}, ${duplicate.id}`);
        duplicates[artist.name] = duplicate;
        skip = true;
        this._warn(`Fixed duplicate artist ${artist.name} | ${artist.id}, ${duplicate.id}`);
        numDuplicates++;
      }

      var duplicateInfos = _.find(artists, {facebook: artist.facebook});
      if (artist.facebook && !duplicate && duplicateInfos) {
        this._warn(`Duplicate artist facebook ${artist.name} [previous: ${duplicateInfos.name}] | ${artist.id} -> ${duplicateInfos.id}`);
      }

      if (!skip) {
        if (a.photo && !options['skip-images']) {
          let promise = Image.getPhoto(artist, a.photo, imagesFolder)
            .then(photoName => {
              if (photoName) {
                numPhotos++;
                artist.photo = path.join(artistImagesFolder, photoName);
              }
            });
          promises.push(promise);
          // // Decode Base64
          // buffer = new Buffer(artist.photo, 'base64');
          // filename = 'photo-' + artist.id + '.jpg';
          // fs.writeFileSync(path.join(imagesFolder, filename), buffer);
        }

        if (artist.facebook && !options['skip-images']) {
          let promise = Image.getBanner(artist, a.photo, imagesFolder)
            .then(bannerName => {
              if (bannerName) {
                numBanners++;
                artist.banner = path.join(artistImagesFolder, bannerName);
              }
            });
          promises.push(promise);
        }

        artists.push(artist);
      }
    });

    artists = _.sortBy(artists, ['name']);
    const newJson = {lineup: scenes, artists: artists};

    if (lineup) {
      Lineup.import(lineup, newJson, json, festivalStart);
    }
    Infos.import(infosFolder, newJson, out);

    scenes.forEach(scene => {
      scene = Fix.lineup(scene, fixes);
      scene.sets = _.sortBy(scene.sets, ['start']);
    });

    // Check for orphan artists
    _.each(artists, artist => {
      const sets = [];
      _.each(scenes, scene => {
        _.each(scene.sets, set => {
          if (set.artistId === artist.id) {
            sets.push(set);
          }
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

    Promise.all(promises).then(() => {
      // Checks
      _.each(artists, artist => {
        if (!artist.bio || (!artist.bio.fr && !artist.bio.en)) {
          this._warn(`Artist ${artist.name} does not have a bio! | ${artist.id}`);
        }

        if (!artist.photo) {
          this._warn(`Artist ${artist.name} does not have a photo! | ${artist.id}`);
        }

        if (!artist.banner) {
          this._warn(`Artist ${artist.name} does not have a banner! | ${artist.id}`);
        }
      });

      fs.writeFileSync(path.join(out, 'data.json'), JSON.stringify(newJson, null, 2));

      console.log(`Exported artists: ${artists.length} (duplicates fixed: ${numDuplicates})`);
      console.log(`Images: ${numPhotos} photos, ${numBanners} banners`);

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

  _warn(str) {
    if (this._args.verbose) {
      console.warn(str);
    }
  }
}

module.exports = Htf;
