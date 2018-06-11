const test = require('ava');
const monscr = require('.');

const mongo = require('mongodb').MongoClient;
const mongoString = process.env.MONGO_URI ||
    'mongodb://localhost:27017/test';

let db;

test.before(async t => {
    db = await mongo.connect(mongoString)
        .then(client => {
            const db = client.db(mongoString.split('/').pop());
            db.close = client.close.bind(client);
            return db;
        });
});

test.serial('default', async t => {
    await db.collection('data').remove({});
    await db.collection('errors').remove({});
    const save = monscr(db);
    await save({id: 123, data: 'ok'});
    await save({id: 456, errors: true});
    await save();
    t.is(await db.collection('data').count(), 1);
    t.is(await db.collection('errors').count(), 1);
    t.is((await db.collection('data').findOne({id: 123})).data, 'ok');
});

test.serial('options', async t => {
    await db.collection('good').remove({});
    await db.collection('bad').remove({});
    await db.collection('bad').insert({idx: -1, data: 'garbage'});
    const save = monscr(db, {
        valid: 'good',
        errors: 'bad',
        index: 'idx',
        cleanErrors: true,
        check: item => item.idx < 100,
    });
    await save([{idx: 99}, {idx: 1}]);
    t.is(await db.collection('good').count(), 2);
    t.is(await db.collection('bad').count(), 0);
    await save([{idx: 123, data: 'ok'}, {idx: 456}]);
    t.is(await db.collection('bad').count(), 2);
    t.is((await db.collection('bad').find({idx: 123}).toArray())[0].data, 'ok');
});

test.serial('multi index', async t => {
    await db.collection('mi.data').remove({});
    await db.collection('mi.errors').remove({});
    const save = monscr(db, {
        valid: 'mi.data',
        errors: 'mi.errors',
        index: ['a', 'b'],
    });
    await save([{a: 0, b: 10}, {a: 1, b: 11, errors: true}]);
    t.is(await db.collection('mi.data').count(), 1);
    t.is(await db.collection('mi.errors').count(), 1);
    t.is((await db.collection('mi.data').find({a: 0}).toArray())[0].b, 10);
    t.is((await db.collection('mi.errors').find({b: 11}).toArray())[0].a, 1);
});

test.serial('stats', async t => {
    await db.collection('data').remove({});
    await db.collection('errors').remove({});
    const save = monscr(db);
    const stats = await save([
        {id: 1, a: 0},
        {id: 2, a: 0},
        {id: 3, a: 0},
        {id: 1, a: 0},
        {id: 1, a: 1},
        {id: 1, a: 2},
        {id: 100, errors: true},
        {id: 200, errors: true},
        {id: 200, errors: true},
    ]);
    t.is(typeof stats, 'object');
    t.deepEqual(stats, {
        inserted: 3,
        modified: 2,
        duplicated: 1,
        errors: 3,
    });
});

test.after(async t => {
    await db.dropCollection('data');
    await db.dropCollection('errors');
    await db.dropCollection('good');
    await db.dropCollection('bad');
    await db.dropCollection('mi.data');
    await db.dropCollection('mi.errors');
    await db.close();
});
