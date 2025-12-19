# GitHub Workflows Setup

This directory contains GitHub Actions workflows for automating releases and builds.

## Workflows

### 1. Auto Tag Version (`auto-tag-version.yml`)
**Trigger:** Push to `main` branch with changes to `package.json`

**What it does:**
- Detects version changes in `package.json`
- Automatically creates/updates a Git tag (e.g., `v1.0.1`)
- Pushes the tag to GitHub

### 2. Create GitHub Release (`create-github-release.yml`)
**Trigger:** After Auto Tag Version workflow completes successfully

**What it does:**
- Waits for EAS Build to complete (up to 30 minutes)
- Downloads the APK from EAS Build
- Creates a GitHub Release with:
  - Tag from package.json version
  - APK file attached
  - Release notes

## Setup Requirements

### GitHub Secrets

You need to configure the following secrets in your GitHub repository:

1. **`EXPO_TOKEN`** (Required)
   - Get your token from: https://expo.dev/accounts/[your-account]/settings/access-tokens
   - Create a new token with "Read" and "Build" permissions
   - Add it to GitHub: Settings → Secrets and variables → Actions → New repository secret

2. **`GITHUB_TOKEN`** (Automatically provided)
   - This is automatically available in GitHub Actions
   - No manual setup required

## EAS Build Configuration

The EAS build workflow is defined in `/.eas/workflows/create-production-builds.yml`.

It's configured to:
- Trigger on pushes to `main` branch
- Build Android APK (not AAB)
- Use the `production` profile from `eas.json`

## Release Process

When you want to create a new release:

1. Update version in `package.json` (e.g., `1.0.1` → `1.0.2`)
2. Update version in `app.json` to match
3. Commit and merge to `main` branch
4. Workflows automatically:
   - Create Git tag `v1.0.2`
   - Trigger EAS Build
   - Wait for build completion
   - Create GitHub Release with APK

## Version Display in App

The app automatically displays the current version from `app.json` on the Settings screen via:
```typescript
Constants.expoConfig?.version
```

This ensures the displayed version always matches your package version.
