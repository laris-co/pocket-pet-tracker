#!/usr/bin/env python3
"""
Anonymize location data in Items.data file
Replaces real coordinates with safe demo coordinates
"""

import json
import sys
import random

# Safe demo location (middle of Pacific Ocean)
SAFE_LAT_BASE = 0.0
SAFE_LON_BASE = -150.0

# Add small random variations to make locations unique
def get_safe_coordinates(index):
    lat = SAFE_LAT_BASE + (index * 0.001) + random.uniform(-0.0001, 0.0001)
    lon = SAFE_LON_BASE + (index * 0.001) + random.uniform(-0.0001, 0.0001)
    return round(lat, 15), round(lon, 15)

def anonymize_items_data(input_file, output_file):
    """Anonymize all location data in Items.data"""
    
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    for i, item in enumerate(data):
        # Get safe coordinates
        safe_lat, safe_lon = get_safe_coordinates(i)
        
        # Update location
        if 'location' in item and item['location']:
            item['location']['latitude'] = safe_lat
            item['location']['longitude'] = safe_lon
            # Keep other fields but anonymize address
        
        # Update crowdSourcedLocation
        if 'crowdSourcedLocation' in item and item['crowdSourcedLocation']:
            item['crowdSourcedLocation']['latitude'] = safe_lat
            item['crowdSourcedLocation']['longitude'] = safe_lon
        
        # Anonymize address
        if 'address' in item and item['address']:
            item['address'] = {
                "locality": "Demo City",
                "country": "Demo Country",
                "streetName": "Demo Street",
                "formattedAddressLines": [
                    "123 Demo Street",
                    "Demo City, Demo State 00000",
                    "Demo Country"
                ],
                "administrativeArea": "Demo State",
                "countryCode": "XX",
                "label": "123 Demo Street",
                "streetAddress": "123",
                "stateCode": "DS",
                "mapItemFullAddress": "123 Demo Street, Demo City, Demo State 00000"
            }
        
        # Anonymize owner email
        if 'owner' in item:
            item['owner'] = "demo@example.com"
    
    # Write anonymized data
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Anonymized {len(data)} items")
    print(f"Output saved to {output_file}")
    print(f"Location range: {SAFE_LAT_BASE} to {SAFE_LAT_BASE + len(data) * 0.001}")
    print(f"All addresses replaced with demo data")

if __name__ == "__main__":
    input_file = sys.argv[1] if len(sys.argv) > 1 else "Items.data"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "Items.data"
    
    anonymize_items_data(input_file, output_file)