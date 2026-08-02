# Relatorio Builder

A drag-and-drop report designer and REST rendering API to replace iReport in Oracle APEX applications.

Design reports visually in the browser, then call a single REST endpoint from APEX to render them as PDF or HTML.

---

## How it works

```
Oracle APEX  ──POST /api/render/:id──►  Node.js API  ──► Puppeteer ──► PDF
              { format, data: [...] }               └──► Handlebars ──► HTML

Browser      ──GET /──────────────────►  Node.js API  ──► builder/dist (SPA)
```

The **builder** is a React + GrapesJS SPA for designing report templates. The **API** stores templates in Oracle DB and renders them on demand.

---

## Requirements

- Node.js 20+
- Oracle DB (any edition) + Oracle Instant Client on the server
- Chromium — downloaded automatically by Puppeteer on `npm install`

---

## Setup

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

Edit `.env`:

```
PORT=3000
DB_USER=reports_user
DB_PASSWORD=secret
DB_CONNECT_STRING=localhost/XEPDB1
```

**3. Create database tables**

Run `packages/api/migrations/001_create_tables.sql` once as a privileged user.

**4. Build the frontend**

```bash
npm run build --workspace=packages/builder
```

**5. Start the server**

```bash
npm start --workspace=packages/api
```

Open `http://localhost:3000` to use the builder.

> **Development:** run `npm run dev --workspace=packages/builder` in a separate terminal for the Vite dev server with hot-reload at `http://localhost:5173`.

---

## Using the Builder

1. Click **+ New** in the template list to create a report
2. Drag blocks from the left panel onto the canvas:
   - **TextField** — renders a single variable: `{{customer_name}}`
   - **DataTable** — repeating rows: `{{#each rows}}...{{/each}}`
   - **ReportImage** — image from a URL variable: `{{image_url}}`
   - **PageBreak** — forces a page break in PDF output
3. Click a block and edit its properties (variable name, styles, columns) in the right panel
4. Enter a default SQL query in the toolbar for preview
5. Click **Preview** to see the report with real data
6. Click **Save** — the template is stored in Oracle and is ready to render

---

## Oracle APEX Integration

Call `POST /api/render/:id` from any APEX page or process.

```sql
DECLARE
  l_response BLOB;
BEGIN
  apex_web_service.set_request_headers(
    p_name_01  => 'Content-Type',
    p_value_01 => 'application/json'
  );

  l_response := apex_web_service.make_rest_request_b(
    p_url         => 'http://report-server:3000/api/render/42',
    p_http_method => 'POST',
    p_body        => '{"format":"pdf","data":{"customer":"ACME","rows":[{"item":"Widget","qty":1}]}}'
  );

  -- trigger browser download
  sys.htp.init;
  owa_util.mime_header('application/pdf', FALSE);
  htp.p('Content-Disposition: attachment; filename="report.pdf"');
  owa_util.http_header_close;
  wpg_docload.download_file(l_response);
  apex_application.stop_apex_engine;
END;
```

Use `make_rest_request` (returns CLOB) for `format: "html"`.

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/templates` | List all templates |
| `GET` | `/api/templates/:id` | Get template by id |
| `POST` | `/api/templates` | Create template |
| `PUT` | `/api/templates/:id` | Update template |
| `DELETE` | `/api/templates/:id` | Delete template |
| `POST` | `/api/data/query` | Run SQL, return rows (builder preview) |
| `POST` | `/api/render/:id` | Render template as PDF or HTML |
| `GET` | `/api/health` | Health check |

Full documentation: [`docs/guide.html`](docs/guide.html)

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, GrapesJS 0.21 |
| API | Node.js, Express 4 |
| Database | Oracle DB via oracledb 6 |
| PDF rendering | Puppeteer 22 (headless Chromium) |
| HTML rendering | Handlebars 4 |
| Monorepo | npm workspaces |
