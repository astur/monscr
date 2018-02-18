# monscr

Mongo wraper for saving scraped data

[![Build Status][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]

## Install

```bash
npm i monscr
```

## Usage

```js
const mongo = require('mongodb').MongoClient;
const mongoString = process.env.MONGO_URI;
const db = mongo.connect(mongoString);

const save = require('monscr')(db);

save([
    { // will be saved to 'data' collection
        data: 123,
    },
    { // will be saved to 'errors' collection
        data: 456,
        errors: ['Invalid data "456"'],
    },
]).then(() => console.log('Saved!'))
```

## License

MIT

[npm-url]: https://npmjs.org/package/monscr
[npm-image]: https://badge.fury.io/js/monscr.svg
[travis-url]: https://travis-ci.org/astur/monscr
[travis-image]: https://travis-ci.org/astur/monscr.svg?branch=master