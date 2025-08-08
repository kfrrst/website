
# [RE]Print Studios – Branded Docs v3
Generated 2025-08-08

## What’s new
- Brand-specific: every doc displays **[RE]Print Studios** header and the **/for/ {client} /by/ Kendrick Forrest** line.
- New *specific* intake forms: book cover, logo/brand, website, large-format, collaboration, ideation, python, CAD.
- **Next.js + Puppeteer** API routes for pixel-perfect PDFs (`/api/pdf/render`, `/api/pdf/preview`).
- Simple in-house e-sign capture component (canvas + typed). Use for UETA/ESIGN-compliant signatures with audit log.
- Adobe fallback: you can still send rendered PDFs to Acrobat Sign for embedded signing or RON.

## Using the PDF API
- Place `templates/` and `styles/` at your project root (Next.js).
- Copy `next-api/` files into `pages/api/pdf/` and `lib/` respectively.
- POST to `/api/pdf/render` with JSON:
```json
{ "template": "service_agreement_sow.hbs", "data": { "client":{"displayName":"ACME","legalName":"ACME Inc."}, "project":{"name":"Website"}, "deliverables":["Homepage","CMS"], "revisions":{"included":2,"rate":"$90/hr"}, "payment":{"deposit":"50%","trigger":"final approval","late":"1.5%/mo"} } }
```
- Response is `application/pdf` — perfect for download or for uploading to your signer.

## In-house signatures (no vendor)
- Use `<SignatureField />` to capture a drawn or typed signature and store:
  - dataUrl (PNG), typed name, IP, user-agent, timestamp, signer UID.
- When rendering with Puppeteer, inject the signature image into the doc context, e.g. `{signatures.clientImg}`.
- Keep an **audit record** in DB (`sign_events` table) to remain UETA/ESIGN friendly.

## Adobe fallback (if required)
- Render PDF via `/api/pdf/render`, then create an agreement in Acrobat Sign (embedded signing). See previous v2 kit notes.

## Notarization
- For docs that need notarization, route to your RON provider; store the notarial certificate & hash alongside the signed PDF.

