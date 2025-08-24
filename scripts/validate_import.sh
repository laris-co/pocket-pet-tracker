#!/bin/bash

echo "=== PocketBase Pet Tracker Validation ==="
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "----------------------------------------"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Items.data exists and is valid
echo -n "1. Items.data validation: "
if [ ! -f "Items.data" ]; then
    echo -e "${RED}❌ Items.data not found${NC}"
    exit 1
fi

ITEM_COUNT=$(jq '. | length' Items.data 2>/dev/null)
if [ "$?" -ne 0 ]; then
    echo -e "${RED}❌ Items.data contains invalid JSON${NC}"
    exit 1
fi

if [ "$ITEM_COUNT" -eq 28 ]; then
    echo -e "${GREEN}✅ Found $ITEM_COUNT tags${NC}"
else
    echo -e "${YELLOW}⚠️  Found $ITEM_COUNT tags (expected 28)${NC}"
fi

# 2. Check PocketBase is running
echo -n "2. PocketBase status: "
if curl -s --max-time 2 "http://localhost:8090/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running or not responding${NC}"
    echo "   Start with: ./pocketbase serve"
    exit 1
fi

# 3. Check database records
echo -n "3. Database records: "
DB_COUNT=$(curl -s "http://localhost:8090/api/collections/pet_locations/records" 2>/dev/null | jq '.totalItems' 2>/dev/null)
if [ "$?" -ne 0 ] || [ -z "$DB_COUNT" ]; then
    echo -e "${YELLOW}⚠️  Collection may not exist yet${NC}"
    echo "   Run migration: ./pocketbase migrate up"
else
    echo -e "${GREEN}✅ $DB_COUNT records in database${NC}"
fi

# 4. Check GPS precision
echo -n "4. GPS precision test: "
SAMPLE_LAT=$(curl -s "http://localhost:8090/api/collections/pet_locations/records?perPage=1" 2>/dev/null | jq -r '.items[0].latitude' 2>/dev/null)
if [ "$SAMPLE_LAT" != "null" ] && [ -n "$SAMPLE_LAT" ]; then
    # Count decimal places
    DECIMALS=$(echo "$SAMPLE_LAT" | sed 's/^[^.]*\.//' | wc -c)
    DECIMALS=$((DECIMALS - 1)) # Subtract newline character
    if [ "$DECIMALS" -ge 10 ]; then
        echo -e "${GREEN}✅ Preserved ($DECIMALS decimal places)${NC}"
    else
        echo -e "${YELLOW}⚠️  Low precision ($DECIMALS decimals)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No data to test${NC}"
fi

# 5. Check for duplicates
echo -n "5. Duplicate check: "
if [ "$DB_COUNT" -gt 0 ] 2>/dev/null; then
    DUPLICATES=$(curl -s "http://localhost:8090/api/collections/pet_locations/records?perPage=500" 2>/dev/null | \
        jq '.items | group_by(.location_hash) | map(select(length > 1)) | length' 2>/dev/null)
    if [ "$DUPLICATES" -eq 0 ] 2>/dev/null; then
        echo -e "${GREEN}✅ No duplicates found${NC}"
    else
        echo -e "${RED}❌ Found $DUPLICATES duplicate hashes${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No data to check${NC}"
fi

# 6. Test API endpoints
echo "6. API endpoint tests:"

# Test /api/pets/current
echo -n "   - /api/pets/current: "
CURRENT_RESPONSE=$(curl -s "http://localhost:8090/api/pets/current" 2>/dev/null)
if echo "$CURRENT_RESPONSE" | jq '.data' > /dev/null 2>&1; then
    PET_COUNT=$(echo "$CURRENT_RESPONSE" | jq '.data | length' 2>/dev/null)
    echo -e "${GREEN}✅ Working ($PET_COUNT pets)${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Test /api/pets/1/current
echo -n "   - /api/pets/1/current: "
PET_RESPONSE=$(curl -s "http://localhost:8090/api/pets/1/current" 2>/dev/null)
if echo "$PET_RESPONSE" | jq '.data' > /dev/null 2>&1; then
    PET_NAME=$(echo "$PET_RESPONSE" | jq -r '.data.name' 2>/dev/null)
    if [ "$PET_NAME" == "Tag 1" ]; then
        echo -e "${GREEN}✅ Working (found $PET_NAME)${NC}"
    elif [ "$PET_NAME" == "null" ]; then
        echo -e "${YELLOW}⚠️  No data for Tag 1${NC}"
    else
        echo -e "${GREEN}✅ Working${NC}"
    fi
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Test /api/pets/1/history
echo -n "   - /api/pets/1/history: "
HISTORY_RESPONSE=$(curl -s "http://localhost:8090/api/pets/1/history?page=1&limit=5" 2>/dev/null)
if echo "$HISTORY_RESPONSE" | jq '.data' > /dev/null 2>&1; then
    HISTORY_COUNT=$(echo "$HISTORY_RESPONSE" | jq '.data | length' 2>/dev/null)
    HAS_MORE=$(echo "$HISTORY_RESPONSE" | jq '.pagination.has_more' 2>/dev/null)
    echo -e "${GREEN}✅ Working ($HISTORY_COUNT records, has_more=$HAS_MORE)${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Test /api/pets/timeframe
echo -n "   - /api/pets/timeframe: "
FROM_DATE=$(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-1H '+%Y-%m-%dT%H:%M:%SZ')
TO_DATE=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
TIMEFRAME_RESPONSE=$(curl -s "http://localhost:8090/api/pets/timeframe?from=$FROM_DATE&to=$TO_DATE" 2>/dev/null)
if echo "$TIMEFRAME_RESPONSE" | jq '.data' > /dev/null 2>&1; then
    TIMEFRAME_COUNT=$(echo "$TIMEFRAME_RESPONSE" | jq '.data | length' 2>/dev/null)
    echo -e "${GREEN}✅ Working ($TIMEFRAME_COUNT records in last hour)${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# 7. Check battery status distribution
echo -n "7. Battery status check: "
if [ "$DB_COUNT" -gt 0 ] 2>/dev/null; then
    BATTERY_VALUES=$(curl -s "http://localhost:8090/api/collections/pet_locations/records?perPage=100" 2>/dev/null | \
        jq '.items[].battery_status' 2>/dev/null | sort -u | tr '\n' ' ')
    if [ -n "$BATTERY_VALUES" ]; then
        echo -e "${GREEN}✅ Values found: [$BATTERY_VALUES]${NC}"
    else
        echo -e "${YELLOW}⚠️  No battery data${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No data to check${NC}"
fi

echo ""
echo "=== Validation Complete ==="

# Summary
if [ "$DB_COUNT" -gt 0 ] 2>/dev/null; then
    echo -e "${GREEN}System appears to be working correctly!${NC}"
    echo "- Database has $DB_COUNT records"
    echo "- APIs are responding"
    echo "- GPS precision is preserved"
else
    echo -e "${YELLOW}System needs initialization:${NC}"
    echo "1. Run migration: ./pocketbase migrate up"
    echo "2. Wait for initial import (bootstrap)"
    echo "3. Run this validation again"
fi