# Security Quick Reference

Quick guide for secure development practices in PeerBond.

## ✅ DO

- **Store secrets in `.env` files** (already gitignored)
- **Use `.env.example` for templates** with placeholder values only
- **Review commits before pushing** with `git diff --cached`
- **Use environment variables** in code: `process.env.GEMINI_API_KEY`
- **Rotate API keys regularly** (every 90 days minimum)
- **Use strong random secrets** with `openssl rand -base64 32`
- **Check what you're committing** with `git status` and `git diff`
- **Run security scans** before pushing
- **Keep dependencies updated** with `npm audit`

## ❌ DON'T

- **Commit `.env` files** with real secrets
- **Hardcode API keys** in source code
- **Share keys in chat/email** or screenshots
- **Commit backup files** (`*.txt`, `*.dump`, `*.bak`)
- **Use production keys in development** - keep them separate
- **Commit database files** with real data (`*.db`, `*.sqlite`)
- **Log API keys** even in debug mode
- **Bypass pre-commit hooks** without good reason
- **Use weak secrets** like "secret123" or "password"
- **Commit sensitive files** (check `.gitignore` patterns)

## 🚨 Emergency: Key Exposed

**If you accidentally committed a secret, act immediately:**

### 1. Revoke the Key ⚡
**Gemini API:**
```
→ https://aistudio.google.com/
→ API Keys → Delete exposed key
```

**OpenAI API:**
```
→ https://platform.openai.com/api-keys
→ Revoke exposed key
```

### 2. Generate New Key 🔑
- Create new key in provider's console
- Update local `.env` with new key
- Update production environment (if applicable)

### 3. Remove from Git History 🗑️

**Just committed (not pushed yet):**
```bash
git reset --soft HEAD~1
git reset HEAD path/to/file
# Edit file to remove key, then commit again
```

**Already pushed to remote:**
```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove file from all history
git filter-repo --path sensitive-file.txt --invert-paths

# Force push (WARNING: coordinate with team!)
git push --force
```

### 4. Verify Removal ✓
```bash
git log --all --source -- '*sensitive-file*'
# Should return nothing
```

### 5. Notify Team 📢
- Inform team about key rotation
- Ask team to update `.env` files
- Document incident date and resolution

## 🔍 Before Every Commit

**Check what you're committing:**
```bash
# See staged files
git status

# See actual changes
git diff --cached

# Search for potential secrets
git diff --cached | grep -iE 'api[_-]?key|secret|password|token|AIza|sk-'

# Check if files should be gitignored
git check-ignore <filename>
```

## 🛠️ Quick Setup

**First time setup:**
```bash
# Copy environment templates
cp .env.example .env
cp server/.env.example server/.env

# Add your actual secrets (these are gitignored)
# Edit .env and server/.env with real values

# Verify they're ignored
git check-ignore .env server/.env
# Should output: .env and server/.env

# Install dependencies with security tools
npm install
```

## 🔐 Environment Variables

**Root `.env` example:**
```bash
# Frontend configuration (if needed)
VITE_API_URL=http://localhost:3003
```

**Server `.env` example:**
```bash
NODE_ENV=development
PORT=3003
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=your-generated-secret-here
GEMINI_API_KEY=your-actual-api-key-here
```

**Generate strong secrets:**
```bash
openssl rand -base64 32
```

## 🔒 Code Patterns

**✅ CORRECT - Use environment variables:**
```typescript
const apiKey = process.env.GEMINI_API_KEY;
const jwtSecret = process.env.JWT_SECRET;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY not configured');
}
```

**❌ WRONG - Never hardcode:**
```typescript
const apiKey = "AIzaSy...";  // NEVER DO THIS!
const jwtSecret = "mysecret";  // NEVER DO THIS!
```

**✅ CORRECT - Safe logging:**
```typescript
console.log('API key configured:', !!apiKey);
console.log('Environment:', process.env.NODE_ENV);
```

**❌ WRONG - Exposing secrets:**
```typescript
console.log('API key:', apiKey);  // NEVER LOG SECRETS!
console.log('Config:', { apiKey, jwtSecret });  // NEVER!
```

## 🎯 Common Mistakes

### Mistake 1: Committing `.env` files
```bash
# ❌ WRONG
git add .env
git commit -m "Update config"

# ✅ CORRECT
# .env is already in .gitignore, should never be added
# If accidentally staged:
git reset HEAD .env
```

### Mistake 2: Backup files with secrets
```bash
# ❌ WRONG - These often contain code dumps
git add peerbond_src.txt
git add server_backup.txt
git add config.backup

# ✅ CORRECT - Never commit these
# Already blocked by .gitignore
```

### Mistake 3: Hardcoded keys
```typescript
// ❌ WRONG
const config = {
  apiKey: 'AIzaSy...',
  dbPassword: 'mypass123'
};

// ✅ CORRECT
const config = {
  apiKey: process.env.GEMINI_API_KEY,
  dbPassword: process.env.DB_PASSWORD
};
```

## 📦 Package Management

**Check for vulnerabilities:**
```bash
npm audit
npm audit fix
```

**Update dependencies safely:**
```bash
# Check outdated packages
npm outdated

# Update with care
npm update

# For major version updates, check changelogs first
npm install package@latest
```

## 🔧 Git Hooks

Our pre-commit hook checks for:
- Sensitive file extensions (`.env`, `.txt`, `.json`)
- API key patterns in code
- Common secret patterns

**If hook blocks your commit:**
1. Review what you're committing
2. Remove any secrets
3. Try commit again
4. Only use `--no-verify` if absolutely necessary

```bash
# Normal commit (runs hooks)
git commit -m "message"

# Skip hooks (NOT recommended)
git commit --no-verify -m "message"
```

## 🔍 Local Secret Scanning

**Scan for secrets before committing:**
```bash
# Using grep (built-in)
git diff --cached | grep -iE 'api[_-]?key|secret|password|token'

# Using trufflehog (if installed)
trufflehog git file://. --since-commit HEAD~1
```

## 📋 Security Checklist

**Every commit:**
- [ ] Ran `git diff --cached` to review changes
- [ ] No `.env` files in changes
- [ ] No API keys in code
- [ ] No backup files (`.txt`, `.dump`, `.bak`)
- [ ] Used environment variables for secrets
- [ ] Pre-commit hooks passed

**Every PR:**
- [ ] Security scan passed in CI
- [ ] No secrets in any files
- [ ] `.env.example` updated (if needed)
- [ ] Documentation updated (if needed)

**Every release:**
- [ ] All secrets are environment variables
- [ ] Production uses different secrets
- [ ] `npm audit` shows no critical issues
- [ ] Dependencies updated
- [ ] API keys have usage limits

## 🆘 Need Help?

- **Full guide:** [docs/SECURITY.md](./SECURITY.md)
- **Questions:** Ask in team chat
- **Security issue:** Email security@peerbond.com (DO NOT open public issue)

---

**🔐 When in doubt, ask! Security is everyone's responsibility.**
