# Database Foundation

SwiftTrack uses MongoDB with Prisma as the primary data layer. The legacy Mongoose models remain available for compatibility, but Prisma is now initialized for the MongoDB schema.

## Requirements

- MongoDB running locally or a MongoDB Atlas connection string
- `DATABASE_URL` set in the environment, for example:

```sh
DATABASE_URL="mongodb+srv://<username>:<password>@cluster.mongodb.net/oherbtracker?retryWrites=true&w=majority"
```

Optional compatibility variables:

```sh
MONGODB_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/oherbtracker?retryWrites=true&w=majority"
```

## Development commands

```sh
npx prisma generate --schema=libs/database/prisma/schema.prisma
npx prisma validate --schema=libs/database/prisma/schema.prisma
npm run db:seed --workspace @oherb-tracker/database
npx nx typecheck @oherb-tracker/database
npx nx build @oherb-tracker/api
```

The schema is designed for MongoDB and defines the core `User`, `Address`, `Shipment`, and `TrackingEvent` models.

Use MongoDB Compass, Prisma Studio, or the MongoDB shell to inspect the database.

cd /home/mhd/OherbTracker/libs/database
npx tsx src/seed.ts