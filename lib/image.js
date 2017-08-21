const path = require('path');
const fs = require('fs-extra');
const popsicle = require('popsicle');
const sharp = require('sharp');

const Facebook = require('./facebook');

const artistPicturesBaseUrl = 'http://www.hadra.net/HTF2017/ph_artists/';

module.exports = class Image {

  static getPhoto(artist, photo, outFolder) {
    let photoName = checkExists('photo', artist, outFolder);
    if (photoName) {
      return Promise.resolve(photoName);
    }

    photoName = `photo-${artist.id}.jpg`;
    const filename = path.join(outFolder, photoName);
    return Image.getImage(artistPicturesBaseUrl + photo, filename, 160)
      .catch(() => {
        // Retry with .jpg extension
        return Image.getImage(artistPicturesBaseUrl + photo.replace('.jpeg', '.jpg'), filename, 160);
      })
      .catch(err => {
        if (!artist.facebook) {
          throw err;
        }
        // Try getting image from facebook
        return Facebook.getUserId(artist.facebook)
          .then(id => Facebook.getPhoto(id))
          .then(response => {
            console.log(`Got ${artist.name} photo from facebook | ${artist.id}`);
            return saveImage(response.body, filename, 160);
          })
          .catch(err => {
            console.error(`Error, cannot get artist ${artist.name} photo from facebook! (${artist.facebook})`);
            console.error(err && err.message);
          });
      })
      .then(() => photoName)
      .catch(err => {
        console.error(err && err.message);
      });
  }

  static getBanner(artist, photo, outFolder) {
    let bannerName = checkExists('banner', artist, outFolder);
    if (bannerName) {
      return Promise.resolve(bannerName);
    }

    bannerName = `banner-${artist.id}.jpg`;
    const filename = path.join(outFolder, bannerName);
    return Facebook.getUserId(artist.facebook)
      .then(id => Facebook.getCover(id))
      .then(response => {
        console.log(`Got ${artist.name} banner from facebook | ${artist.id}`);
        return saveImage(response.body, filename, 720);
      })
      .catch(err => {
        console.error(`Error, cannot get artist ${artist.name} banner from facebook! (${artist.facebook})`);
        console.error(err && err.message);
      });
  }

  static getImage(url, filename, resize) {
    return popsicle.get({
        url,
        transport: popsicle.createTransport({type: 'buffer'})
      })
      .then(response => {
        if (response.status >= 200 && response.status < 400 && response.url.indexOf('/404.htm') === -1) {
          return saveImage(response.body, filename, resize);
        } else {
          throw new Error(`Image not found: ${url}`);
        }
      });
  }
}

function saveImage(buffer, filename, resize) {
  let img = sharp(buffer);
  if (resize) {
    img = img.resize(resize);
  }
  return img.jpeg({quality: 90})
    .toFile(filename);
}

function checkExists(prefix, artist, outFolder) {
  const filename = `${prefix}-${artist.id}.jpg`;
  if (fs.existsSync(path.join(outFolder, filename))) {
    return filename;
  }
  return null;
}
