#!/usr/bin/env bash
# Builds all MFE apps for GitHub Pages and force-pushes to the gh-pages branch.
# Usage: ./deploy-gh-pages.sh
set -euo pipefail

REPO="hemantajax/nx-mfe-hub"
PAGES_BASE="https://hemantajax.github.io/nx-mfe-hub"
DIST="dist/gh-pages"
TMP="/tmp/gh-pages-push"

echo "▶ Cleaning previous build..."
rm -rf dist/apps "$DIST"

echo "▶ Building shell (base-href=/nx-mfe-hub/)..."
npx nx build shell --configuration=production --base-href=/nx-mfe-hub/

echo "▶ Building remotes..."
for remote in dashboard profile lab theme demos jobs; do
  echo "  → $remote (base-href=/nx-mfe-hub/$remote/)..."
  npx nx build "$remote" --configuration=production --base-href=/nx-mfe-hub/"$remote"/
done

echo "▶ Assembling $DIST..."
mkdir -p "$DIST"

cp -r dist/apps/shell/. "$DIST/"

for remote in dashboard profile lab theme demos jobs; do
  mkdir -p "$DIST/$remote"
  cp -r dist/apps/"$remote"/. "$DIST/$remote/"
done

# Replace localhost manifest with production GitHub Pages URLs
cat > "$DIST/module-federation.manifest.json" <<EOF
{
  "dashboard": "$PAGES_BASE/dashboard/mf-manifest.json",
  "profile":   "$PAGES_BASE/profile/mf-manifest.json",
  "lab":       "$PAGES_BASE/lab/mf-manifest.json",
  "theme":     "$PAGES_BASE/theme/mf-manifest.json",
  "demos":     "$PAGES_BASE/demos/mf-manifest.json",
  "jobs":      "$PAGES_BASE/jobs/mf-manifest.json"
}
EOF

# SPA fallback for GitHub Pages static hosting
cp "$DIST/index.html" "$DIST/404.html"

# Prevent GitHub's Jekyll processor from mangling the output
touch "$DIST/.nojekyll"

echo "▶ Pushing to gh-pages branch..."
rm -rf "$TMP"
mkdir "$TMP"
cp -r "$DIST/." "$TMP/"

cd "$TMP"
git init -b gh-pages
git config http.postBuffer 524288000
git add -A
git commit -m "deploy: gh-pages $(date -u '+%Y-%m-%d %H:%M UTC')"
git remote add origin "https://github.com/$REPO.git"
git push --force origin gh-pages
cd -

rm -rf "$TMP"

echo "✔ Deployed → $PAGES_BASE/"
