const FB = new require('fb');
const popsicle = require('popsicle');
const cheerio = require('cheerio');

const auth = facebookAuth();

class Facebook {
  static getUserId(url) {
    return popsicle.get({
      // Use mobile version as it does not require JS
      url: url.replace('www.', 'm.'),
      headers: {
        // Simulate Chrome
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
      }
    })
    .then(response => cheerio.load(response.body))
    .then($ => {
      // Get facebook user id
      const content = $.html();
      const re = /fbid=.*?id=(\d*?)&/gm;
      let match = re.exec(content);

      if (!match || !match[1]) {
        const re2 = /imp_id":.*?entity_id":.*?(\d*?)["|}]/gm;
        match = re2.exec(content);

        if (match && match[1]) {
          return match[1];
        }

        return auth.then(() => {
          return new Promise((resolve, reject) => {
            FB.api(url, res => {
              if (!res || !res.id) {
                reject();
              } else {
                resolve(res.id);
              }
            });
          });
        })
        .catch(() => {
          console.warn(`Could not find FB user id for url: ${url}, trying with url`);
          return url;
        });
      }
      return match[1];
    });
  }

  static getPhoto(userId) {
    return auth.then(() => {
      return new Promise((resolve, reject) => {
        FB.api(userId , {fields: 'picture.type(large)'}, res => {
          if (!res) {
            reject(!res ? 'error occurred' : res.error);
          } else {
            resolve(res.picture.data.url);
          }
        });
      });
    })
    .then(url => popsicle.get({
      url,
      transport: popsicle.createTransport({type: 'buffer'})
    }));
  }

  static getCover(userId) {
    return auth.then(() => {
      return new Promise((resolve, reject) => {
        FB.api(userId, {fields: 'cover'}, res => {
          if (!res || res.error) {
            reject(!res ? 'error occurred' : res.error);
          } else {
            resolve(res.cover.source);
          }
        });
      });
    })
    .then(url => popsicle.get({
      url,
      transport: popsicle.createTransport({type: 'buffer'})
    }));
  }
}

module.exports = Facebook;

function facebookAuth() {
  return new Promise((resolve, reject) => {
    FB.api('oauth/access_token', {
      client_id: '1795175897368530',
      client_secret: process.env.FB_SECRET,
      grant_type: 'client_credentials'
    }, (res) => {
      if (!res || res.error) {
        reject(!res ? 'error occurred' : res.error);
      } else {
        const accessToken = res.access_token;
        FB.setAccessToken(accessToken);
        resolve(accessToken);
      }
    });
  });
}
