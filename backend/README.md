# Backend Configuration

## Required environment variables

Create a `backend/.env` file with the following keys:

```dotenv
PORT=5000
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<long_random_secret>
CORS_ORIGIN=https://aimhygienics.com,https://www.aimhygienics.com
```

### Notes

- `CORS_ORIGIN` accepts a comma-separated list of origins.
- Do **not** commit production credentials to Git.
- Keep `JWT_SECRET` long and random in production.
