// netlify/functions/events-reveal.js
// Reveal all assignments — requires correct password
const bcrypt = require("bcryptjs");
const { getDb, initDb, ok, err, optionsResponse } = require("./_db");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse();
  if (event.httpMethod !== "POST") return err("Method not allowed", 405);

  try {
    await initDb();
    const sql = getDb();
    const { eventId, password } = JSON.parse(event.body || "{}");

    if (!eventId) return err("Missing eventId");

    const [ev] = await sql`SELECT id, name, locked, password FROM events WHERE id = ${eventId}`;
    if (!ev) return err("ไม่พบกิจกรรมนี้", 404);
    if (!ev.locked) return err("กิจกรรมยังไม่ได้เริ่มจับฉลาก");

    // Check password
    if (ev.password) {
      if (!password) return err("กรุณาใส่รหัสผ่าน", 401);
      const valid = await bcrypt.compare(password, ev.password);
      if (!valid) return err("รหัสผ่านไม่ถูกต้อง", 401);
    } else {
      // No password set — use master keyword "eiei"
      if (password !== "eiei") return err("รหัสผ่านไม่ถูกต้อง", 401);
    }

    const participants = await sql`
      SELECT name, recipient, has_drawn
      FROM participants
      WHERE event_id = ${eventId}
      ORDER BY joined_at ASC
    `;

    // Check all have drawn
    const allDrawn = participants.every((p) => p.has_drawn);

    return ok({
      eventName: ev.name,
      allDrawn,
      assignments: participants.map((p) => ({
        drawer: p.name,
        recipient: p.recipient,
        hasDrawn: p.has_drawn,
      })),
    });
  } catch (e) {
    console.error(e);
    return err("เกิดข้อผิดพลาด: " + e.message, 500);
  }
};
