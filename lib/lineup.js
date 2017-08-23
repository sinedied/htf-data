const moment = require('moment');
const _ = require('lodash');
const Fuse = require('fuse.js');

const stageSeparator = '---';
const setRegexp = /^(\d+:\d+).*?(\d+:\d+)\s*(.*?)\n/gm;

module.exports = class Lineup {
  static import(lineupData, htfData, dbData, startDate) {
    if (!lineupData) {
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
    const lineup = lineupData.split(stageSeparator);

    _.each(lineup, (l, i) => {
      let match = null;
      let previousDate = moment.utc(startDate);

      while ((match = setRegexp.exec(l))) {
        const name = match[3].toUpperCase().trim();
        const artist = fuse.search(name)[0];
        const isBreak = name === 'BREAK';

        if (!isBreak && !artist) {
          throw new Error(`Cannot find artist ${name} from lineup!`);
        }
        const dbArtistName = _.find(dbData, a => a.id === artist.id).name;
        const dbArtist = _.find(dbData, a => {
          return a.name.toUpperCase() === dbArtistName.toUpperCase() && String(i + 1) === a.stage;
        });
        if (!isBreak && !dbArtist) {
          throw new Error(`Cannot find DB artist ${name} from lineup!`);
        }
        const start = getDate(match[1], previousDate);
        const end = getDate(match[2], start);
        previousDate = end;

        let type;
        if (isBreak) {
          type = 'break';
        } else {
          type = dbArtist.gig === '1' ? 'gig' : dbArtist.live === '1' ? 'live' : 'dj';
        }

        const set = {
          type: type,
          start: start.toISOString(),
          end: end.toISOString(),
          artistId: type === 'break' ? -1 : artist.id
        };

        htfData.lineup[i].sets.push(set);
      }
    });
  }
}

function getDate(timeString, previousDate) {
  const time = timeString.split(':');
  const date = moment(previousDate);
  date.hour(time[0]);
  date.minute(time[1]);
  if (date.isBefore(previousDate)) {
    date.add(1, 'day');
  }
  return date;
}
