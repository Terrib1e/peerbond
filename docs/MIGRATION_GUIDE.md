# Migration Guide - Project Restructuring

This guide documents the comprehensive cleanup and restructuring of the PeerBond project completed in January 2024.

## 🎯 Overview

The PeerBond repository has been reorganized to follow modern monorepo best practices, reduce clutter, and improve maintainability. The root directory has been cleaned from 16+ test files and miscellaneous scripts to only essential configuration files.

## 📦 What Changed

### Test Files Relocated

All manual integration test files have been moved from the root directory to a dedicated location:

**Old Location:** `/` (root)
**New Location:** `server/tests/manual/`

**Files Moved:**
- `check-groups.cjs` → `server/tests/manual/check-groups.cjs`
- `check-member-groups.cjs` → `server/tests/manual/check-member-groups.cjs`
- `check-privacy-values.cjs` → `server/tests/manual/check-privacy-values.cjs`
- `check-specific-group.cjs` → `server/tests/manual/check-specific-group.cjs`
- `create-test-member.cjs` → `server/tests/manual/create-test-member.cjs`
- `show-group-description.cjs` → `server/tests/manual/show-group-description.cjs`
- `test-db-service.cjs` → `server/tests/manual/test-db-service.cjs`
- `test-group-search.cjs` → `server/tests/manual/test-group-search.cjs`
- `test-matching-agent.cjs` → `server/tests/manual/test-matching-agent.cjs`
- `test-member-tools.cjs` → `server/tests/manual/test-member-tools.cjs`
- `test-mental-health.cjs` → `server/tests/manual/test-mental-health.cjs`
- `test-minimal-search.cjs` → `server/tests/manual/test-minimal-search.cjs`
- `test-search-term.cjs` → `server/tests/manual/test-search-term.cjs`
- `test-searchgroups-direct.cjs` → `server/tests/manual/test-searchgroups-direct.cjs`
- `test-simple-query.cjs` → `server/tests/manual/test-simple-query.cjs`
- `test-simple-wellness.cjs` → `server/tests/manual/test-simple-wellness.cjs`
- `test_maya_tools.js` → `server/tests/manual/test_maya_tools.js`

**How to Run Tests Now:**
```bash
# From server directory
cd server
node tests/manual/check-groups.cjs

# Or from root
node server/tests/manual/check-groups.cjs
```

See `server/tests/manual/README.md` for detailed test documentation.

### Documentation Files Consolidated

All documentation has been moved to the `/docs` directory for better organization.

**Files Moved:**
- `CLAUDE.md` → `docs/CLAUDE.md` (AI agent architecture)
- `INTERVIEW_PREP.md` → `docs/INTERVIEW_PREP.md` (Demo & pitch guide)

**Existing Documentation (Already in `/docs`):**
- `docs/README.md` - Documentation index
- `docs/AI_TESTING.md` - AI testing guide
- `docs/GEMINI_SETUP.md` - AI setup
- `docs/architecture.md` - System architecture
- `docs/deployment.md` - Deployment guide
- `docs/monitoring.md` - Observability
- And more...

### Scripts Consolidated

All utility scripts are now in the `/scripts` directory.

**File Moved:**
- `quick-setup.sh` → `scripts/quick-setup.sh`

**How to Run:**
```bash
# Old way (no longer works)
./quick-setup.sh

# New way
./scripts/quick-setup.sh
# or
bash scripts/quick-setup.sh
```

### Files Removed

The following files have been permanently removed as they are unnecessary for the project:

- `.hintrc` - Outdated webhint configuration (tool no longer in use)
- `package-demo.json` - Duplicate/demo package configuration
- `.claude/` directory - Development-only tool configuration (now in .gitignore)

**Note:** `.claude/` is now in `.gitignore` to prevent accidental commits of local development configurations.

## 🔄 Migration Steps for Developers

### 1. Pull Latest Changes

```bash
git checkout main
git pull origin main
```

### 2. Update Your Local Scripts/Aliases

If you have any shell scripts or aliases that reference the old paths, update them:

```bash
# Update any references from:
./quick-setup.sh
# To:
./scripts/quick-setup.sh

# Update test runs from:
node test-matching-agent.cjs
# To:
node server/tests/manual/test-matching-agent.cjs
```

### 3. No Code Changes Required

**Important:** This is purely an organizational change. No functional code was modified. All imports in the test files remain the same because they use relative paths (e.g., `require('./server/...')`).

### 4. Clean Up Your Workspace (Optional)

If you have uncommitted changes or local test files, you may want to:

```bash
# Check what would be removed
git clean -n

# Remove untracked files (careful!)
git clean -fd
```

## 📋 npm Scripts - No Changes

All npm scripts in `package.json` continue to work exactly as before:

```bash
npm run dev              # Start development servers
npm run dev:frontend     # Frontend only
npm run dev:server       # Backend only
npm run build            # Build for production
npm run test             # Run tests
npm run lint             # Lint code
```

The `setup` script in the root `package.json` still points to `scripts/setup.sh` and works correctly.

## 🗂️ New Directory Structure

```
peerbond/
├── docs/                    # ✨ All documentation consolidated here
│   ├── CLAUDE.md           # [MOVED]
│   ├── INTERVIEW_PREP.md   # [MOVED]
│   ├── README.md
│   ├── GEMINI_SETUP.md
│   └── ... (15+ doc files)
├── scripts/                 # ✨ All scripts consolidated here
│   ├── setup.sh
│   ├── dev.sh
│   └── quick-setup.sh      # [MOVED]
├── server/
│   ├── tests/
│   │   └── manual/         # ✨ New: Manual integration tests
│   │       ├── README.md   # [NEW] Test documentation
│   │       ├── check-*.cjs # [MOVED]
│   │       └── test-*.cjs  # [MOVED]
│   ├── src/
│   └── prisma/
├── src/                    # Frontend code
├── examples/               # Code examples
├── .gitignore             # [UPDATED] Added .claude/
├── package.json           # [UNCHANGED]
└── [config files]         # tsconfig, vite.config, etc.
```

## ✅ Verification Checklist

After pulling these changes, verify everything works:

- [ ] `npm install` completes successfully
- [ ] `npm run dev` starts both frontend and backend
- [ ] `npm run build` completes without errors
- [ ] Documentation is accessible in `/docs` directory
- [ ] Scripts in `/scripts` are executable
- [ ] Test files in `server/tests/manual/` can be run

## 🆘 Troubleshooting

### "Cannot find module" errors in test files

**Problem:** Old absolute path references in your local files.

**Solution:** Test files were moved but their internal imports were not changed. They use relative paths like `require('./server/...')` from the old location. When running from the new location:

```bash
# From server directory, adjust paths if needed or run from root:
cd /path/to/peerbond
node server/tests/manual/test-matching-agent.cjs
```

### "Command not found: quick-setup.sh"

**Problem:** Script moved to `/scripts` directory.

**Solution:** Update your command:
```bash
# Old
./quick-setup.sh

# New
./scripts/quick-setup.sh
```

### Missing .claude directory

**Problem:** The `.claude/` directory is now gitignored.

**Solution:** This is intentional. The directory contained only local development configuration and should not be version controlled. If your tools need it, recreate it locally - it won't be committed.

## 📞 Support

If you encounter issues after this migration:

1. Check that you're on the latest commit
2. Run `npm install` in both root and `server/` directories
3. Clear any build caches: `npm run clean`
4. Review this guide for path updates
5. Open an issue on GitHub if problems persist

## 🎉 Benefits

This restructuring provides:

- ✅ **Cleaner root directory** - Only essential configuration files
- ✅ **Better organization** - Clear separation of concerns
- ✅ **Easier navigation** - Find files by purpose, not by scrolling
- ✅ **Professional structure** - Follows industry best practices
- ✅ **Improved onboarding** - New developers can understand the structure quickly
- ✅ **Better tooling support** - IDEs and tools work better with organized projects

---

**Migration Date:** January 2024  
**Git Commit:** See PR for this migration  
**Questions?** Check the [main README](../README.md) or open an issue.
