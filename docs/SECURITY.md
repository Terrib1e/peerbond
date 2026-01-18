# Security Best Practices

## 🔐 Overview

This document outlines security best practices for PeerBond development to ensure API keys, credentials, and sensitive data are never exposed.

## 🚨 Critical: Never Commit Secrets

**NEVER commit the following to git:**
- API keys (Gemini, OpenAI, Stripe, etc.)
- Database credentials
- JWT secrets
- Environment files (`.env`, `.env.local`, etc.)
- Backup files containing code dumps
- Database files with real data
- Configuration files with secrets

## 📋 Environment Variable Management

### Setup Process

1. **Copy the template files:**
   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```

2. **Add your actual secrets to `.env` files:**
   ```bash
   # .env and server/.env files should contain REAL values
   GEMINI_API_KEY=AIza...actual-key-here
   JWT_SECRET=actual-secret-here
   ```

3. **Verify `.env` files are gitignored:**
   ```bash
   git check-ignore .env server/.env
   # Should output: .env and server/.env
   ```

### Environment File Rules

✅ **DO:**
- Use `.env.example` files as templates with placeholder values
- Store real secrets in `.env` files (already gitignored)
- Use different secrets for development, staging, and production
- Document what each environment variable does
- Use strong, randomly generated secrets (use `openssl rand -base64 32`)

❌ **DON'T:**
- Commit `.env` files with real values
- Use production secrets in development
- Share secrets via email, chat, or screenshots
- Hardcode secrets in source code
- Use weak or default secrets in production

## 🔑 API Key Management

### Getting API Keys

**Google Gemini API:**
- Get key from: https://aistudio.google.com/
- Enable the Gemini API in Google Cloud Console
- Set usage quotas to prevent unexpected charges

**OpenAI API:**
- Get key from: https://platform.openai.com/api-keys
- Create separate keys for development and production
- Set spending limits

### Storing API Keys

1. **Always use environment variables:**
   ```typescript
   // ✅ CORRECT
   const apiKey = process.env.GEMINI_API_KEY;
   
   // ❌ WRONG - Never hardcode!
   const apiKey = "AIzaSy...";
   ```

2. **Never log API keys:**
   ```typescript
   // ❌ WRONG
   console.log('Using API key:', apiKey);
   
   // ✅ CORRECT
   console.log('API key loaded:', apiKey ? '✓' : '✗');
   ```

3. **Use key rotation:**
   - Rotate keys every 90 days
   - Rotate immediately if exposed
   - Keep old keys active briefly during rotation

## 🚨 What to Do if a Key is Exposed

If you accidentally commit a secret to git, follow these steps **immediately**:

### Step 1: Revoke the Key
- **Gemini API:** Go to https://aistudio.google.com/ → API Keys → Delete the key
- **OpenAI API:** Go to https://platform.openai.com/api-keys → Revoke the key
- **Database:** Change database passwords immediately

### Step 2: Generate a New Key
- Create a new API key in the provider's console
- Update your local `.env` file with the new key
- Update production environment variables (if applicable)

### Step 3: Remove from Git History

**If the key was just committed (not pushed):**
```bash
# Undo the last commit
git reset --soft HEAD~1

# Remove the file from staging
git reset HEAD path/to/file

# Edit the file to remove the key
# Then commit again
```

**If the key was already pushed:**

Using git filter-repo (recommended):
```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove the file from all history
git filter-repo --path peerbond_src.txt --invert-paths

# Force push (WARNING: coordinate with team first!)
git push --force
```

Using BFG Repo-Cleaner (alternative):
```bash
# Download BFG from: https://rtyley.github.io/bfg-repo-cleaner/

# Remove file from history
java -jar bfg.jar --delete-files peerbond_src.txt

# Clean up and force push
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

### Step 4: Verify Removal
```bash
# Search for the key in all commits
git log --all --full-history --source -- '*peerbond_src.txt*'

# Should return nothing if successfully removed
```

### Step 5: Notify Team
- Inform team members about the key rotation
- Ask them to update their local `.env` files
- Document the incident (date, key type, resolution)

## 🔍 Pre-Commit Checks

Before committing, always check what you're committing:

```bash
# See what files you're committing
git status

# See the actual changes
git diff --cached

# Check for potential secrets
git diff --cached | grep -iE 'api[_-]?key|secret|password|token'
```

## 🛡️ Git Commit Hygiene

### What Not to Commit

**File Types to Avoid:**
- `*.env` - Environment files
- `*.key`, `*.pem` - Private keys
- `*.p12`, `*.pfx` - Certificates
- `*.txt` - Potential code dumps/backups
- `*.dump`, `*.backup`, `*.bak` - Backup files
- `*.db`, `*.sqlite` - Database files with data
- `.vscode/settings.json` - May contain secrets
- `config/secrets.*` - Configuration secrets

**Code Patterns to Avoid:**
```typescript
// ❌ NEVER commit these patterns:
const apiKey = "AIzaSy...";
const password = "mypassword123";
const token = "sk-...";
const secret = "secret123";
```

### Review Before Pushing

Use these commands to review your changes:
```bash
# Show all changed files
git diff --name-only

# Show full diff
git diff

# Show what will be pushed
git log origin/main..HEAD --oneline
```

## 🔐 Security Tools

### Pre-commit Hooks (Installed)

Our repository uses Husky to run pre-commit hooks that:
- Warn about sensitive file extensions (`.env`, `.txt`, etc.)
- Detect potential API keys in staged changes
- Block commits containing secrets

To bypass the hook (not recommended):
```bash
git commit --no-verify
```

### Secret Scanning (GitHub Actions)

We use TruffleHog OSS to scan for secrets in:
- All new commits
- Pull requests
- Full repository history (periodic scans)

View scan results in: **Actions** → **Security Scan**

### Local Secret Scanning

You can scan for secrets locally:

```bash
# Install trufflehog
brew install trufflesecurity/trufflehog/trufflehog

# Scan current changes
trufflehog git file://. --since-commit HEAD~1

# Scan entire repository
trufflehog git file://. --only-verified
```

## 🔒 Additional Security Measures

### Database Security
- Never commit database files with real data
- Use separate databases for dev, staging, production
- Keep `schema.prisma` in git, but not `dev.db`
- Rotate database passwords regularly

### JWT Secrets
- Generate strong secrets: `openssl rand -base64 32`
- Use different secrets per environment
- Never share JWT secrets between projects
- Rotate if compromised

### HTTPS and SSL
- Always use HTTPS in production
- Store SSL certificates securely (not in git)
- Use environment variables for certificate paths

### Dependencies
- Regularly update dependencies: `npm audit`
- Review dependency changes in package-lock.json
- Use `npm audit fix` to patch vulnerabilities

### Logging
- Never log sensitive data (passwords, tokens, keys)
- Sanitize logs before shipping to external services
- Use log levels appropriately (debug, info, warn, error)

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Git Filter-Repo Documentation](https://github.com/newren/git-filter-repo)
- [Environment Variables Best Practices](https://12factor.net/config)

## 📞 Security Contacts

If you discover a security vulnerability:

1. **Do NOT open a public issue**
2. Email: security@peerbond.com (or team lead)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## ✅ Security Checklist

Before every commit:
- [ ] No `.env` files in staged changes
- [ ] No API keys in code
- [ ] No passwords or secrets in code
- [ ] Reviewed `git diff --cached`
- [ ] No backup files (`.txt`, `.dump`, `.bak`)
- [ ] No database files with data

Before every release:
- [ ] All dependencies updated
- [ ] `npm audit` shows no high/critical issues
- [ ] All secrets are environment variables
- [ ] Production uses different secrets than dev
- [ ] API keys have usage limits set
- [ ] Security scan passes in CI/CD

---

**Remember: Security is everyone's responsibility. When in doubt, ask!** 🔐
