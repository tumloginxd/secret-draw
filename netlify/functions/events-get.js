// netlify/functions/events-get.js
const { getDb, initDb, ok, err, optionsResponse } = require("./_db");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse();
  if (event.httpMethod !== "GET") return err("Method not allowed", 405);

  try {
    await initDb();
    const sql = getDb();
    const id = event.queryStringParameters?.id;
    if (!id) return err("Missing event id");

    const [ev] = await sql`
      SELECT id, name, event_date, locked,
             (password IS NOT NULL) AS has_password, created_at
      FROM events WHERE id = ${id}
    `;

    if (!ev) return err("ไม่พบกิจกรรมนี้", 404);

    const participants = await sql`
      SELECT name, has_drawn, recipient IS NOT NULL as has_recipient
      FROM participants
      WHERE event_id = ${id}
      ORDER BY joined_at ASC
    `;

    return ok({ ...ev, participants });
  } catch (e) {
    console.error(e);
    return err("เกิดข้อผิดพลาด: " + e.message, 500);
  }
};
