const FB = new require('fb');
const popsicle = require('popsicle');
const cheerio = require('cheerio');

const auth = facebookAuth();

class Facebook {
  static loadPage(url) {
    return popsicle.get({
      url,
      headers: {
        'user-agent': 'curl/7.47.0',
        'accept-language': 'en-US,en',
        'accept': '*/*'
      }
    });
  }

  static scrapCover(url) {
    return Facebook.loadPage(url)
    .then(response => cheerio.load(response.body))
    .then($ => {
      const url = $('.coverPhotoImg').attr('src') || $('#pagelet_page_cover img').attr('src') || $('._3mk2').attr('src')
      console.log(url);
      return url;
    })
    .then(imgUrl => popsicle.get({
      url: imgUrl,
      transport: popsicle.createTransport({type: 'buffer'})
    }));
  }

  static scrapPhoto(url) {
    return Facebook.loadPage(url)
    .then(response => cheerio.load(response.body))
    .then($ => $('.profilePicThumb img').attr('src') || $('._4jhq').attr('src'))
    .then(imgUrl => popsicle.get({
      url: imgUrl,
      transport: popsicle.createTransport({type: 'buffer'})
    }));
  }

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
      // Get facebook user id from webpage, as it's no more available from API
      // for artist pages
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

  static getPhoto(url) {
    return Facebook.getUserId(url)
      .then(userId => {
        if (/http/.test(userId)) {
          console.warn(`Could not get facebook userId for ${url}, trying to scrape...`);
          return Facebook.scrapPhoto(userId);
        }
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
      });
  }

  static getCover(url) {
    return Facebook.getUserId(url)
      .then(userId => {
        if (/http/.test(userId)) {
          console.warn(`Could not get facebook userId for ${url}, trying to scrape...`);
          return Facebook.scrapCover(userId);
        }
        return auth.then(() => {
          return new Promise((resolve, reject) => {
            FB.api(userId, {fields: 'cover'}, res => {
              if (!res || res.error || !res.cover) {
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
      });
  }
}

module.exports = Facebook;

// Use https://developers.facebook.com/tools/explorer/ for access token

function facebookAuth() {
  return new Promise((resolve/*, reject*/) => {
    // FB.api('oauth/access_token', {
    //   client_id: process.env.FB_ID || '1795175897368530',
    //   client_secret: process.env.FB_SECRET,
    //   grant_type: 'client_credentials'
    // }, (res) => {
    //   if (!res || res.error) {
    //     reject(!res ? 'error occurred' : res.error);
    //   } else {
    //    const accessToken = res.access_token;
        const accessToken = process.env.FB_TOKEN || '1795175897368530|eg1uhB8lOWMLDGzV0i_-CXwXgHg';
        FB.setAccessToken(accessToken);
        resolve(accessToken);
      // }
    // });
  });
}
