const test = require('ava');
const monscr = require('.');

const mongo = require('mongodb').MongoClient;
const mongoString = process.env.MONGO_URI ||
    'mongodb://localhost:27017/test';

const DB = mongo.connect(mongoString)
    .then(client => {
        const db = client.db(mongoString.split('/').pop());
        db.close = client.close.bind(client);
        return db;
    })
    .catch(e => {
        console.log(e.message);
        process.exit(1);
    });

test.serial('default', async t => {
    const db = await DB;
    await db.collection('data').remove({});
    await db.collection('errors').remove({});
    const save = monscr(DB);
    await save([{id: 123, data: 'ok'}, {id: 456, errors: true}]);
    t.is(await db.collection('data').count(), 1);
    t.is(await db.collection('errors').count(), 1);
    t.is((await db.collection('data').findOne({id: 123})).data, 'ok');
});

test.serial('options', async t => {
    const db = await DB;
    await db.collection('good').remove({});
    await db.collection('bad').remove({});
    await db.collection('bad').insert({idx: -1, data: 'garbage'});
    const save = monscr(DB, {
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
    const db = await DB;
    await db.collection('mi.data').remove({});
    await db.collection('mi.errors').remove({});
    const save = monscr(DB, {
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

test.after(async t => {
    const db = await DB;
    await db.dropCollection('data');
    await db.dropCollection('errors');
    await db.dropCollection('good');
    await db.dropCollection('bad');
    await db.dropCollection('mi.data');
    await db.dropCollection('mi.errors');
    await db.close();
});
