# 📤 GitHub Setup Guide

Quick guide to upload this project to GitHub.

## 🚀 Quick Steps

### 1. Create Repository on GitHub

1. Go to https://github.com/new
2. **Repository name**: `suistage-role2-sqlite` (or your preferred name)
3. **Description**: `A decentralized event management system built on Sui blockchain with SQLite backend`
4. **Visibility**: Choose Public or Private
5. ⚠️ **DO NOT** initialize with README, .gitignore, or license (we already have these!)
6. Click "Create repository"

### 2. Connect Local Repository to GitHub

```bash
# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/suistage-role2-sqlite.git

# Verify remote is added
git remote -v

# Push code to GitHub
git push -u origin main
```

### 3. Verify Upload

1. Go to your repository on GitHub
2. Check that all files are there
3. Verify .env is NOT uploaded (should be in .gitignore)
4. Check README displays correctly

---

## ✅ Pre-Upload Checklist

Before pushing, make sure:

- [x] `.env` file is in `.gitignore`
- [x] No sensitive data is committed
- [x] README.md is complete
- [x] All tests pass
- [x] Build succeeds
- [x] License is included

---

## 🔐 Security Verification

**Double-check these files are NOT committed:**

```bash
# Check for sensitive files
git status --ignored

# Should show these are ignored:
# backend/.env
# backend/node_modules/
# backend/*.db
# contracts/build/
# Move.lock
```

If you see `.env` in git:
```bash
# Remove from git (keep local file)
git rm --cached backend/.env
git commit -m "chore: remove .env from tracking"
```

---

## 📝 After Upload

### Update Repository Settings

1. **Add Topics** (helps people find your project):
   - Go to repository → "About" → "Topics"
   - Add: `sui`, `blockchain`, `web3`, `event-management`, `sqlite`, `move-language`

2. **Add Description**:
   ```
   A decentralized event management system built on Sui blockchain with SQLite backend
   ```

3. **Set Homepage**:
   - Link to deployed frontend (if you have one)
   - Or link to Sui Explorer with your package ID

### Enable Features

1. **Issues**: Enable for bug reports
2. **Discussions**: Enable for community Q&A
3. **Wiki**: Optional for additional documentation
4. **Projects**: Optional for task management

### Add Repository Badges

Add to top of README.md:

```markdown
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/suistage-role2-sqlite.svg)](https://github.com/YOUR_USERNAME/suistage-role2-sqlite/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/suistage-role2-sqlite.svg)](https://github.com/YOUR_USERNAME/suistage-role2-sqlite/issues)
```

---

## 👥 Invite Collaborators

### Add Collaborators

1. Go to repository → Settings → Collaborators
2. Click "Add people"
3. Enter their GitHub username
4. Choose permission level:
   - **Read**: View only
   - **Triage**: Manage issues/PRs
   - **Write**: Push to repository
   - **Maintain**: Manage settings
   - **Admin**: Full access

### Set Branch Protection (Recommended)

1. Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date

---

## 🔄 Daily Workflow

### When you make changes:

```bash
# 1. Check what changed
git status

# 2. Stage changes
git add .

# 3. Commit with meaningful message
git commit -m "feat: add new feature description"

# 4. Push to GitHub
git push origin main
```

### When collaborators make changes:

```bash
# Pull latest changes
git pull origin main

# If there are conflicts, resolve them then:
git add .
git commit -m "merge: resolve conflicts"
git push origin main
```

---

## 🌟 Make Your Repository Discoverable

### 1. Add to Awesome Lists

Submit to relevant awesome lists:
- [Awesome Sui](https://github.com/MystenLabs/awesome-sui)
- [Awesome Move](https://github.com/MystenLabs/awesome-move)

### 2. Share on Social Media

- Twitter/X with hashtags: `#Sui #Web3 #Blockchain #Move`
- Reddit: r/sui, r/cryptocurrency
- Discord: Sui official Discord

### 3. Write a Launch Post

Create a blog post or dev.to article explaining:
- What problem it solves
- How it works
- How to use it
- Link to GitHub repo

---

## 🐛 Common Issues

### Issue: Push rejected

```bash
# Someone else pushed before you
git pull origin main
# Resolve any conflicts
git push origin main
```

### Issue: Large file error

```bash
# If you accidentally committed a large file
git reset HEAD~1
# Add the file to .gitignore
echo "large-file.db" >> .gitignore
git add .gitignore
git commit -m "chore: ignore large files"
```

### Issue: Accidentally committed .env

```bash
# Remove from git history (careful!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (only if repo is private and no one else cloned it!)
git push origin --force --all
```

---

## 📚 Additional Resources

- [GitHub Docs](https://docs.github.com)
- [Git Basics](https://git-scm.com/book/en/v2/Getting-Started-Git-Basics)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Markdown Guide](https://www.markdownguide.org/)

---

## 🎉 Success!

Your project is now on GitHub!

**Next steps:**
1. Star your own repository (why not? 😄)
2. Share it with friends
3. Start accepting contributions
4. Build amazing things!

---

**Remember**: Never commit sensitive data! If you do, consider the data compromised and rotate all secrets immediately.

Good luck! 🚀
