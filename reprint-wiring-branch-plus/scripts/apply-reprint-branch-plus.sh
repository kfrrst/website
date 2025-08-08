#!/usr/bin/env bash
set -euo pipefail

BRANCH="feature/reprint-flow-plus"
echo "==> Creating git branch $BRANCH"
git checkout -b "$BRANCH" || git checkout "$BRANCH"

echo "==> Copying files into repo"
mkdir -p server/routes server/lib public/templates/forms public/templates/docs public/styles public/js public/sign scripts tests/e2e
cp -R reprint-wiring-branch-plus/server/* server/ || true
cp -R reprint-wiring-branch-plus/public/* public/ || true
cp -R reprint-wiring-branch-plus/tests/* tests/ || true

# Install deps
echo "==> Installing dependencies (puppeteer, handlebars, stripe)"
npm i puppeteer handlebars stripe

# Patch server.js to mount routes
if [ -f server.js ]; then
  echo "==> Patching server.js to mount routes (pdf/forms/phases/stripe/sign-events)"
  # Imports at top (idempotent-ish)
  grep -q "routes/pdf.js" server.js || sed -i.bak '1 i\import pdfRoutes from "./server/routes/pdf.js";\nimport formsGetRoutes from "./server/routes/forms-get.js";\nimport formsSubmitRoutes from "./server/routes/forms-submit.js";\nimport phaseRoutes from "./server/routes/phases.js";\nimport stripeRoutes from "./server/routes/stripe.js";\nimport signEventRoutes from "./server/routes/sign-events.js";' server.js

  # Mount routes AFTER static & json body but stripe should be BEFORE json if possible.
  # We attempt to place stripe route early; if not possible, it will still work in dev (no signature verify).
  awk '{print} /app\.use\(helmet\(\)\);/ && !x {print "app.use(\"/api/stripe\", stripeRoutes);"; x=1}' server.js > server.tmp && mv server.tmp server.js
  awk '{print} /app\.use\(express\.json/ && !y {print "app.use(\"/api/pdf\", pdfRoutes);\napp.use(\"/api/forms\", formsGetRoutes);\napp.use(\"/api/forms\", formsSubmitRoutes);\napp.use(\"/api/phases\", phaseRoutes);\napp.use(\"/api/sign-events\", signEventRoutes);"; y=1}' server.js > server.tmp && mv server.tmp server.js
fi

echo "==> git add & commit"
git add -A
git commit -m "feat: plug forms save, Stripe webhook, Sign screen, E2E Playwright flow"

echo "==> Done. Set STRIPE_API_KEY & STRIPE_WEBHOOK_SECRET and run your server."
