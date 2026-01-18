# Changelog

## [1.0.0] - 2026-01-16

### Initial Release

#### Features

- ✅ CSV parsing for row-based and column-based formats
- ✅ Automatic participant exclusion based on conflict lists
- ✅ Waiting room automation (move/admit)
- ✅ Email-based participant matching
- ✅ Fallback mode for participants without email
- ✅ localStorage persistence for state resilience
- ✅ Retry logic with exponential backoff
- ✅ Batch processing with concurrency limits
- ✅ Real-time progress tracking
- ✅ Comprehensive activity logging
- ✅ Round-based operation tracking

#### Technical Implementation

- React 18 + TypeScript + Vite
- Zustand for state management
- Zoom Apps SDK integration
- PapaParse for CSV parsing
- Tailwind CSS for styling
- Frontend-only architecture (no backend required)

#### Safety Features

- Idempotent operations
- Selective participant admission
- Waiting room reconciliation
- Error handling and retry mechanisms
- Operation result tracking

#### Documentation

- Complete setup guide
- Operator guide for 8-hour meetings
- Edge case handling procedures
- Recovery procedures
- FAQ section
- Sample CSV files included
