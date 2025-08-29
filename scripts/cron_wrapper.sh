#!/bin/bash
# Cron wrapper for Pet Tracker Export
# This ensures proper environment and logging

# Set up environment
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"jk

# Log start
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting scheduled export..." >> "/Users/nat/Code/github.com/laris-co/pocket-pet-tracker/tag_data/metadata/cron.log"

# Run the export script
"/Users/nat/Code/github.com/laris-co/pocket-pet-tracker/scripts/pet_tracker_export.sh" >> "/Users/nat/Code/github.com/laris-co/pocket-pet-tracker/tag_data/metadata/cron.log" 2>&1

# Log completion
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Export completed" >> "/Users/nat/Code/github.com/laris-co/pocket-pet-tracker/tag_data/metadata/cron.log"
echo "----------------------------------------" >> "/Users/nat/Code/github.com/laris-co/pocket-pet-tracker/tag_data/metadata/cron.log"
