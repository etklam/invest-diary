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
    DB_HOST=$(echo "$DATABASE_URL" | grep -oP 'mysql://[^@]*@\K[^:]+' || echo "localhost")

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
        echo "🔄 Running database migrations..."
        npx prisma migrate deploy
        echo "✅ Migrations completed!"
    else
        echo "⏭️  Skipping migrations (RUN_MIGRATIONS=false)"
    fi
}

# Function to seed database
seed_database() {
    if [ "$SEED_DATABASE" = "true" ]; then
        echo "🌱 Seeding database..."
        npm run seed
        echo "✅ Database seeded!"
    fi
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

    # Run migrations (default: true in production)
    if [ "$NODE_ENV" = "production" ] && [ -z "$RUN_MIGRATIONS" ]; then
        RUN_MIGRATIONS=true
    fi
    run_migrations

    # Seed database (if requested)
    seed_database

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
