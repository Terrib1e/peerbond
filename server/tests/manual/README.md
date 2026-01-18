# Manual Integration Tests

This directory contains manual integration tests for the PeerBond server. These tests are designed to be run interactively to verify functionality during development.

## Overview

These are **not** automated unit tests. They are scripts that:
- Connect to the actual database
- Make real API calls to the running server
- Test the AI agent system end-to-end
- Verify data integrity and business logic

## Prerequisites

Before running these tests:

1. **Server must be running**: `npm run dev:server` from the root directory
2. **Database must be seeded**: Ensure you have test data in your database
3. **Environment configured**: Check that `server/.env` has all required variables

## Running Tests

All test files are CommonJS (`.cjs`) modules. Run them with Node.js:

```bash
# From the server directory
cd /path/to/peerbond/server

# Run a specific test
node tests/manual/check-groups.cjs
node tests/manual/test-matching-agent.cjs
```

## Test Files

### Database Tests
- **check-groups.cjs** - Verify groups in database
- **check-member-groups.cjs** - Check member-group relationships
- **check-privacy-values.cjs** - Validate privacy settings
- **check-specific-group.cjs** - Inspect specific group details
- **test-db-service.cjs** - Test database service layer

### Group Search & Matching Tests
- **test-group-search.cjs** - Test group search functionality
- **test-matching-agent.cjs** - Test AI matching agent
- **test-minimal-search.cjs** - Minimal group search test
- **test-search-term.cjs** - Search with specific terms
- **test-searchgroups-direct.cjs** - Direct search groups API test
- **test-simple-query.cjs** - Simple database query test

### Member & Tools Tests
- **create-test-member.cjs** - Create test member data
- **test-member-tools.cjs** - Test member-related tools
- **test_maya_tools.js** - Test Maya AI facilitator tools

### Domain-Specific Tests
- **test-mental-health.cjs** - Mental health specific features
- **test-simple-wellness.cjs** - Wellness feature tests

### Display Tests
- **show-group-description.cjs** - Display group descriptions

## Notes

- These tests may modify your database - use a development database only
- Some tests require authentication - they will create/use test accounts
- If a test fails, check server logs for detailed error messages
- Tests are independent - you can run them in any order

## Troubleshooting

### "Cannot find module" errors
Make sure you're running from the server directory and have installed dependencies:
```bash
cd server
npm install
```

### "Connection refused" errors
Ensure the server is running:
```bash
npm run dev:server
```

### Prisma errors
Make sure your database is properly migrated:
```bash
cd server
npx prisma migrate dev
```
