const path = require('path');
const fs = require('fs-extra');

const infosFilename = 'infos.json';
const imagesFolder = 'images';

module.exports = class Infos {
  static import(infosFolder, htfData, outDir) {
    const infosFile = path.join(infosFolder, infosFilename);
    if (!fs.existsSync(infosFile)) {
      console.warn('No infos found!');
      return;
    }

    const infos = require(infosFile);
    infos.forEach(info => {
      const contentFile = path.join(infosFolder, info.content);
      if (!fs.existsSync(contentFile)) {
        throw new Error(`Info content not found: ${info.content}`);
      }
      const content = fs.readFileSync(contentFile, 'utf8');
      info.content = content;
    });
    htfData.infos = infos;
    fs.copySync(path.join(infosFolder, imagesFolder), path.join(outDir, imagesFolder));
  }
}
