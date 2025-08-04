#!/bin/bash

# Script to set up test database with all migrations
# Usage: ./scripts/setup-test-db.sh

set -e  # Exit on error

echo "🔧 Setting up test database..."

# Default values
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="reprint_studios_test"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql command not found. Please install PostgreSQL.${NC}"
    exit 1
fi

# Check if database exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}⚠️  Database '$DB_NAME' already exists${NC}"
    
    # Ask if user wants to drop and recreate
    read -p "Do you want to drop and recreate the database? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
        echo -e "${GREEN}✅ Database recreated${NC}"
    fi
else
    # Create database
    echo "Creating database '$DB_NAME'..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✅ Database created${NC}"
fi

# Apply migrations in order
echo "📋 Applying migrations..."

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
MIGRATIONS_DIR="$PROJECT_ROOT/migrations"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}❌ Migrations directory not found at $MIGRATIONS_DIR${NC}"
    exit 1
fi

# Apply each migration file in order
for migration in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration" ]; then
        filename=$(basename "$migration")
        echo "  Applying $filename..."
        
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✅ $filename applied${NC}"
        else
            echo -e "  ${RED}❌ Failed to apply $filename${NC}"
            echo "  Error output:"
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration"
            exit 1
        fi
    fi
done

# Verify setup
echo "🔍 Verifying database setup..."

# Check for key tables
TABLES_TO_CHECK="users projects files invoices messages project_phases"
MISSING_TABLES=()

for table in $TABLES_TO_CHECK; do
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt $table" | grep -q "$table"; then
        echo -e "  ${GREEN}✅ Table '$table' exists${NC}"
    else
        MISSING_TABLES+=("$table")
        echo -e "  ${RED}❌ Table '$table' missing${NC}"
    fi
done

# Check for test users
echo "🔍 Checking for test users..."
USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE email IN ('kendrick@reprintstudios.com', 'client@example.com');")

if [ "$USER_COUNT" -eq "2" ]; then
    echo -e "  ${GREEN}✅ Test users found${NC}"
else
    echo -e "  ${YELLOW}⚠️  Test users missing or incomplete (found $USER_COUNT/2)${NC}"
fi

# Summary
echo ""
echo "================== SUMMARY =================="

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Test database setup complete!${NC}"
    echo ""
    echo "Database connection string:"
    echo "postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    echo ""
    echo "To run tests, use:"
    echo "export TEST_DATABASE_URL=\"postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME\""
    echo "npm test"
else
    echo -e "${RED}❌ Setup incomplete - missing tables: ${MISSING_TABLES[@]}${NC}"
    echo "Please check the migration files and try again."
    exit 1
fi