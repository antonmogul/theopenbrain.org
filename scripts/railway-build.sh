#!/bin/sh
# Railway build (railway.json → buildCommand). A script rather than an inline
# command because Railway's builder strips quotes from buildCommand: the old
# inline `... || echo '...: ...')` reached sh unbalanced and every deploy
# failed with "Syntax error: end of file unexpected (expecting ")")".
#
# The app build must succeed. Storybook is best-effort: if it fails, the app
# still deploys, just without /storybook.
set -e
npm run build
if ! npm run build-storybook -- -o dist/storybook; then
  echo "Storybook build failed; deploying the app without /storybook"
fi
