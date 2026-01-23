# Meeting Conflicts Generator

This directory contains Python scripts for processing PC conflict data.

## Scripts

### generate_meeting_conflicts.py

Generates `meeting_conflicts.csv` by replacing emails in `pcconflicts.csv` with Zoom meeting emails from `registrants.csv`.

**Usage:**
```bash
python scripts/python/generate_meeting_conflicts.py
```

**What it does:**
1. Reads `data/pcconflicts.csv` (PC member conflicts)
2. Reads `data/registrants.csv` (registered Zoom emails)
3. Maps PC emails to Zoom meeting emails
4. Generates `data/meeting_conflicts.csv` with updated emails

The script can also be triggered via the web API endpoint `/getconflicts`.

## Requirements

- Python 3.6+
- No external dependencies (uses only standard library)
