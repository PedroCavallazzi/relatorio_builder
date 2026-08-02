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
  template_id NUMBER REFERENCES report_templates(id) ON DELETE SET NULL,
  format      VARCHAR2(10),
  rendered_at TIMESTAMP DEFAULT SYSTIMESTAMP,
  caller      VARCHAR2(200)
);
