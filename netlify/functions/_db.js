// netlify/functions/_db.js
// Shared Neon PostgreSQL client

const { neon } = require("@neondatabase/serverless");

let sql;
function getDb() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

async function initDb() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id          VARCHAR(12)  PRIMARY KEY,
      name        VARCHAR(200) NOT NULL,
      event_date  DATE,
      password    VARCHAR(255),
      locked      BOOLEAN      DEFAULT FALSE,
      created_at  TIMESTAMP    DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS participants (
      id          SERIAL       PRIMARY KEY,
      event_id    VARCHAR(12)  REFERENCES events(id) ON DELETE CASCADE,
      name        VARCHAR(100) NOT NULL,
      recipient   VARCHAR(100),
      has_drawn   BOOLEAN      DEFAULT FALSE,
      joined_at   TIMESTAMP    DEFAULT NOW(),
      UNIQUE(event_id, name)
    )
  `;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function ok(body, status = 200) {
  return { statusCode: status, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function err(msg, status = 400) {
  return { statusCode: status, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ error: msg }) };
}

function optionsResponse() {
  return { statusCode: 204, headers: cors, body: "" };
}

module.exports = { getDb, initDb, ok, err, optionsResponse };
