const test = require('ava');
const monscr = require('.');

test('monscr', t => {
    t.is(typeof monscr, 'function');
});

test.todo('something with real mongo');
