const path = require('path');
const fs = require('fs-extra');
const popsicle = require('popsicle');
const sharp = require('sharp');

const artistPicturesBaseUrl = 'http://www.hadra.net/HTF2017/ph_artists/';

module.exports = class Image {

  static getPhoto(artist, photo, outFolder) {
    let photoName = checkExists(artist, outFolder);
    if (photoName) {
      return Promise.resolve(photoName);
    }

    photoName = `photo-${artist.id}.jpg`;
    return Image.getImage(artistPicturesBaseUrl + photo, path.join(outFolder, photoName), 160)
      .catch(() => {
        // Retry with .jpg extension
        return Image.getImage(artistPicturesBaseUrl + photo.replace('.jpeg', '.jpg'), path.join(outFolder, photoName), 160);
      })
      .then(() => photoName)
      .catch(err => {
        console.error(err.message);
      });
  }

  static getImage(url, filename, resize) {
    return popsicle.get({
        url,
        transport: popsicle.createTransport({type: 'buffer'})
      })
      .then(response => {
        if (response.status >= 200 && response.status < 400 && response.url.indexOf('/404.htm') === -1) {
          let img = sharp(response.body);
          if (resize) {
            img = img.resize(resize);
          }
          return img.jpeg({quality: 90})
            .toFile(filename);
        } else {
          throw new Error(`Image not found: ${url}`);
        }
      });
  }

}

function checkExists(artist, outFolder) {
  const photoName = `photo-${artist.id}.jpg`;
  if (fs.existsSync(path.join(outFolder, photoName))) {
    return photoName;
  }
  if (fs.existsSync(path.join(outFolder, photoName.replace('.jpg', '.png')))) {
    return photoName;
  }
  return null;
}
