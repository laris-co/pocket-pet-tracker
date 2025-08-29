#!/bin/bash
# Pet Tracker Export Pipeline
# Main automation script for exporting tag location data using DuckDB
# Handles initial export, incremental updates, and multi-format output

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="${PROJECT_DIR}/tag_data"
METADATA_DIR="${DATA_DIR}/metadata"
LOG_FILE="${METADATA_DIR}/export.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "$1"
    [ -f "$LOG_FILE" ] && echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Error handling
error_exit() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    exit 1
}

# Check prerequisites
check_requirements() {
    command -v duckdb >/dev/null 2>&1 || error_exit "DuckDB not found. Please install DuckDB first."
    [ -f "${PROJECT_DIR}/Items.data" ] || error_exit "Items.data not found. Please ensure the symlink exists."
}

# Initialize directories
init_directories() {
    mkdir -p "$DATA_DIR"
    mkdir -p "$METADATA_DIR"
    mkdir -p "${DATA_DIR}/exports/json"
    mkdir -p "${DATA_DIR}/exports/csv"
    touch "$LOG_FILE"  # Create log file if it doesn't exist
    log "${BLUE}📁 Initializing directories...${NC}"
}

# Check if this is first run or incremental
check_existing_data() {
    if [ -d "$DATA_DIR" ] && ls "$DATA_DIR"/tag_id=*/locations.parquet 1> /dev/null 2>&1; then
        return 0  # Data exists
    else
        return 1  # No data
    fi
}

# Main export function
run_export() {
    local mode=$1
    
    if [ "$mode" == "initial" ]; then
        log "${BLUE}🚀 Running initial export...${NC}"
        duckdb < "${SCRIPT_DIR}/export_tags.sql" || error_exit "Initial export failed"
    else
        log "${BLUE}🔄 Running incremental export...${NC}"
        duckdb < "${SCRIPT_DIR}/export_tags_incremental.sql" || error_exit "Incremental export failed"
    fi
}

# Export to JSON/CSV formats
export_formats() {
    if [ "$1" == "json" ] || [ "$1" == "all" ]; then
        log "${BLUE}📄 Exporting to JSON and CSV formats...${NC}"
        "${SCRIPT_DIR}/export_tags_json.sh" || error_exit "JSON/CSV export failed"
    fi
}

# Generate statistics
generate_stats() {
    log "${BLUE}📊 Generating statistics...${NC}"
    
    duckdb -markdown << EOF > "${METADATA_DIR}/stats.md"
-- Overall Statistics
SELECT 
    'Overall Stats' as category,
    COUNT(DISTINCT tag_id) as total_tags,
    COUNT(*) as total_records,
    COUNT(DISTINCT location_hash) as unique_locations,
    MIN(datetime) as earliest_record,
    MAX(datetime) as latest_record
FROM 'tag_data/**/*.parquet';

-- Per-Tag Statistics with Enhanced Metrics
SELECT 
    tag_id,
    name,
    COUNT(*) as records,
    MIN(datetime) as first_seen,
    MAX(datetime) as last_seen,
    ROUND(AVG(accuracy), 2) as avg_accuracy_m,
    SUM(CASE WHEN is_inaccurate THEN 1 ELSE 0 END) as inaccurate_count,
    MAX(battery) as last_battery
FROM 'tag_data/**/*.parquet'
GROUP BY tag_id, name
ORDER BY tag_id;
EOF
    
    log "${GREEN}📈 Statistics saved to ${METADATA_DIR}/stats.md${NC}"
}

# Save metadata
save_metadata() {
    local timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    local record_count=$(duckdb -csv -noheader -c "SELECT COUNT(*) FROM 'tag_data/**/*.parquet'" 2>/dev/null || echo "0")
    
    cat > "${METADATA_DIR}/last_export.json" << EOF
{
    "timestamp": "${timestamp}",
    "total_records": ${record_count},
    "export_type": "$1",
    "status": "success"
}
EOF
}

# Main execution
main() {
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}    Pet Tracker DuckDB Export Pipeline${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    
    # Check requirements
    check_requirements
    
    # Initialize
    init_directories
    
    # Determine export mode
    if check_existing_data; then
        log "${YELLOW}📦 Existing data found. Running incremental update...${NC}"
        run_export "incremental"
        EXPORT_TYPE="incremental"
    else
        log "${YELLOW}🆕 No existing data. Running initial export...${NC}"
        run_export "initial"
        EXPORT_TYPE="initial"
    fi
    
    # Export additional formats if requested
    if [ "$1" == "--json" ] || [ "$1" == "--all" ]; then
        export_formats "$1"
    fi
    
    # Generate statistics
    generate_stats
    
    # Save metadata
    save_metadata "$EXPORT_TYPE"
    
    # Summary
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    log "${GREEN}✅ Export pipeline completed successfully!${NC}"
    log "${GREEN}📁 Data location: ${DATA_DIR}${NC}"
    log "${GREEN}📊 Statistics: ${METADATA_DIR}/stats.md${NC}"
    log "${GREEN}📝 Log file: ${LOG_FILE}${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
}

# Handle command line arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --json    Also export to JSON and CSV formats"
        echo "  --all     Export all formats (Parquet, JSON, CSV)"
        echo "  --stats   Only generate statistics"
        echo "  --help    Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                # Run export (initial or incremental)"
        echo "  $0 --json         # Export and create JSON/CSV files"
        echo "  $0 --stats        # Only generate statistics"
        exit 0
        ;;
    --stats)
        check_requirements
        init_directories
        generate_stats
        exit 0
        ;;
    *)
        main "$1"
        ;;
esac