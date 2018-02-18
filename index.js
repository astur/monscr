module.exports = db => async items => {
    const _db = await db;
    items = Array.isArray(items) ? items : [items];
    items = items.map(item => {
        const collection = item.errors ? 'errors' : 'data';
        return _db.collection(collection).update(
            {data: item.data},
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
