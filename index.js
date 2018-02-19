module.exports = (db, {
    valid = 'data',
    errors = 'errors',
    index = 'id',
    cleanErrors = false,
} = {}) => {
    db = (async () => {
        const _db = await db;
        if(cleanErrors){
            await _db.dropCollection(errors);
        }
        const makeIndexes = v => _db.collection(v).createIndex({[index]: 1}, {unique: true});
        await Promise.all([valid, errors].map(makeIndexes));
        return _db;
    })();
    return async items => {
        const _db = await db;
        items = Array.isArray(items) ? items : [null, undefined].includes(items) ? [] : [items];
        items = items.map(item => {
            const collection = item.errors ? errors : valid;
            return _db.collection(collection).update(
                {[index]: item[index]},
                {$set: item},
                {upsert: true},
            ).then(result => ({
                modified: !!result.result.nModified,
                upserted: !!result.result.upserted,
                collection,
            }));
        });
        return Promise.all(items);
    };
};
