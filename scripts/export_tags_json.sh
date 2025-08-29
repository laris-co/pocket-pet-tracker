#!/bin/bash
# Export tag data to JSON format
# Since DuckDB doesn't support PARTITION_BY for JSON, we export each tag individually

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting JSON export for all tags...${NC}"

# Create export directories
mkdir -p tag_data/exports/json
mkdir -p tag_data/exports/csv

# Export function for a single tag
export_tag() {
    local tag_id=$1
    local tag_name="Tag ${tag_id}"
    
    echo -e "${YELLOW}  Exporting ${tag_name}...${NC}"
    
    # Export as JSON (array format)
    duckdb -json -c "
        SELECT 
            name,
            tag_id,
            datetime,
            timestamp_ms,
            latitude,
            longitude,
            accuracy,
            battery,
            is_inaccurate,
            location_hash
        FROM 'tag_data/tag_id=${tag_id}/*.parquet'
        ORDER BY timestamp_ms DESC
    " > "tag_data/exports/json/tag_${tag_id}.json" 2>/dev/null || {
        # If no data exists for this tag, create empty array
        echo "[]" > "tag_data/exports/json/tag_${tag_id}.json"
    }
    
    # Also export as CSV for convenience
    duckdb -csv -c "
        SELECT 
            name,
            datetime,
            latitude,
            longitude,
            accuracy,
            battery,
            location_hash
        FROM 'tag_data/tag_id=${tag_id}/*.parquet'
        ORDER BY timestamp_ms DESC
    " > "tag_data/exports/csv/tag_${tag_id}.csv" 2>/dev/null || {
        # If no data, create header-only CSV
        echo "name,datetime,latitude,longitude,accuracy,battery,location_hash" > "tag_data/exports/csv/tag_${tag_id}.csv"
    }
}

# Export all tags (1-28)
for i in {1..28}; do
    export_tag $i
done

# Create combined JSON file with all tags
echo -e "${BLUE}📦 Creating combined JSON file...${NC}"
duckdb -json -c "
    SELECT 
        tag_id,
        name,
        datetime,
        timestamp_ms,
        latitude,
        longitude,
        accuracy,
        battery,
        is_inaccurate,
        location_hash
    FROM 'tag_data/**/*.parquet'
    ORDER BY tag_id, timestamp_ms DESC
" > "tag_data/exports/all_tags.json" 2>/dev/null || echo "[]" > "tag_data/exports/all_tags.json"

# Generate summary report
echo -e "${BLUE}📊 Generating summary...${NC}"
duckdb -markdown << EOF
SELECT 
    tag_id,
    COUNT(*) as records,
    MIN(datetime) as earliest,
    MAX(datetime) as latest
FROM 'tag_data/**/*.parquet'
GROUP BY tag_id
ORDER BY tag_id;
EOF

echo -e "${GREEN}✅ JSON export complete!${NC}"
echo -e "${GREEN}📁 Files saved in:${NC}"
echo "   - tag_data/exports/json/  (individual JSON files)"
echo "   - tag_data/exports/csv/   (individual CSV files)"
echo "   - tag_data/exports/all_tags.json (combined data)"