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
    index = 'id',         // name of field for unique index (or array of names for multi-field)
    cleanErrors = false,  // if true - drops "bad" collection on start
    cleanValid = false,   // if true - drops "good" collection on start
    onInsert = null,      // name of field for set only on insert, not update (or array of names)
    onUpdate = null,      // name of field for set only on insert, not update (or array of names)
    // Note: if onUpdate and onInsert are set in the same time, all other fields in saved records will be ignored
    updateCounter = null, // name of field for incremental counter of updates (will be added to item)
    check = item =>       // function for check if record are "good" or not
        !('errors' in item),
});
```

Function `save` takes single record or array of records and returns object with statistics.

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

save([
    {id: 1, a: 0}, //inserted
    {id: 2, a: 0}, //inserted
    {id: 3, a: 0}, //inserted
    {id: 3, a: 1}, //modified
    {id: 3, a: 2}, //modified
    {id: 3, a: 2}, //duplicated
    {id: 100, errors: true},
    {id: 100, errors: true},
    {id: 200, errors: true},
    {id: 200, errors: 1},
]).then(console.log);
// {
//     inserted: 3,
//     modified: 2,
//     duplicated: 1,
//     errors: 4,
// }
```

## License

MIT

[npm-url]: https://npmjs.org/package/monscr
[npm-image]: https://badge.fury.io/js/monscr.svg
[travis-url]: https://travis-ci.org/astur/monscr
[travis-image]: https://travis-ci.org/astur/monscr.svg?branch=master