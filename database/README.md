# Database Schema

This directory contains the database schema and migration files for the Investment Diary System.

## Files

- `schema.sql` - Complete database schema (MySQL compatible)
- `README.md` - This file

## Usage

### Option 1: Direct SQL Execution

```bash
mysql -u username -p database_name < database/schema.sql
```

### Option 2: MySQL Workbench/phpMyAdmin

1. Open your MySQL client
2. Select/create your database
3. Execute the contents of `schema.sql`

### Option 3: Prisma Migrate (Recommended for Development)

```bash
npx prisma migrate dev --name init
```

### Option 4: Docker Container (Production)

Set environment variable:
```bash
RUN_MIGRATIONS=true
```

The container will automatically run migrations on startup.

## Schema Overview

### Tables

1. **users** - User accounts and settings
2. **diaries** - Investment diary entries
3. **alerts** - Notification alerts for diary entries
4. **transactions** - Stock buy/sell transactions

### Relationships

- `users` ← `diaries` (one-to-many)
- `diaries` ← `alerts` (one-to-many)
- `diaries` ← `transactions` (one-to-many)

## Features

- UTF-8MB4 charset (full Unicode/emoji support)
- Foreign key constraints with CASCADE delete
- Optimized indexes for common queries
- Millisecond precision timestamps
- High-precision decimal fields for financial data

## Sample Data

The schema includes commented sample data for development. Uncomment the section in `schema.sql` to populate with test data.

## Migration Strategy

For production deployments:
1. Use Prisma migrations for version control
2. Keep `schema.sql` as a reference and for manual setups
3. Always backup before applying migrations

## Notes

- Compatible with MySQL 5.7+ and MySQL 8.0+
- Generated from `prisma/schema.prisma`
- To regenerate: `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`