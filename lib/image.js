const path = require('path');
const fs = require('fs-extra');
const popsicle = require('popsicle');

const artistPicturesBaseUrl = 'http://www.hadra.net/HTF2017/ph_artists/';

module.exports = class Image {

  static getPhoto(artist, photo, outFolder) {
    let photoName = `photo-${artist.id}${path.extname(photo)}`;
    return Image.getImage(artistPicturesBaseUrl + photo, path.join(outFolder, photoName))
      .catch(() => {
        // Retry with .jpg extension
        photoName = `photo-${artist.id}.jpg`;
        return Image.getImage(artistPicturesBaseUrl + photo.replace('.jpeg', '.jpg'), path.join(outFolder, photoName));
      })
      .then(() => photoName)
      .catch(err => {
        console.error(err.message);
      });
  }

  static getImage(url, filename) {
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

}
