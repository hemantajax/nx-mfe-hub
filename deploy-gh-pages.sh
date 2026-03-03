#!/usr/bin/env bash
# Builds all MFE apps for GitHub Pages and force-pushes to the gh-pages branch.
# Usage: npm run deploy
set -euo pipefail

REPO="hemantajax/nx-mfe-hub"
PAGES_BASE="https://hemantajax.github.io/nx-mfe-hub"
DIST="dist/gh-pages"
TMP="/tmp/gh-pages-push"
APPS="shell,dashboard,profile,lab,theme,demos,jobs"

echo "▶ Cleaning previous gh-pages assembly..."
rm -rf "$DIST"

echo "▶ Building all apps in parallel (production + ghpages config)..."
npx nx run-many -t build \
  --projects="$APPS" \
  --configuration=production,ghpages \
  --parallel=3 \
  --skip-nx-cache

echo "▶ Assembling $DIST..."
mkdir -p "$DIST"
cp -r dist/apps/shell/. "$DIST/"

for remote in dashboard profile lab theme demos jobs; do
  mkdir -p "$DIST/$remote"
  cp -r dist/apps/"$remote"/. "$DIST/$remote/"
done

# Inject production remote URLs (replaces localhost manifest from dev)
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

# Patch absolute /fonts/ → relative fonts/ so font files resolve
# correctly under the /nx-mfe-hub/ sub-path on GitHub Pages.
find "$DIST" -name "*.css" -exec sed -i '' 's|url(/fonts/|url(fonts/|g' {} \;

# SPA fallback — GitHub Pages serves 404.html for unknown paths
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
