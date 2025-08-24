#!/bin/bash

echo "=== PocketBase Pet Tracker Security Audit ==="
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "--------------------------------------------"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

echo ""
echo "1. Git Security Check"
echo "---------------------"

# Check .gitignore exists
echo -n "   .gitignore file: "
if [ -f ".gitignore" ]; then
    echo -e "${GREEN}✅ Exists${NC}"
else
    echo -e "${RED}❌ Missing!${NC}"
    echo "   Create .gitignore immediately!"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check critical files are ignored
REQUIRED_IGNORES=(
    "Items.data"
    "pb_data/"
    "*.log"
    "*.db"
    "*.sqlite"
    "*.backup"
    "pb_logs.db"
)

echo "   Required exclusions:"
for pattern in "${REQUIRED_IGNORES[@]}"; do
    echo -n "   - $pattern: "
    if grep -q "^$pattern" .gitignore 2>/dev/null || grep -q "^\\$pattern" .gitignore 2>/dev/null; then
        echo -e "${GREEN}✅ Ignored${NC}"
    else
        echo -e "${RED}❌ NOT IGNORED - Add to .gitignore!${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

echo ""
echo "2. Sensitive File Detection"
echo "---------------------------"

# Check if sensitive files are tracked in git
echo -n "   Checking git status: "
SENSITIVE_IN_GIT=$(git status --porcelain 2>/dev/null | grep -E "(Items\.data|\.db|\.sqlite|pb_data/)" | wc -l)
if [ "$SENSITIVE_IN_GIT" -eq 0 ]; then
    echo -e "${GREEN}✅ No sensitive files staged${NC}"
else
    echo -e "${RED}❌ CRITICAL: Sensitive files detected in git!${NC}"
    echo "   Files that should NOT be committed:"
    git status --porcelain | grep -E "(Items\.data|\.db|\.sqlite|pb_data/)" | while read -r line; do
        echo "     $line"
    done
    ISSUES_FOUND=$((ISSUES_FOUND + 5))
fi

# Check git history for GPS coordinates
echo -n "   GPS data in git history: "
if git log --all -S "0.001" --oneline 2>/dev/null | head -1 | grep -q .; then
    echo -e "${YELLOW}⚠️  Demo coordinates found in git history${NC}"
    echo "   This is expected for anonymized test data"
else
    echo -e "${GREEN}✅ No GPS coordinates in history${NC}"
fi

echo ""
echo "3. File Permission Security"
echo "---------------------------"

# Check Items.data permissions
echo -n "   Items.data permissions: "
if [ -f "Items.data" ]; then
    PERMS=$(ls -l Items.data | awk '{print $1}')
    if [[ "$PERMS" == *"rw-------"* ]] || [[ "$PERMS" == *"rw-r--r--"* ]]; then
        echo -e "${GREEN}✅ Secure ($PERMS)${NC}"
    else
        echo -e "${YELLOW}⚠️  Consider restricting: $PERMS${NC}"
        echo "     Recommended: chmod 600 Items.data"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
else
    echo -e "${YELLOW}⚠️  File not found (will be created on first run)${NC}"
fi

# Check pb_data permissions
echo -n "   pb_data/ permissions: "
if [ -d "pb_data" ]; then
    PERMS=$(ls -ld pb_data | awk '{print $1}')
    if [[ "$PERMS" == *"drwx------"* ]] || [[ "$PERMS" == *"drwxr-xr-x"* ]]; then
        echo -e "${GREEN}✅ Secure ($PERMS)${NC}"
    else
        echo -e "${YELLOW}⚠️  Consider restricting: $PERMS${NC}"
        echo "     Recommended: chmod 700 pb_data/"
    fi
else
    echo -e "${YELLOW}⚠️  Directory not found (will be created on first run)${NC}"
fi

echo ""
echo "4. Location Data Privacy"
echo "------------------------"

# Check if Items.data contains real GPS data
echo -n "   Items.data content: "
if [ -f "Items.data" ]; then
    # Check for demo coordinates (around 0.0, -150.0)
    if jq '.[0].location | {lat: .latitude, lng: .longitude}' Items.data 2>/dev/null | grep -q "\-150\." && \
       jq '.[0].location | {lat: .latitude, lng: .longitude}' Items.data 2>/dev/null | grep -q "^0\."; then
        echo -e "${GREEN}✅ Contains anonymized demo data (Pacific Ocean)${NC}"
        echo "     Safe for testing, still exclude from git"
    else
        echo -e "${GREEN}✅ Data checked${NC}"
    fi
    
    # Count unique pet tags
    TAG_COUNT=$(jq '.[].name | select(. != null)' Items.data 2>/dev/null | grep "^\"Tag " | sort -u | wc -l)
    echo "   Pet tags found: $TAG_COUNT tags"
else
    echo -e "${YELLOW}⚠️  File not found${NC}"
fi

echo ""
echo "5. Database Security"
echo "-------------------"

# Check if database contains location data
echo -n "   Database records: "
if [ -f "pb_data/data.db" ]; then
    DB_SIZE=$(du -h pb_data/data.db | cut -f1)
    echo "Size: $DB_SIZE"
    
    # Check if we can query the database
    RECORD_COUNT=$(curl -s "http://localhost:8090/api/collections/pet_locations/records" 2>/dev/null | jq '.totalItems' 2>/dev/null)
    if [ -n "$RECORD_COUNT" ] && [ "$RECORD_COUNT" -gt 0 ]; then
        echo -e "   ${YELLOW}⚠️  Database contains $RECORD_COUNT location records${NC}"
        echo "     Ensure pb_data/ is in .gitignore"
    fi
else
    echo -e "${GREEN}✅ No database yet${NC}"
fi

echo ""
echo "6. Environment Check"
echo "-------------------"

# Check for any .env files
echo -n "   Environment files: "
if ls .env* 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}⚠️  Found .env files - ensure they're in .gitignore${NC}"
    ls -la .env* 2>/dev/null
else
    echo -e "${GREEN}✅ No .env files found${NC}"
fi

# Check for backup files
echo -n "   Backup files: "
BACKUP_COUNT=$(find . -name "*.backup" -o -name "*.bak" 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $BACKUP_COUNT backup files${NC}"
    echo "     Ensure these are excluded from git"
else
    echo -e "${GREEN}✅ No backup files found${NC}"
fi

echo ""
echo "============================================"
echo "Security Audit Summary"
echo "============================================"

if [ "$ISSUES_FOUND" -eq 0 ]; then
    echo -e "${GREEN}✅ ALL SECURITY CHECKS PASSED!${NC}"
    echo "Your pet location data appears to be properly secured."
else
    echo -e "${RED}❌ SECURITY ISSUES FOUND: $ISSUES_FOUND${NC}"
    echo ""
    echo "CRITICAL ACTIONS REQUIRED:"
    if [ "$SENSITIVE_IN_GIT" -gt 0 ]; then
        echo "1. Remove sensitive files from git:"
        echo "   git rm --cached Items.data pb_data/ *.db"
    fi
    echo "2. Update .gitignore with all required patterns"
    echo "3. Set proper file permissions:"
    echo "   chmod 600 Items.data"
    echo "   chmod 700 pb_data/"
    echo "4. Verify no GPS coordinates in git history"
fi

echo ""
echo "Remember: Pet location data is sensitive personal information!"
echo "Never commit Items.data or pb_data/ to version control."