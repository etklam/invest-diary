#!/bin/sh
set -e

# =============================================================================
# Docker Entrypoint Script for Nuxt 3 Application
# =============================================================================

echo "🚀 Starting Personal Investment Diary System..."

# Function to wait for database
wait_for_db() {
    echo "⏳ Waiting for database connection..."

    # Extract database host from DATABASE_URL
    # BusyBox grep does not support -P, use sed for compatibility
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's#mysql://[^@]*@\([^:/]*\).*#\1#p')
    [ -z "$DB_HOST" ] && DB_HOST="localhost"

    # Wait for MySQL to be ready
    max_attempts=30
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if nc -z "$DB_HOST" 3306 2>/dev/null; then
            echo "✅ Database is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        echo "⏳ Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 2
    done

    echo "❌ Database connection timeout!"
    return 1
}

# Function to run migrations
run_migrations() {
    if [ "$RUN_MIGRATIONS" = "true" ]; then
        echo "📦 Running Prisma migrations..."
        HOME=/tmp ./node_modules/.bin/prisma migrate deploy
        if [ $? -eq 0 ]; then
            echo "✅ Migrations applied successfully."
        else
            echo "❌ Migration failed!"
            return 1
        fi
    else
        echo "⏭️  Skipping migrations (RUN_MIGRATIONS=false)"
    fi
}

# Validate database schema is up-to-date by checking critical tables
validate_schema() {
    echo "🔍 Checking database schema..."

    # Extract connection details from DATABASE_URL
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's#mysql://[^@]*@\([^:/]*\).*#\1#p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's#mysql://[^@]*@[^:]*:\([0-9]*\).*#\1#p')
    [ -z "$DB_PORT" ] && DB_PORT="3306"
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's#mysql://\([^:]*\):.*#\1#p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's#mysql://[^:]*:\([^@]*\)@.*#\1#p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's#mysql://[^/]*/\([^?]*\).*#\1#p')

    # Critical tables that must exist (from schema.prisma)
    REQUIRED_TABLES="price_alerts portfolio_snapshots stock_timeline_records stock_watchlists stocks etf_alerts etf_prices etf_watchlists etfs"

    MISSING_TABLES=""
    for table in $REQUIRED_TABLES; do
        exit_code=0
        result=$(node -e "
            const mariadb = require('mariadb');
            (async () => {
                try {
                    const conn = await mariadb.createConnection({
                        host: '$DB_HOST',
                        port: $DB_PORT,
                        user: '$DB_USER',
                        password: '$DB_PASS',
                        database: '$DB_NAME',
                        connectTimeout: 5000
                    });
                    const rows = await conn.query(
                        'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
                        ['$DB_NAME', '$table']
                    );
                    await conn.end();
                    process.exit(rows[0].c > 0 ? 0 : 1);
                } catch (e) {
                    process.exit(2);
                }
            })();
        " 2>/dev/null) || exit_code=$?
        if [ $exit_code -eq 1 ]; then
            MISSING_TABLES="$MISSING_TABLES $table"
        fi
    done

    if [ -n "$MISSING_TABLES" ]; then
        echo ""
        echo "╔══════════════════════════════════════════════════════════════╗"
        echo "║  ❌ DATABASE SCHEMA IS OUT OF DATE                          ║"
        echo "║                                                              ║"
        echo "║  The following tables are missing in the database:           ║"
        for table in $MISSING_TABLES; do
            printf "║    • %-54s ║\n" "$table"
        done
        echo "║                                                              ║"
        echo "║  ACTION REQUIRED:                                            ║"
        echo "║  Run migrations BEFORE deploying this version:               ║"
        echo "║                                                              ║"
        echo "║    npx prisma migrate deploy                                 ║"
        echo "║                                                              ║"
        echo "║  Or in CapRover: add to preDeployFunction.                   ║"
        echo "╚══════════════════════════════════════════════════════════════╝"
        echo ""
        echo "⚠️  Continuing startup, but errors are expected until migrations are applied."
    else
        echo "✅ Database schema looks up-to-date."
    fi
}

# Function to seed database
seed_database() {
    if [ "$SEED_DATABASE" = "true" ]; then
        echo "❌ SEED_DATABASE=true is not supported in the slim runtime image."
        echo "   Run seed scripts in a separate admin/init container instead."
        return 1
    fi
    # If not true, do nothing and return 0
    return 0
}

# Main execution
main() {
    # Wait for database if DATABASE_URL is set
    if [ -n "$DATABASE_URL" ]; then
        wait_for_db || {
            echo "❌ Failed to connect to database. Exiting..."
            exit 1
        }
    fi

    # In CapRover, migrations are handled by preDeployFunction by default.
    # Keep runtime migrations opt-in to avoid duplicate migration runs.
    if [ -z "$RUN_MIGRATIONS" ]; then
        RUN_MIGRATIONS=false
    fi
    run_migrations || {
        echo "❌ Failed to execute migration step. Exiting..."
        exit 1
    }

    # Validate database schema (check critical tables exist)
    validate_schema

    # Seed database (if requested)
    seed_database || {
        echo "❌ Failed to execute seed step. Exiting..."
        exit 1
    }

    # Display startup information
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Environment: $NODE_ENV"
    echo "  Port: $PORT"
    echo "  Host: $HOST"
    echo "  App Name: ${NUXT_PUBLIC_APP_NAME:-投資日記}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Execute the main command
    exec "$@"
}

# Run main function
main "$@"
