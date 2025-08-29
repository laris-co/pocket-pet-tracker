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

# Generate unique MD5 hash with timestamp
TIMESTAMP=$(date +%s)
UNIQUE_STRING="${SOURCE_NAME}_${TIMESTAMP}"
MD5_HASH=$(echo -n "$UNIQUE_STRING" | md5 -q)

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🏷️  Pocket Pet Tracker - Tag Import${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📁 Data file:${NC} $ITEMS_FILE"
echo -e "${YELLOW}🎯 Target URL:${NC} $API_URL"
echo -e "${YELLOW}📝 Source:${NC} $SOURCE_NAME"
echo -e "${YELLOW}🔑 MD5 Hash:${NC} $MD5_HASH"
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
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
IMPORT_ID=$(echo "$RESPONSE" | jq -r '.import_id')
ITEMS_COUNT=$(echo "$RESPONSE" | jq -r '.items_count')
MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
STATUS=$(echo "$RESPONSE" | jq -r '.status')
PROCESSED=$(echo "$RESPONSE" | jq -r '.processed_locations')

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📥 Response:${NC}"
echo ""

if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Import Successful!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Details:${NC}"
    echo -e "  • Import ID: ${GREEN}$IMPORT_ID${NC}"
    echo -e "  • Total Items: ${GREEN}$ITEMS_COUNT${NC}"
    echo -e "  • Status: ${GREEN}$STATUS${NC}"
    echo -e "  • Processed Locations: ${GREEN}$PROCESSED${NC}"
    echo -e "  • Message: $MESSAGE"
elif [ "$SUCCESS" = "false" ]; then
    echo -e "${YELLOW}⚠️  Import Skipped${NC}"
    echo ""
    echo -e "${YELLOW}📋 Details:${NC}"
    echo -e "  • Message: $MESSAGE"
    if [ ! -z "$IMPORT_ID" ] && [ "$IMPORT_ID" != "null" ]; then
        echo -e "  • Existing Import ID: ${YELLOW}$IMPORT_ID${NC}"
        echo -e "  • Status: ${YELLOW}$STATUS${NC}"
    fi
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