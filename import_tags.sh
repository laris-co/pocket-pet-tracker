#!/bin/bash

# Pocket Pet Tracker - Import Tags Script
# Usage: ./import_tags.sh [source_name]

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:8090/recv"
ITEMS_FILE="/Users/nat/Code/github.com/laris-co/pocket-pet-tracker/Items.data"

# Check if Items.data exists
if [ ! -f "$ITEMS_FILE" ]; then
    echo -e "${RED}❌ Error: Items.data not found at $ITEMS_FILE${NC}"
    exit 1
fi

# Get source name from argument or use default
SOURCE_NAME=${1:-"manual_import"}

# Generate MD5 hash of Items.data file content for proper deduplication
MD5_HASH=$(md5 -q "$ITEMS_FILE")

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🏷️  Pocket Pet Tracker - Tag Import${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📁 Data file:${NC} $ITEMS_FILE"
echo -e "${YELLOW}📊 File size:${NC} $(wc -c < "$ITEMS_FILE") bytes"
echo -e "${YELLOW}🎯 Target URL:${NC} $API_URL"
echo -e "${YELLOW}📝 Source:${NC} $SOURCE_NAME"
echo -e "${YELLOW}🔑 Content MD5:${NC} $MD5_HASH"
echo -e "${YELLOW}⏰ Timestamp:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📤 Sending data...${NC}"
echo ""

# Send the request and capture response
RESPONSE=$(jq -n --slurpfile data "$ITEMS_FILE" \
    --arg md5 "$MD5_HASH" \
    --arg source "$SOURCE_NAME" \
    '{md5: $md5, content: $data[0], source: $source}' | \
    curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d @-)

# Check if curl succeeded
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to send request${NC}"
    exit 1
fi

# Parse response using jq
STATUS=$(echo "$RESPONSE" | jq -r '.status')
IMPORT_ID=$(echo "$RESPONSE" | jq -r '.import_id')
ITEMS_COUNT=$(echo "$RESPONSE" | jq -r '.items_count')
PROCESSED=$(echo "$RESPONSE" | jq -r '.processed_locations')
IMPORTED_AT=$(echo "$RESPONSE" | jq -r '.imported_at')
ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error')

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📥 Response:${NC}"
echo ""

if [ "$STATUS" = "ok" ]; then
    echo -e "${GREEN}✅ Import Successful!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Details:${NC}"
    echo -e "  • Import ID: ${GREEN}$IMPORT_ID${NC}"
    echo -e "  • Total Items: ${GREEN}$ITEMS_COUNT${NC}"
    echo -e "  • Processed Locations: ${GREEN}$PROCESSED${NC}"
elif [ "$STATUS" = "duplicated" ]; then
    echo -e "${YELLOW}⚠️  Import Duplicated${NC}"
    echo ""
    echo -e "${YELLOW}📋 Details:${NC}"
    echo -e "  • Existing Import ID: ${YELLOW}$IMPORT_ID${NC}"
    echo -e "  • Originally Imported: ${YELLOW}$IMPORTED_AT${NC}"
elif [ "$STATUS" = "error" ]; then
    echo -e "${RED}❌ Import Error${NC}"
    echo ""
    echo -e "${RED}📋 Details:${NC}"
    echo -e "  • Error: ${RED}$ERROR_MSG${NC}"
else
    echo -e "${RED}❌ Unexpected Response:${NC}"
    echo "$RESPONSE" | jq '.'
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Done!${NC}"

# Optional: Show server logs if in debug mode
if [ "$2" = "--debug" ]; then
    echo ""
    echo -e "${YELLOW}🔍 Debug Mode - Recent Server Logs:${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    tail -20 /tmp/pb_server.log 2>/dev/null | grep -E "Data Import|Tag" || echo "No logs available"
fi
