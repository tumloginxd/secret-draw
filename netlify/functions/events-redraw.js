// netlify/functions/events-redraw.js
// Re-generate all assignments (password required)
const bcrypt = require("bcryptjs");
const { getDb, initDb, ok, err, optionsResponse } = require("./_db");

function generateDerangement(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === a[i]) return null;
  }
  return a;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse();
  if (event.httpMethod !== "POST") return err("Method not allowed", 405);

  try {
    await initDb();
    const sql = getDb();
    const { eventId, password } = JSON.parse(event.body || "{}");

    if (!eventId) return err("Missing eventId");

    const [ev] = await sql`SELECT id, locked, password FROM events WHERE id = ${eventId}`;
    if (!ev) return err("ไม่พบกิจกรรมนี้", 404);

    // Require password to redraw
    if (ev.password) {
      if (!password) return err("กรุณาใส่รหัสผ่าน", 401);
      const valid = await bcrypt.compare(password, ev.password);
      if (!valid) return err("รหัสผ่านไม่ถูกต้อง", 401);
    } else {
      if (password !== "eiei") return err("รหัสผ่านไม่ถูกต้อง", 401);
    }

    const participants = await sql`
      SELECT name FROM participants WHERE event_id = ${eventId} ORDER BY joined_at ASC
    `;
    const names = participants.map((p) => p.name);
    if (names.length < 2) return err("ผู้เข้าร่วมน้อยเกินไป");

    let assigned = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      assigned = generateDerangement(names);
      if (assigned) break;
    }
    if (!assigned) return err("ไม่สามารถสุ่มได้", 500);

    // Reset all assignments and drawn status
    for (let i = 0; i < names.length; i++) {
      await sql`
        UPDATE participants SET recipient = ${assigned[i]}, has_drawn = FALSE
        WHERE event_id = ${eventId} AND name = ${names[i]}
      `;
    }

    return ok({ success: true, message: "สุ่มใหม่เรียบร้อยแล้ว" });
  } catch (e) {
    console.error(e);
    return err("เกิดข้อผิดพลาด: " + e.message, 500);
  }
};
