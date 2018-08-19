module.exports = (DB, {
    valid = 'data',
    errors = 'errors',
    index = 'id',
    cleanErrors = false,
    cleanValid = false,
    check = item => !('errors' in item),
} = {}) => {
    const arfy = v => Array.isArray(v) ? v : [null, undefined].includes(v) ? [] : [v];
    const idx = arfy(index);
    const db = (async () => {
        const _db = await DB;
        if(cleanErrors) await _db.dropCollection(errors).catch(e => null);
        if(cleanValid) await _db.dropCollection(valid).catch(e => null);
        const makeIndexes = v => _db.collection(v).createIndex(idx.reduce((r, v) => {
            r[v] = 1;
            return r;
        }, {}), {unique: true});
        await Promise.all([valid, errors].map(makeIndexes));
        return _db;
    })();
    return async items => {
        const _db = await db;
        const prepared = arfy(items).map(item => {
            const collection = check(item) ? valid : errors;
            const query = idx.reduce((r, v) => {
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
        return Promise.all(prepared).then(items => items.reduce((r, v) => {
            const field = v.collection === valid ?
                ['duplicated', 'inserted', 'modified'][+v.modified * 2 + +v.upserted] : 'errors';
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
