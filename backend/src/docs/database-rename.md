# Rename MongoDB database from `test` to `aim-hygienics`

MongoDB cannot directly rename a database in-place. Use one of these safe methods to keep all collections and data.

## Option 1 (recommended): dump and restore

```bash
mongodump --uri="mongodb://localhost:27017/test" --out ./mongo-backup
mongorestore --uri="mongodb://localhost:27017/aim-hygienics" --drop ./mongo-backup/test
```

- `--drop` replaces existing collections in the target database.
- This preserves all documents and collection names.

## Option 2: clone each collection with `db.copyDatabase` (legacy shells)

If supported in your environment:

```javascript
db.copyDatabase("test", "aim-hygienics")
```

Then verify and drop old DB:

```javascript
use aim-hygienics
show collections
use test
db.dropDatabase()
```

## Post-rename app update

Set your app connection string to the new DB name:

```env
MONGODB_URI=mongodb://localhost:27017/aim-hygienics
```
