module.exports = (db, {
    valid = 'data',
    errors = 'errors',
    index = 'id',
    cleanErrors = false,
    cleanValid = false,
    check = item => !('errors' in item),
} = {}) => {
    const arfy = v => Array.isArray(v) ? v : [null, undefined].includes(v) ? [] : [v];
    index = arfy(index);
    db = (async () => {
        const _db = await db;
        if(cleanErrors) await _db.dropCollection(errors).catch(e => {});
        if(cleanValid) await _db.dropCollection(valid).catch(e => {});
        const idx = index.reduce((r, v) => {
            r[v] = 1;
            return r;
        }, {});
        const makeIndexes = v => _db.collection(v).createIndex(idx, {unique: true});
        await Promise.all([valid, errors].map(makeIndexes));
        return _db;
    })();
    return async items => {
        const _db = await db;
        items = arfy(items);
        items = items.map(item => {
            const collection = check(item) ? valid : errors;
            const query = index.reduce((r, v) => {
                r[v] = item[v];
                return r;
            }, {});
            return _db.collection(collection).update(
                query,
                {$set: item},
                {upsert: true},
            ).then(result => ({
                modified: !!result.result.nModified,
                upserted: !!result.result.upserted,
                collection,
            }));
        });
        return Promise.all(items).then(items => items.reduce((r, v) => {
            const field = v.collection === 'errors' ? 'errors' :
                ['duplicated', 'inserted', 'modified'][+v.modified * 2 + +v.upserted];
            r[field]++;
            return r;
        }, {
            inserted: 0,
            modified: 0,
            duplicated: 0,
            errors: 0,
        }));
    };
};
