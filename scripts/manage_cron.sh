#!/bin/bash
# Manage Pet Tracker cron jobs

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CRON_LOG="${PROJECT_DIR}/tag_data/metadata/cron.log"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

show_menu() {
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${BLUE}    Pet Tracker Cron Manager${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo "1) View current cron jobs"
    echo "2) View cron log (last 20 lines)"
    echo "3) Follow cron log (real-time)"
    echo "4) Test export now"
    echo "5) Disable cron job"
    echo "6) Enable/Setup cron job"
    echo "7) Clear cron log"
    echo "8) Show cron syntax help"
    echo "9) Exit"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
}

view_cron_jobs() {
    echo -e "\n${BLUE}Current Pet Tracker cron jobs:${NC}"
    if crontab -l 2>/dev/null | grep -E "(pet_tracker|cron_wrapper)"; then
        echo -e "\n${GREEN}Active cron jobs found${NC}"
    else
        echo -e "${YELLOW}No Pet Tracker cron jobs found${NC}"
    fi
}

view_cron_log() {
    if [ -f "$CRON_LOG" ]; then
        echo -e "\n${BLUE}Last 20 lines of cron log:${NC}"
        tail -20 "$CRON_LOG"
    else
        echo -e "${YELLOW}No cron log found yet${NC}"
    fi
}

follow_cron_log() {
    if [ -f "$CRON_LOG" ]; then
        echo -e "\n${BLUE}Following cron log (Ctrl+C to exit):${NC}"
        tail -f "$CRON_LOG"
    else
        echo -e "${YELLOW}No cron log found yet${NC}"
        echo "Log will be created at: $CRON_LOG"
    fi
}

test_export() {
    echo -e "\n${BLUE}Running export test...${NC}"
    "${PROJECT_DIR}/scripts/pet_tracker_export.sh"
}

disable_cron() {
    echo -e "\n${YELLOW}Disabling Pet Tracker cron jobs...${NC}"
    if crontab -l 2>/dev/null | grep -q -E "(pet_tracker|cron_wrapper)"; then
        crontab -l | grep -v -E "(pet_tracker|cron_wrapper)" | crontab -
        echo -e "${GREEN}✅ Cron jobs disabled${NC}"
    else
        echo -e "${YELLOW}No cron jobs to disable${NC}"
    fi
}

enable_cron() {
    echo -e "\n${BLUE}Setting up cron job...${NC}"
    "${PROJECT_DIR}/scripts/setup_cron.sh"
}

clear_log() {
    if [ -f "$CRON_LOG" ]; then
        echo -e "\n${YELLOW}Clearing cron log...${NC}"
        > "$CRON_LOG"
        echo -e "${GREEN}✅ Cron log cleared${NC}"
    else
        echo -e "${YELLOW}No log file to clear${NC}"
    fi
}

show_cron_help() {
    echo -e "\n${BLUE}Cron Schedule Syntax:${NC}"
    echo "┌───────────── minute (0 - 59)"
    echo "│ ┌───────────── hour (0 - 23)"
    echo "│ │ ┌───────────── day of month (1 - 31)"
    echo "│ │ │ ┌───────────── month (1 - 12)"
    echo "│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)"
    echo "│ │ │ │ │"
    echo "* * * * *"
    echo ""
    echo -e "${BLUE}Common Examples:${NC}"
    echo "  * * * * *       Every minute"
    echo "  */5 * * * *     Every 5 minutes"
    echo "  */15 * * * *    Every 15 minutes"
    echo "  0 * * * *       Every hour"
    echo "  0 */2 * * *     Every 2 hours"
    echo "  0 0 * * *       Daily at midnight"
    echo "  0 12 * * *      Daily at noon"
    echo "  0 0 * * 0       Weekly on Sunday"
    echo "  0 0 1 * *       Monthly on the 1st"
    echo ""
    echo -e "${BLUE}Special Characters:${NC}"
    echo "  *    Any value"
    echo "  ,    Value list separator (e.g., 1,3,5)"
    echo "  -    Range of values (e.g., 1-5)"
    echo "  /    Step values (e.g., */15 = every 15)"
}

# Main loop
while true; do
    show_menu
    read -p "Select option (1-9): " choice
    
    case $choice in
        1) view_cron_jobs ;;
        2) view_cron_log ;;
        3) follow_cron_log ;;
        4) test_export ;;
        5) disable_cron ;;
        6) enable_cron ;;
        7) clear_log ;;
        8) show_cron_help ;;
        9) 
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            ;;
    esac
    
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read
    clear
done