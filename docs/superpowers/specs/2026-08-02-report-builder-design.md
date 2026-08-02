# Report Builder — Design Spec
**Date:** 2026-08-02
**Status:** Approved

## Context

Replace iReport in Oracle APEX applications with a custom report builder that:
- Provides a visual drag-and-drop designer for report templates
- Exposes a REST API that APEX can call to render reports as PDF or HTML
- Stores templates in Oracle DB (existing infrastructure)
- Is hosted on a dedicated on-premises server (separate from APEX)

---

## Architecture

Single monorepo, two packages, one Node.js process:

```
C:\ADS\relatoolrio\
├── packages/
│   ├── builder/          # React + GrapesJS SPA
│   └── api/              # Node.js Express server
├── package.json          # npm workspaces root
└── .env                  # Oracle credentials, server port
```

The `api` package:
- Serves `builder/dist` as static files at `/`
- Exposes all `/api/*` REST endpoints
- Connects to Oracle DB via `oracledb`
- Renders via Puppeteer (PDF) or Handlebars (HTML)

The `builder` package:
- Pure SPA, no SSR
- Talks only to `/api/*` on the same host
- Built to `packages/builder/dist`, served by the api package

```
Oracle APEX  ──POST /api/render/:id──►  Node.js API  ──► Puppeteer ──► PDF
                { format, data: [...] }               └──► Handlebars ──► HTML

Browser      ──GET /──────────────────►  Node.js API  ──► builder/dist (static)
```

---

## Builder (packages/builder)

**Stack:** React, GrapesJS, Axios

**Layout:** Three-panel GrapesJS editor
- Left: block palette
- Center: canvas
- Right: property inspector
- Bottom bar: template name, default SQL query, Preview and Save buttons

**Custom GrapesJS blocks:**

| Block | Output |
|---|---|
| TextField | `<span>{{variable_name}}</span>` — user sets variable name in properties |
| DataTable | `{{#each rows}}<tr>...</tr>{{/each}}` repeating table |
| ReportImage | `<img src="{{image_url}}">` |
| PageBreak | `<div style="page-break-before: always"></div>` |

**Data binding:** Handlebars.js syntax (`{{variable}}`, `{{#each rows}}...{{/each}}`).

**Template management panel:** Lists all templates from `GET /api/templates`. Allows create, rename, delete. Clicking a template loads it into the GrapesJS canvas.

**Preview:** Sends the current GrapesJS HTML + the template's default SQL query to `POST /api/data/query` to fetch sample data, then renders a preview in an iframe using `POST /api/render/:id` with `format=html`.

---

## API (packages/api)

**Stack:** Node.js, Express, oracledb, Handlebars, Puppeteer

### Endpoints

```
# Templates
GET    /api/templates          List all templates (id, name, description, updated_at)
GET    /api/templates/:id      Full template including grapes_json and data_query
POST   /api/templates          Create template — body: { name, description, grapes_json, data_query }
PUT    /api/templates/:id      Update template — body: same as POST
DELETE /api/templates/:id      Delete template

# Data (builder preview)
POST   /api/data/query         Run SQL query, return rows — body: { sql }

# Render (called by Oracle APEX)
POST   /api/render/:id         Render template with data
                               Body: { format: "pdf"|"html", data: { ...vars, rows: [...] } }
                               Response: PDF blob or HTML string
```

### Render Flow

1. Load `grapes_json` from Oracle for the given template id
2. Extract HTML string from the GrapesJS JSON
3. Wrap in base HTML shell (doctype, reset CSS, print styles)
4. `Handlebars.compile(html)(data)` — inject variables from request body
5. Log to `report_renders` audit table
6. If `format=html`: return compiled HTML (`Content-Type: text/html`)
7. If `format=pdf`: `puppeteer.page.setContent(html)` → `page.pdf({ format: 'A4', printBackground: true })` → return buffer (`Content-Type: application/pdf`)

**Puppeteer:** Single shared browser instance, one new page per request, page closed after render. Avoids 1s browser startup cost per request.

### Oracle APEX Integration Example

```sql
DECLARE
  l_response CLOB;
BEGIN
  l_response := apex_web_service.make_rest_request(
    p_url         => 'http://report-server:3000/api/render/42',
    p_http_method => 'POST',
    p_body        => '{"format":"pdf","data":{"customer":"ACME","rows":[{"col1":"a","col2":"b"}]}}'
  );
END;
```

---

## Oracle Data Model

```sql
CREATE TABLE report_templates (
  id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR2(200)  NOT NULL,
  description VARCHAR2(1000),
  grapes_json CLOB           NOT NULL,
  html_cache  CLOB,
  data_query  CLOB,
  created_at  TIMESTAMP DEFAULT SYSTIMESTAMP,
  updated_at  TIMESTAMP DEFAULT SYSTIMESTAMP
);

CREATE TABLE report_renders (
  id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id NUMBER REFERENCES report_templates(id),
  format      VARCHAR2(10),
  rendered_at TIMESTAMP DEFAULT SYSTIMESTAMP,
  caller      VARCHAR2(200)
);
```

`report_renders` is a lightweight audit log of every render call (optional but cheap to add now).

`data_query` stores the default SQL used during builder preview. APEX overrides this by passing `data` directly in the render request body.

---

## Rendering Pipeline

| Format | Engine | Typical latency |
|---|---|---|
| HTML | Handlebars compile + string return | < 20ms |
| PDF (simple) | Puppeteer headless Chromium | 300–600ms |
| PDF (complex) | Puppeteer headless Chromium | 1–2s |

CSS `@page` and `page-break-before: always` control pagination. The `PageBreak` block maps directly to this. A base HTML wrapper is injected before Puppeteer renders to ensure consistent fonts and margins.

---

## Data Connection

Two paths:

1. **Oracle direct (builder preview):** `POST /api/data/query` accepts raw SQL, runs it via `oracledb`, returns rows as JSON. Used only in the builder for previewing report data. Credentials in `.env`.

2. **APEX passes data (render time):** APEX runs its own query and sends results as JSON in the render request body. The API only compiles the template with the provided data — no DB query needed for rendering.

---

## Authentication

None — internal tool only. The server is accessible only on the internal network. A single static API key in `.env` (checked as `X-API-Key` header) can be added later if needed.

---

## Error Handling

- Invalid template id → 404
- SQL query error (preview) → 400 with Oracle error message
- Handlebars compile error → 400 with template variable name
- Puppeteer crash → 500, browser instance restarted automatically
- Oracle connection lost → 500, connection pool retries automatically via `oracledb` pool

---

## Out of Scope

- User authentication / role management
- Excel (XLSX) output (can be added later)
- Charts / data visualization blocks (can be added later)
- Report scheduling / email delivery
