# monscr

Mongo wrapper for saving scraped data

[![Build Status][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]

## Install

```bash
npm i monscr
```

## Usage

Makes async function for easy save scraped record to mongo database. That function can separate "good" and "bad" records to two different collections. Before creating function `monscr` creates indexes and (optionally) drops "bad" collection for new scraping session.

```js
const save = require('monscr')(db);
```

Only required parameter is `db`. It may be mongo database object or promise resolving to mongo database object.

Some options are available in `monscr` via second optional parameter. They defaults to this:

```js
const save = require('monscr')(db, {
    valid = 'data',       // name of collection for "good" records
    errors = 'errors',    // name of collection for "bad" records
    index = 'id',         // name of field for unique index
    cleanErrors = false,  // if true - drops "bad" collection
    check = item =>       // function for check if record are "good" or not
        !('errors' in item),
});
```

Function `save` takes single record or array of records and returns statistics

## Example

```js
const mongo = require('mongodb').MongoClient;
const mongoString = process.env.MONGO_URI;
const db = mongo.connect(mongoString);

const save = require('monscr')(db);

save([
    { // will be saved to 'data' collection
        id: 123,
    },
    { // will be saved to 'errors' collection
        id: 456,
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