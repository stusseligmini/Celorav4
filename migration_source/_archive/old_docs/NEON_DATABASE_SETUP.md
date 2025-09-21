# Neon PostgreSQL Integration Guide

This document explains how the Neon PostgreSQL database is integrated with the Celora Platform.

## Connection Details

The application connects to Neon PostgreSQL using a `DATABASE_URL` environment variable. Do NOT commit production credentials into the repository. Use your host provider's secret store (Render, Netlify, etc.).

Example (placeholder) connection string:

```
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<HOST>/<DB_NAME>?sslmode=require
```

## Schema

The database schema is defined in `neon-schema.sql` and includes the following tables:

1. `users` - Stores user information
   - `id` (Primary Key)
   - `username`
   - `email`
   - `created_at`

2. `wallets` - Stores wallet information
   - `id` (Primary Key)
   - `user_id` (Foreign Key to users)
   - `address`
   - `blockchain`
   - `balance`
   - `created_at`

## Integration

The application integrates with the database using:

1. **SQLAlchemy** - For schema definition
2. **Databases** - For async database operations
3. **asyncpg** - For PostgreSQL driver

## Failover Strategy

The application implements a failover strategy:
1. If the database connection fails, it falls back to in-memory sample data
2. When the database connection is restored, it synchronizes the data

## Environment Variables

The database connection is configured using the `DATABASE_URL` environment variable. Configure this value in the hosting provider's secret store (Render, Netlify) or export it locally for development. Example:

```
export DATABASE_URL="postgresql://<DB_USER>:<DB_PASSWORD>@<HOST>/<DB_NAME>?sslmode=require"
```

Do not commit actual credentials to the repository.

## Testing Database Connection

You can test the database connection using:

1. The `/health` endpoint - Shows the overall database status
2. The `/api/database-test` endpoint - Shows detailed connection information

## Local Development

For local development:

1. Clone the repository
2. Install dependencies: `pip install -r requirements_simple.txt`
3. Set the DATABASE_URL environment variable
4. Run the application: `uvicorn simple_app:app --reload`

## Troubleshooting

If you encounter database connection issues:

1. Check if the database URL is correct
2. Ensure the IP is allowed in the Neon firewall settings
3. Check SSL requirements (sslmode=require)
4. Verify that all required packages are installed:
   - `sqlalchemy`
   - `databases`
   - `asyncpg`
   - `psycopg2-binary`
