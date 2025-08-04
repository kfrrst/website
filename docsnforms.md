Below is a **developer-ready specification** you can hand straight to GitHub Copilot (or paste into a `TECH_SPEC.md`) and begin scaffolding.
It extends the dynamic-template idea I shared earlier, but now **enumerates every service you listed, every project phase, every form/document, the DB schema, all key API routes, and the React component tree**—plus some UX notes so the build stays on-brand.

---

## 0 . Reference Glossary

| Abbr    | Meaning                                        |
| ------- | ---------------------------------------------- |
| **ST**  | *Service Type* (Screen Print, SaaS Dev, etc.)  |
| **PL**  | *Phase Library* entry (ideation, review, etc.) |
| **FM**  | *Form Module* (JSON-schema rendered as UI)     |
| **DM**  | *Document Module* (Handlebars/MD → PDF/HTML)   |
| **PD**  | *Project Definition* (per-project merged JSON) |
| **UID** | React component that renders a module          |

---

## 1. Master Service Type Matrix

```txt
┌── code ─────────────────────────────────────────────────────────┐
| id | code | Display Name         | Default Phase Keys          |
|----+------+----------------------+-----------------------------|
| 1  | COL  | Collaboration Only   | ONB → COLLAB → WRAP         |
| 2  | IDE  | Ideation Workshop    | ONB → IDEA  → WRAP          |
| 3  | SP   | Screen Printing      | ONB → IDEA → PREP → PRINT → LAUNCH|
| 4  | LFP  | Large-Format Print   | ONB → PREP → PRINT → LAUNCH |
| 5  | GD   | Graphic Design       | ONB → IDEA → DSGN → REV  → LAUNCH|
| 6  | WW   | Woodworking          | ONB → IDEA → CAD  → FAB  → FINISH → LAUNCH|
| 7  | SAAS | SaaS Development     | ONB → DISC → MVP  → QA   → DEPLOY → LAUNCH|
| 8  | WEB  | Website Design       | ONB → DISC → DSGN → DEV  → REV → DEPLOY → LAUNCH|
| 9  | BOOK | Book Cover Design    | ONB → IDEA → DSGN → REV  → LAUNCH|
|10  | LOGO | Logo & Brand System  | ONB → RESEARCH → DSGN → REV → LAUNCH|
|11  | PY   | Python Automation    | ONB → DISC → DEV  → QA   → LAUNCH|
└────────────────────────────────────────────────────────────────┘
```

*Every code above is referenced throughout forms, docs, permissions, etc.*

---

## 2. Phase Library (PL) Objects

```ts
interface Phase {
  key: "ONB" | "IDEA" | "DISC" | ...;
  label: string;           // “Onboarding”
  icon: string;            // lucide icon id
  uids: string[];          // React UIDs to show in portal
  formModules: string[];   // e.g. ["intake_base","intake_sp"]
  docModules:  string[];   // e.g. ["proposal_default"]
  permissions: RolePerms;  // CRUD rules per role
}
```

| Key          | Purpose                                                           | Core UID(s)             |
| ------------ | ----------------------------------------------------------------- | ----------------------- |
| **ONB**      | Kick-off / intake forms                                           | `<IntakeWizard />`      |
| **COLLAB**   | Light collab (brain-dump board)                                   | `<MiroEmbed />`         |
| **IDEA**     | Ideation & mood-board                                             | `<Moodboard />`         |
| **RESEARCH** | Brand/market research dossier                                     | `<ResearchList />`      |
| **DISC**     | Discovery workshop doc capture                                    | `<NotionEmbed />` (opt) |
| **DSGN**     | Design production phase (Figma embeds)                            | `<FigmaPreview />`      |
| **CAD**      | 3-D/CAM preview (STL viewer)                                      | `<ModelViewer />`       |
| **PREP**     | Pre-Press checklist + proof approval                              | `<ProofChecklist />`    |
| **PRINT**    | Print queue + batch tracker                                       | `<BatchStatus />`       |
| **MVP**      | First working slice for SaaS                                      | `<StagingLink />`       |
| **DEV**      | Web build commits (Netlify previews)                              | `<DeployCard />`        |
| **QA**       | Bug tracker embed                                                 | `<LinearList />`        |
| **FAB**      | Woodshop fabrication log                                          | `<FabricationLog />`    |
| **FINISH**   | Sand / stain / lacquer stage                                      | `<FinishChecklist />`   |
| **DEPLOY**   | Prod deploy checklist                                             | `<LaunchChecklist />`   |
| **REV**      | Formal review & feedback cycle                                    | `<AnnotationBoard />`   |
| **LAUNCH**   | ***new name replacing “Delivery”***: asset hand-off & celebration | `<LaunchGallery />`     |
| **WRAP**     | Post-mortem, payment, testimonial                                 | `<WrapUp />`            |

---

## 3. Form & Document Modules

| Module ID                | Target Phase(s) | Service Filters | Why it exists                   |
| ------------------------ | --------------- | --------------- | ------------------------------- |
| `intake_base.json`       | ONB             | *all*           | contact, billing, goals         |
| `intake_sp.json`         | ONB             | SP,LFP          | garment, ink colors, qty        |
| `intake_ww.json`         | ONB             | WW              | wood type, dims, finish         |
| `intake_saasi.json`      | ONB             | SAAS,WEB,PY     | repo URLs, domain ideas         |
| `proposal_default.hbs`   | IDEA,DISC       | *all*           | auto-pricing table              |
| `sow_print.hbs`          | PREP            | SP,LFP          | spoilage + Pantone clause       |
| `proof_approval.json`    | PREP,REV        | GD,SP,LFP       | checkbox: “spelling correct”    |
| `bug_report.json`        | QA,REV          | SAAS,WEB,PY     | severity, repro-steps           |
| `deploy_checklist.md`    | DEPLOY          | SAAS,WEB        | env vars, backups               |
| `launch_certificate.hbs` | LAUNCH          | *all*           | “Project successfully launched” |
| `final_invoice.hbs`      | WRAP            | *all*           | pulled from invoices table      |
| *(+ 15 more)*            | …               | …               | …                               |

*Stored in `/templates/forms` & `/templates/docs`, version-tagged.*

---

## 4. Database Schema (PostgreSQL)

```sql
-- users
id  uuid  PK
email  text   unique
hash  text
role  enum('admin','client')
display_name text
twofa_secret text null
created_at   timestamptz default now()

-- clients (orgs you bill)
id    uuid PK
display_name text
contact_user uuid FK users(id)

-- projects
id        uuid PK
client_id uuid FK clients(id)
name      text
services  text[]          -- ['SP','GD']
phase_def jsonb           -- stored PD
status    enum('active','archived')
created_at timestamptz

-- phases (flattened for quick lookup)
id         uuid PK
project_id uuid
key        text    -- 'PREP'
position   int
status     enum('not_started','in_progress','done')
started_at timestamptz
done_at    timestamptz

-- forms_data
id       uuid PK
phase_id uuid
module   text
payload  jsonb
submitted_by uuid FK users(id)
submitted_at timestamptz

-- docs (rendered PDFs, proposals, etc.)
id      uuid PK
phase_id uuid
module  text
file_url text
version smallint
generated_at timestamptz

-- invoices
id          uuid PK
project_id  uuid
seq         int             -- human-friendly #
issued_at   date
due_at      date
status      enum('draft','sent','paid','overdue')
currency    char(3) default 'USD'
total       numeric(10,2)

-- invoice_items
invoice_id uuid
label      text
qty        int
rate       numeric(10,2)

-- files (deliverables & refs)
id        uuid PK
project_id uuid
phase_id   uuid
label      text
url        text
mime       text
size       int
uploaded_by uuid
```

> *Why separate `clients` from `users`?* A company may have multiple user logins later (accounting vs creative team).

---

## 5. REST / GraphQL API Surface

| Verb + Route                  | Auth  | Body / Params               | Resp          |
| ----------------------------- | ----- | --------------------------- | ------------- |
| `POST /auth/login`            | —     | email, pwd                  | JWT           |
| `POST /auth/2fa`              | token | code                        | 200 / 401     |
| `GET  /projects`              | token | —                           | list          |
| `POST /projects` ‡            | admin | name, clientId, services\[] | PD json       |
| `PATCH /projects/:id/status`  | admin | status                      | 204           |
| `GET  /projects/:id/phases`   | token | —                           | ordered array |
| `POST /phases/:phaseId/forms` | token | moduleId, payload           | 201           |
| `POST /files`                 | token | phaseId + file (multipart)  | file meta     |
| `POST /invoices` ‡            | admin | projectId, items\[]         | invoiceId     |
| `GET  /invoices/:id`          | token | —                           | invoice data  |
| `POST /payments/stripe-hook`  | ∅     | Stripe webhook              | 200           |

‡ Admin-only routes hidden in Admin UI.

---

## 6. React Component Tree (Next.js)

```
_app
 ├─ Layout
 │   ├─ SiteHeader     (public)
 │   ├─ Footer
 │   └─ PortalHeader   (+BrandedLine)
 ├─ pages/
 │   ├─ index          (Landing)
 │   ├─ inquiry
 │   ├─ login
 │   └─ portal/
 │       ├─ dashboard
 │       ├─ projects/[id]/
 │       │    ├─ index      (tabs)
 │       │    ├─ phases/[phaseKey].tsx   ← dynamic renderer
 │       │    └─ invoices
 │       └─ admin/…
 └─ components/
     ├─ BrandedLine.tsx
     ├─ PhaseStepper.tsx
     ├─ FormRenderer.tsx           (jsonschema-to-formik)
     ├─ FileCard.tsx
     ├─ InvoiceCard.tsx
     ├─ PaymentButton.tsx
     └─ …per-phase UIDs
```

*Phase pages call `/api/projects/:id/phases` → decide which FormRenderer / UID grid to show.*

---

## 7. UX Flows (Happy-path)

### Client

1. **ONB** – fills *intake\_base* + any ST-specific forms
2. **IDEA** – drops Pinterest links; you upload *proposal.pdf* → auto-notify
3. **DSGN** – views live Figma embed; clicks **Approve** → phase auto-advances
4. **PREP/PRINT** – reviews proof checklist; marks ✓; status flips to READY TO PRINT
5. **LAUNCH** – downloads asset bundle ZIP; sees **Launch Certificate**
6. **WRAP** – invoice list shows *Invoice #3 Pending* → Stripe pay → success receipt

### Admin

*Admin portal shows Kanban-board of all active phases across projects (column per phase key). Drag card to move or click to open phase modal (same UI as client but with edit toggle).*

---

## 8. Form Generation Algorithm (pseudo)

```js
function buildCompositeSchema(phase, project) {
  const mods = phase.formModules
    .filter(mId => serviceFilterOk(mId, project.services));
  const merged = mods.reduce(mergeJSONSchema, baseSchema());
  return merged;
}

GET /forms/:phaseId => {schema, ui}
```

*Client <FormRenderer> receives above, renders instantly; no redeploy needed when you add a new service.*

---

## 9. Security Checklist

* JWT Bearer tokens + `helmet()` middleware
* RBAC middleware `can(user, action, resource)` on every route
* Signed URLs (S3 pre-signed) for private file downloads
* Stripe webhooks verify signature secret before mutating invoice status
* CSP headers to limit embeds (Figma, Pinterest, Linear, etc.)
* Automatic nightly DB dump to encrypted S3 bucket

---

## 10. CI / CD

* **GitHub Actions**

  * Lint, type-check, Jest
  * Cypress smoke-run (login, project list, invoice pay test in Stripe test-mode)
  * Deploy to Vercel with preview URL → comment \[PREVIEW] on PR

---

## 11. Minimum PDF / Doc Export Pipeline

```
(next route /pdf/:docId)     (Chromium headless)
      ↓                            ↓
 Render React doc page  →  Puppeteer → save PDF → S3
```

Because docs share React component tree, they keep branding + fonts 100 % identical between HTML & PDF.

---

## 12. Module Map for *All* Services

| Service Type | Extra Form Modules                        | Extra Docs (outside defaults)               |
| ------------ | ----------------------------------------- | ------------------------------------------- |
| COL          | `collab_brief.json`                       | —                                           |
| IDE          | `ideation_goals.json`                     | `mural_export.md`                           |
| SP,LFP       | `intake_sp.json`, `proof_approval.json`   | `print_spec_sheet.hbs`, `ink_mix_chart.pdf` |
| GD,BOOK,LOGO | `design_brief.json`                       | `brand_guidelines.hbs`                      |
| WW           | `intake_ww.json`, `cad_settings.json`     | `cutlist.pdf`                               |
| SAAS,WEB,PY  | `intake_saasi.json`, `feature_scope.json` | `api_contract.md`, `deploy_checklist.md`    |
| BRAND        | `brand_audit.json`                        | `identity_system.pdf`                       |

*(If a project combines services, union the lists—duplicates auto-deduped).*

---

### Ready to Build

Spin up `npx create-next-app reprint-portal`, copy your existing `styles.css` palette, scaffold the tables with Prisma or Knex, then let Copilot implement one module at a time.

**Everything above is modular—add a new offering tomorrow by writing *one* FM JSON and updating the Service Type matrix.** The portal instantly adapts, keeping your minimalist Virgil-Abloh-meets-West-Side flair intact.
