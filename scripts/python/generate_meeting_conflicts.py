#!/usr/bin/env python3
"""
Generate meeting_conflicts.csv by replacing emails in pcconflicts.csv
with zoom_email from registrants.csv based on email mapping.

Usage:
    python generate_meeting_conflicts.py
"""

import csv
import os
from pathlib import Path

# File paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
DATA_DIR = PROJECT_ROOT / 'data'

PCCONFLICTS_CSV = DATA_DIR / 'pcconflicts.csv'
REGISTRANTS_CSV = DATA_DIR / 'registrants.csv'
MEETING_CONFLICTS_CSV = DATA_DIR / 'meeting_conflicts.csv'


def read_csv(filepath):
    """Read CSV file and return list of dictionaries."""
    if not filepath.exists():
        return []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


def write_csv(filepath, data, fieldnames):
    """Write data to CSV file."""
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)


def generate_meeting_conflicts():
    """
    Main function to generate meeting_conflicts.csv.
    
    Reads pcconflicts.csv and registrants.csv, then creates meeting_conflicts.csv
    with emails replaced by zoom_email where applicable.
    """
    # Read input files
    pc_conflicts = read_csv(PCCONFLICTS_CSV)
    registrants = read_csv(REGISTRANTS_CSV)
    
    if not pc_conflicts:
        print(f"Error: {PCCONFLICTS_CSV} not found or empty")
        return False
    
    # Create email -> zoom_email mapping
    email_to_zoom_email = {}
    for registrant in registrants:
        if registrant.get('email') and registrant.get('zoom_email'):
            email_to_zoom_email[registrant['email']] = registrant['zoom_email']
    
    print(f"Loaded {len(registrants)} registrants")
    print(f"Email mappings available: {len(email_to_zoom_email)}")
    
    # Process conflicts and replace emails
    meeting_conflicts = []
    replaced_count = 0
    
    for conflict in pc_conflicts:
        original_email = conflict.get('email', '')
        
        # Create a copy of the conflict
        meeting_conflict = conflict.copy()
        
        # Replace email if mapping exists
        if original_email in email_to_zoom_email:
            meeting_conflict['email'] = email_to_zoom_email[original_email]
            replaced_count += 1
        
        meeting_conflicts.append(meeting_conflict)
    
    # Get fieldnames from the first conflict record
    fieldnames = list(pc_conflicts[0].keys()) if pc_conflicts else []
    
    # Write output file
    write_csv(MEETING_CONFLICTS_CSV, meeting_conflicts, fieldnames)
    
    print(f"✓ Generated {MEETING_CONFLICTS_CSV}")
    print(f"  Total conflicts: {len(meeting_conflicts)}")
    print(f"  Emails replaced: {replaced_count}")
    print(f"  Emails unchanged: {len(meeting_conflicts) - replaced_count}")
    
    return True


if __name__ == '__main__':
    success = generate_meeting_conflicts()
    exit(0 if success else 1)
