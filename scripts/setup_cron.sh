#!/bin/bash
# Setup cron job for Pet Tracker Export Pipeline

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXPORT_SCRIPT="${PROJECT_DIR}/scripts/pet_tracker_export.sh"
CRON_LOG="${PROJECT_DIR}/tag_data/metadata/cron.log"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}    Pet Tracker Cron Setup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

# Check if export script exists
if [ ! -f "$EXPORT_SCRIPT" ]; then
    echo -e "${RED}❌ Export script not found at: $EXPORT_SCRIPT${NC}"
    exit 1
fi

# Create cron wrapper script with proper environment
CRON_WRAPPER="${PROJECT_DIR}/scripts/cron_wrapper.sh"
cat > "$CRON_WRAPPER" << EOF
#!/bin/bash
# Cron wrapper for Pet Tracker Export
# This ensures proper environment and logging

# Set up environment
export PATH="/usr/local/bin:/usr/bin:/bin:\$PATH"

# Log start
echo "[\$(date '+%Y-%m-%d %H:%M:%S')] Starting scheduled export..." >> "$CRON_LOG"

# Run the export script
"$EXPORT_SCRIPT" >> "$CRON_LOG" 2>&1

# Log completion
echo "[\$(date '+%Y-%m-%d %H:%M:%S')] Export completed" >> "$CRON_LOG"
echo "----------------------------------------" >> "$CRON_LOG"
EOF

chmod +x "$CRON_WRAPPER"
echo -e "${GREEN}✅ Created cron wrapper script${NC}"

# Display cron schedule options
echo -e "\n${YELLOW}Choose your update frequency:${NC}"
echo "1) Every minute (testing)"
echo "2) Every 5 minutes"
echo "3) Every 15 minutes"
echo "4) Every 30 minutes"
echo "5) Every hour"
echo "6) Every 6 hours"
echo "7) Once daily at midnight"
echo "8) Custom schedule"

read -p "Select option (1-8): " choice

case $choice in
    1) CRON_SCHEDULE="* * * * *" ; DESC="every minute" ;;
    2) CRON_SCHEDULE="*/5 * * * *" ; DESC="every 5 minutes" ;;
    3) CRON_SCHEDULE="*/15 * * * *" ; DESC="every 15 minutes" ;;
    4) CRON_SCHEDULE="*/30 * * * *" ; DESC="every 30 minutes" ;;
    5) CRON_SCHEDULE="0 * * * *" ; DESC="every hour" ;;
    6) CRON_SCHEDULE="0 */6 * * *" ; DESC="every 6 hours" ;;
    7) CRON_SCHEDULE="0 0 * * *" ; DESC="daily at midnight" ;;
    8) 
        echo "Enter custom cron schedule (e.g., '*/10 * * * *' for every 10 minutes):"
        read CRON_SCHEDULE
        DESC="custom schedule"
        ;;
    *) 
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

# Create the cron job entry
CRON_JOB="$CRON_SCHEDULE $CRON_WRAPPER"

echo -e "\n${BLUE}Cron job to be added:${NC}"
echo "$CRON_JOB"
echo -e "${YELLOW}This will run $DESC${NC}"

# Ask for confirmation
read -p "Do you want to add this cron job? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo -e "${YELLOW}Cron setup cancelled${NC}"
    exit 0
fi

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$EXPORT_SCRIPT"; then
    echo -e "${YELLOW}⚠️  A cron job for this script already exists:${NC}"
    crontab -l | grep "$EXPORT_SCRIPT"
    read -p "Do you want to replace it? (y/n): " replace
    if [ "$replace" == "y" ]; then
        # Remove existing job
        crontab -l 2>/dev/null | grep -v "$EXPORT_SCRIPT" | crontab -
        echo -e "${GREEN}✅ Removed existing cron job${NC}"
    else
        echo -e "${YELLOW}Keeping existing cron job${NC}"
        exit 0
    fi
fi

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
echo -e "${GREEN}✅ Cron job added successfully!${NC}"

# Display current cron jobs
echo -e "\n${BLUE}Current cron jobs:${NC}"
crontab -l | grep -E "(pet_tracker|cron_wrapper)" || echo "No pet tracker cron jobs found"

# Create systemd alternative (for Linux systems)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo -e "\n${BLUE}Creating systemd timer (Linux alternative to cron)...${NC}"
    
    # Create service file
    SYSTEMD_SERVICE="/tmp/pet-tracker-export.service"
    cat > "$SYSTEMD_SERVICE" << EOF
[Unit]
Description=Pet Tracker Export Service
After=network.target

[Service]
Type=oneshot
ExecStart=$EXPORT_SCRIPT
WorkingDirectory=$PROJECT_DIR
StandardOutput=append:$CRON_LOG
StandardError=append:$CRON_LOG

[Install]
WantedBy=multi-user.target
EOF

    # Create timer file
    SYSTEMD_TIMER="/tmp/pet-tracker-export.timer"
    cat > "$SYSTEMD_TIMER" << EOF
[Unit]
Description=Pet Tracker Export Timer
Requires=pet-tracker-export.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
EOF

    echo -e "${YELLOW}Systemd files created in /tmp/${NC}"
    echo "To install systemd timer (requires sudo):"
    echo "  sudo cp /tmp/pet-tracker-export.* /etc/systemd/system/"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable --now pet-tracker-export.timer"
fi

# Display management commands
echo -e "\n${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}Setup complete!${NC}"
echo -e "\n${BLUE}Useful commands:${NC}"
echo "  View cron jobs:     crontab -l"
echo "  Edit cron jobs:     crontab -e"
echo "  Remove all crons:   crontab -r"
echo "  View cron log:      tail -f $CRON_LOG"
echo "  Test export:        $EXPORT_SCRIPT"
echo -e "\n${BLUE}Cron schedule reference:${NC}"
echo "  * * * * *  = every minute"
echo "  */5 * * * * = every 5 minutes"
echo "  0 * * * *  = every hour"
echo "  0 0 * * *  = daily at midnight"
echo "  0 */6 * * * = every 6 hours"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"