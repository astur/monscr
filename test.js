const test = require('ava');
const monscr = require('.');

const mongo = require('mongodb').MongoClient;
const mongoString = process.env.MONGO_URI ||
    'mongodb://localhost:27017/test';

let db = null;

test.before(async t => {
    db = await mongo.connect(mongoString, {useNewUrlParser: true})
        .then(client => {
            const db = client.db(mongoString.split('/').pop());
            db.close = client.close.bind(client);
            return db;
        });
});

test.serial('default', async t => {
    await db.collection('data').deleteMany({});
    await db.collection('errors').deleteMany({});
    const save = monscr(db);
    await save({id: 123, data: 'ok'});
    await save({id: 456, errors: true});
    await save();
    t.is(await db.collection('data').countDocuments(), 1);
    t.is(await db.collection('errors').countDocuments(), 1);
    t.is((await db.collection('data').findOne({id: 123})).data, 'ok');
});

test.serial('options empty', async t => {
    await db.collection('good').deleteMany({});
    await db.collection('bad').deleteMany({});
    const save = monscr(db, {
        valid: 'good',
        errors: 'bad',
        index: 'idx',
        cleanErrors: true,
        cleanValid: true,
        check: item => item.idx < 100,
    });
    await save([{idx: 99, data: 'ok'}, {idx: 1}]);
    await save([{idx: 123, data: 'not ok'}, {idx: 456}]);
    t.is(await db.collection('bad').countDocuments(), 2);
    t.is((await db.collection('bad').find({idx: 123}).toArray())[0].data, 'not ok');
    t.is(await db.collection('good').countDocuments(), 2);
    t.is((await db.collection('good').find({idx: 99}).toArray())[0].data, 'ok');
});

test.serial('options not empty', async t => {
    await db.collection('good').deleteMany({});
    await db.collection('bad').deleteMany({});
    await db.collection('good').insertOne({idx: -1, data: 'sample'});
    await db.collection('bad').insertOne({idx: -2, data: 'garbage'});
    const save = monscr(db, {
        valid: 'good',
        errors: 'bad',
        index: 'idx',
        cleanErrors: true,
        cleanValid: true,
        check: item => item.idx < 100,
    });
    await save([{idx: 99, data: 'ok'}, {idx: 1}]);
    await save([{idx: 123, data: 'not ok'}, {idx: 456}]);
    t.is(await db.collection('bad').countDocuments(), 2);
    t.is((await db.collection('bad').find({idx: 123}).toArray())[0].data, 'not ok');
    t.is(await db.collection('good').countDocuments(), 2);
    t.is((await db.collection('good').find({idx: 99}).toArray())[0].data, 'ok');
});

test.serial('multi index', async t => {
    await db.collection('mi.data').deleteMany({});
    await db.collection('mi.errors').deleteMany({});
    const save = monscr(db, {
        valid: 'mi.data',
        errors: 'mi.errors',
        index: ['a', 'b'],
    });
    await save([{a: 0, b: 10}, {a: 1, b: 11, errors: true}]);
    t.is(await db.collection('mi.data').countDocuments(), 1);
    t.is(await db.collection('mi.errors').countDocuments(), 1);
    t.is((await db.collection('mi.data').find({a: 0}).toArray())[0].b, 10);
    t.is((await db.collection('mi.errors').find({b: 11}).toArray())[0].a, 1);
});

test.serial('onInsert', async t => {
    await db.collection('data').deleteMany({});
    await db.collection('errors').deleteMany({});
    const save = monscr(db, {onInsert: ['start']});
    await save({id: 123, start: 'first'});
    await save({id: 123, start: 'second'});
    t.is((await db.collection('data').findOne({id: 123})).start, 'first');
});

test.serial('onUpdate', async t => {
    await db.collection('data').deleteMany({});
    await db.collection('errors').deleteMany({});
    const save = monscr(db, {onUpdate: ['data']});
    await save({id: 123, start: 'first', data: 'first'});
    await save({id: 123, start: 'second', data: 'second'});
    t.is((await db.collection('data').findOne({id: 123})).start, 'first');
    t.is((await db.collection('data').findOne({id: 123})).data, 'second');
});

test.serial('onUpdate/onInsert', async t => {
    await db.collection('data').deleteMany({});
    await db.collection('errors').deleteMany({});
    const save = monscr(db, {onUpdate: 'a', onInsert: 'b'});
    await save({id: 123, a: 1, b: 1, c: 1});
    await save({id: 123, a: 2, b: 2, c: 2});
    const result = await db.collection('data').findOne({id: 123});
    t.is(result.a, 2);
    t.is(result.b, 1);
    t.is(result.c, undefined);
});

test.serial('updateCounter', async t => {
    await db.collection('data').deleteMany({});
    await db.collection('errors').deleteMany({});
    const save = monscr(db, {updateCounter: 'uCount'});
    await save({id: 123});
    await save({id: 123, data: 'something'});
    await save({id: 123});
    t.is((await db.collection('data').findOne({id: 123})).uCount, 3);
    t.is((await db.collection('data').findOne({id: 123})).data, 'something');
});

test.serial('stats', async t => {
    await db.collection('yes').deleteMany({});
    await db.collection('no').deleteMany({});
    const save = monscr(db, {
        valid: 'yes',
        errors: 'no',
    });
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
    await db.dropCollection('yes');
    await db.dropCollection('no');
    await db.dropCollection('good');
    await db.dropCollection('bad');
    await db.dropCollection('mi.data');
    await db.dropCollection('mi.errors');
    await db.close();
});
