# htf-data

![Node version](https://img.shields.io/badge/node-%3E%3D6.0.0-brightgreen.svg)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> CLI tool to process Hadra Trance Festival database export into valid data for the app

Not the best code out there as the main goal was to avoid manual processing to gain time,
so I may have taken a few shortcuts here and there, but it may still be interesting
because to transform (bad) semi-structured data into cleaned up, structured data I had to:

- fix mojibake (bad unicode encoding)
- make extensive use of fuzzy-search to match artists name, nationalities...
- fetch images, resize and reencode them
- use Facebook API to retrieve artist photos/banners, and even parse Facebook HTML pages as
  a workaround to retrieve `userId` from pages (not possible with the new API)
- parse non-structed text files
- detect and fix malformed URLs

...among other things ;-)

## How to use

Use https://developers.facebook.com/tools/explorer/ to get an app access token,
then set the `FB_TOKEN` environment variable with it before running `npm start`.

