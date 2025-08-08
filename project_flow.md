# The \[RE]Print Studios 8-Step Project Flow

*(granular, production-ready; who does what, when it advances, and why it’s set up this way)*

Below is the end-to-end path for **every project** in your portal. Each step includes: purpose, what the **client** sees/does, what the **admin** (you) sees/does, **artifacts** (forms/docs), **advancement trigger** (who advances the step and how), and **best-practice notes** adopted from design studios, print shops, and software teams.

---

## 1) Onboarding

**Purpose**
Capture scope, pick services, set terms, and collect a deposit so production can actually start. Industry-standard best practice is to use a modular agreement + up-front payment to reduce risk and scope drift. ([AIGA][1])

**Client experience**

* Dashboard shows **Step 1: Onboarding** with a short intro, timeline, and your branded line: */for/ {client} /by/ Kendrick Forrest*.
* Sees **dynamic intake forms** based on services they’re buying (e.g., Screen Print, Web, Book Cover).
* Can review an auto-generated **Proposal** and **SOW/Service Agreement**; signs digitally in-portal; deposit invoice appears immediately.

**Admin experience**

* Choose service types; portal composes the phase list + forms.
* Adjust line items, add any constraints, then **generate proposal/SOW PDF** (Puppeteer route).
* Optionally require 2FA for first login.

**Artifacts**

* Forms: `intake_base`, plus specific modules like `intake_sp`, `intake_book_cover`, `intake_website`, etc.
* Docs: Proposal, **Service Agreement (SOW)**.

**Advancement trigger**

* **Automatic** when both are true: **Agreement signed** + **deposit marked paid**. (Portal listens for **Stripe `payment_intent.succeeded` / `invoice.paid`** and flips phase.) ([Stripe Docs][2])

**Notes / best practice**

* Use a **modular contract** (AIGA model) so you can add print-specific or interactive terms without rewriting the whole thing. ([AIGA][3], [davidberman.com][4])

---

## 2) Ideation (or Discovery)

**Purpose**
Define direction: moodboards, references, constraints, and a **one-page Creative Brief**. Keep it lightweight but decisive; iterate quickly. ([Nielsen Norman Group][5])

**Client**

* Sees a **moodboard feed** and **Creative Brief** live doc.
* Can leave comments, drop links, and select preferred directions.

**Admin**

* Upload inspiration, write the Creative Brief, pin 2–3 directions (not 20).
* Run a time-boxed **critique** with the client (clear goals, not “opinions”), then lock a direction. ([Nielsen Norman Group][6])

**Artifacts**

* Brief (HTML/PDF), reference list.

**Advancement trigger**

* **Client clicks “Approve Brief.”** Admin may also advance manually with a memo if approval was verbal.

**Notes / best practice**

* Favor **parallel, iterative** concepting over one “big reveal”; it yields better outcomes with fewer cycles. ([Nielsen Norman Group][5])

---

## 3) Design (Production of drafts/comps)

**Purpose**
Produce tangible drafts (artboards, wireframes, cover comps, logo explorations). Work in **rounds** with a set revision limit.

**Client**

* Sees “v1” deliverables gallery (Figma embeds, image previews) and **what’s included** (e.g., 2 rounds).
* Can leave quick reactions, then formal feedback in next step.

**Admin**

* Upload deliverables; tag each with **round index** (v1, v2…).
* Declare **revision policy** (e.g., 2 rounds included; further changes → Change Order).

**Artifacts**

* Deliverable set, `design_brief` reference.

**Advancement trigger**

* **Admin** advances to **Review & Feedback** once first draft set is posted.

**Notes / best practice**

* Limit rounds, collect **structured** feedback, then iterate—this mirrors established studio processes and keeps budgets sane. ([AIGA][1])

---

## 4) Review & Feedback (Approval Gate)

**Purpose**
Gather **structured** feedback and secure explicit approval. For print/graphics, also run a formal **proof approval** checklist.

**Client**

* For each deliverable: **Approve** ✅ or **Request changes** ✏️.
* If **print** or **graphics for print**, must tick **proof checklist** (spelling, colors, placement, bleed) before approval. ([4OVER4.COM][7], [Disk.com][8], [thebusinesstoolkit.com][9])

**Admin**

* Triages change requests into a to-do list; uploads v2/v3 as needed.
* If revision limit is exceeded, portal generates a **Change Order** for approval.

**Artifacts**

* Forms: `change_request`, `proof_approval` (print/graphics).
* Docs: **Change Order** (if scope increase).

**Advancement trigger**

* **Automatic** when **all deliverables in scope are Approved** (or when client signs Change Order that defers some items).
* Print jobs require **proof approval** before production unlocks. ([Disk.com][8])

**Notes / best practice**

* Treat proof approval as a **contractual sign-off** to avoid costly misprints; get it **in writing with a timestamp**. ([4OVER4.COM][7])

---

## 5) Production / Build

*(a.k.a. Pre-Press → Print for apparel/large-format; CAD → Fabricate for wood; QA → Deploy-ready for software)*

**Purpose**
Execute the approved work safely and predictably.

**Client**

* Sees a **live status meter** (e.g., “Screens burned / Printing / QC / Packed” or “QA / UAT / Release Candidate”).
* Optional **press check** for high-stakes color work; optional **staging/UAT** checklist for software. ([Department of Enterprise Services][10], [Syncro][11])

**Admin**

* **Print/LFP:** Lock pre-press proof, burn screens, log batches, upload a couple of progress snapshots.
* **Wood:** Log material lot, cutlist, assembly photos.
* **Web/SaaS/Python:** Run **deployment checklist** (backups, env secrets, monitoring, rollback plan, domain), fix blocking bugs. ([Codefresh][12], [Syncro][11])

**Artifacts**

* Checklists: pre-press or deploy; fabrication/QA logs.

**Advancement trigger**

* **Admin** clicks **“Ready to Invoice”** when goods are QC’d / code passes acceptance, which creates **Final Invoice** and opens Step 6.

---

## 6) Payment (Final Balance)

**Purpose**
Collect remaining balance before hand-off.

**Client**

* Sees **Final Invoice** (grouped by service), pays by card/ACH.
* If payment fails, portal retries and shows clear error/help.

**Admin**

* Waits; no manual flips needed.

**Artifacts**

* Doc: Invoice (HTML/PDF), receipt on success.

**Advancement trigger**

* **Automatic via Stripe webhook** when invoice is **paid** (`invoice.paid` / `payment_intent.succeeded`). If a failure or dispute event hits, portal holds the phase and alerts admin. ([Stripe Docs][13])

**Notes / best practice**

* Use webhook verification and idempotency to avoid double-advances or missed flips. ([Stigg][14])

---

## 7) Sign-Off & Docs (Rights & Records)

**Purpose**
Transfer rights, ship the document bundle, and close the loop.

**Client**

* Downloads the **Final Assets/Docs Pack** (ZIP).
* Signs **Completion & Rights Transfer** (notarized if required).
* (Optional) leaves a quick testimonial.

**Admin**

* Prepares style guide/tech specs/care sheet; includes licenses.
* If you require notarization for certain agreements, route to a RON provider and file the **notarial certificate** with the signed PDF.

**Artifacts**

* Docs: **Project Completion & Rights Transfer**, Brand Guide / Print Specs / Care Sheet, etc.

**Advancement trigger**

* **Automatic** upon **signed** Completion Agreement (webhook or in-house signature capture). If notarized, advance when **notary session** returns completed package.

**Notes / best practice**

* AIGA models emphasize clear **ownership/licensing** language at hand-off; keep this in your SOW + completion doc to prevent ambiguity. ([AIGA][3])

---

## 8) **Launch** (instead of “Delivery”)

**Purpose**
Make it official: release assets, “go-live,” schedule pickup/shipping—celebrate and invite the next project.

**Client**

* Sees **Launch Certificate** page with tracking links / live URL / pickup details.
* CTA: **Start a new project** or **Re-order**.

**Admin**

* Triggers shipping label or schedules pickup; for software, executes the **release** and checks post-deploy monitors.

**Artifacts**

* Doc: Launch Certificate, tracking numbers or live links.

**Advancement trigger**

* **Admin** clicks **“Complete Project”** after confirming launch tasks done.
* Portal then schedules an **automatic follow-up** (e.g., 14-day check-in and testimonial request).

**Notes / best practice**

* Treat launch as a **stage-gate** with a small checklist & KPIs (e.g., site uptime, order accuracy) so it’s measurable, not just ceremonial. ([Coda][15])

---

# Quick Reference: Who advances what?

| Step                | Primary actor | Hard gate(s) to advance                                                                    |
| ------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| 1 Onboarding        | **Automatic** | Signed SOW **and** deposit **paid** (webhook). ([AIGA][16], [Stripe Docs][2])              |
| 2 Ideation          | **Client**    | **Approve Brief** (button). ([Nielsen Norman Group][5])                                    |
| 3 Design            | **Admin**     | Post v1 set; move to formal review.                                                        |
| 4 Review & Feedback | **Automatic** | **All deliverables Approved**; for print **proof approved**. ([Disk.com][8])               |
| 5 Production/Build  | **Admin**     | Mark **Ready to Invoice** after QC/deploy-readiness (checklist). ([Syncro][11])            |
| 6 Payment           | **Automatic** | **Invoice paid** (Stripe `invoice.paid` / `payment_intent.succeeded`). ([Stripe Docs][17]) |
| 7 Sign-Off & Docs   | **Automatic** | Completion agreement signed (and notarized, if applicable).                                |
| 8 Launch            | **Admin**     | Launch tasks complete → **Complete Project**; follow-ups are scheduled.                    |

---

## Service-specific notes (how the same flow adapts)

* **Screen Printing / Large-Format** → Step 4 includes **Proof Approval**; Step 5 can optionally offer a **press check** for color-critical jobs. ([Department of Enterprise Services][10])
* **Graphic/Logo/Book Cover** → Step 3/4 uses **limited rounds** + critiques; Step 7 bundles **print-ready PDFs** with specs. ([Nielsen Norman Group][6])
* **Web/SaaS/Python** → Step 5 uses **deploy checklist** (backups, secrets, monitoring, rollback) and **UAT**; Step 8 includes **post-deploy checks**. ([Codefresh][12], [Syncro][11])
* **Woodworking** → Step 5 logs **material lots** and **fabrication steps**; Step 7 adds **care sheet**.

---

## Why this mirrors “best practice”

* **Contracts + deposits up front** reduce cancellations and scope creep; AIGA’s modular SOW is the industry baseline. ([AIGA][1])
* **Iterative design with structured critiques** accelerates quality and avoids personal-taste debates. ([Nielsen Norman Group][5])
* **Proof approval** before production is standard QA in print to prevent expensive rework. ([Disk.com][8], [4OVER4.COM][7])
* **Webhook-driven phase changes** (for payments) keep human error out of billing logic. ([Stripe Docs][13])
* **Checklists for deployment/launch** cut risk and make success measurable. ([Syncro][11], [Coda][15])

---

## Operational guardrails (baked into the portal)

* **SLA timers** on each step (e.g., review due in 5 business days), with polite nudges.
* **Scope guard**: if revision count hits the limit, the **Change Order** dialog opens automatically.
* **Audit trail**: every approval/decline stores user, timestamp, IP, and a PDF snapshot of the screen state.
* **One accent per page**, bone-white canvas, minimal icons—your vibe stays intact.

If you want, I can wire these gates and triggers into your codebase now (using the Puppeteer routes and schemas we generated), so moving from **Brief → Launch** is literally a series of green checks—no guesswork, no back-and-forth chaos.

[1]: https://www.aiga.org/resources/aiga-standard-form-of-agreement-for-design-services?utm_source=chatgpt.com "AIGA Standard Form of Agreement for Design Services"
[2]: https://docs.stripe.com/payments/handling-payment-events?utm_source=chatgpt.com "Triggering actions with webhooks - Stripe Documentation"
[3]: https://www.aiga.org/sites/default/files/2021-04/standard-form-of-agreement-for-design-services.pdf?utm_source=chatgpt.com "[PDF] Standard Form of Agreement for Design Services - AIGA"
[4]: https://davidberman.com/wp-content/uploads/AIGA-Standard-Form-of-Agreement-for-Design-Services.pdf?utm_source=chatgpt.com "[PDF] STANDARD FORM OF AGREEMENT FOR DESIGN SERVICES"
[5]: https://www.nngroup.com/articles/parallel-and-iterative-design/?utm_source=chatgpt.com "Parallel & Iterative Design + Competitive Testing = High Usability"
[6]: https://www.nngroup.com/articles/design-critiques/?utm_source=chatgpt.com "Design Critiques: Encourage a Positive Culture to Improve Products"
[7]: https://www.4over4.com/content-hub/stories/printing-checklist?srsltid=AfmBOopkE7V84Pnnko-QxkE_GP1pXTHM_J9ftRz77crnJK1qtqThCJrg&utm_source=chatgpt.com "Master Printing Checklist: Your Complete Quality Guide - 4OVER4"
[8]: https://disk.com/resources/print-quality-control/?utm_source=chatgpt.com "Print Quality Control: Ensuring Consistency in Every Print Stage"
[9]: https://www.thebusinesstoolkit.com/prepress-checklist-how-to-prepare-your-design-for-print/?srsltid=AfmBOoppCbUME2ttQnqCxiDqhMe6QcekSq9ROCTDC_QcYLiv9A3IOhRs&utm_source=chatgpt.com "Prepress Checklist: How to prepare your design for print"
[10]: https://des.wa.gov/services/printing-mailing/resource-center/how-perform-press-check?utm_source=chatgpt.com "How to Perform a Press Check"
[11]: https://syncromsp.com/blog/software-deployment-checklist/?utm_source=chatgpt.com "Software Deployment Checklist: A Guide for IT Professionals - Syncro"
[12]: https://codefresh.io/learn/software-deployment/?utm_source=chatgpt.com "What Is Software Deployment? Checklist and Strategies - Codefresh"
[13]: https://docs.stripe.com/webhooks?utm_source=chatgpt.com "Receive Stripe events in your webhook endpoint"
[14]: https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks?utm_source=chatgpt.com "Best practices I wish we knew when integrating Stripe webhooks"
[15]: https://coda.io/%40laila-robinson/software-deployment-checklist?utm_source=chatgpt.com "Ultimate Software Deployment Checklist [+Best Practices] - Coda"
[16]: https://www.aiga.org/resources/payment-strategies-for-freelance-designers-and-design-firms?utm_source=chatgpt.com "Payment Strategies for Freelance Designers and Design Firms - AIGA"
[17]: https://docs.stripe.com/api/events/types?utm_source=chatgpt.com "Types of events | Stripe API Reference"
