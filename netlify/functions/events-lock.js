// netlify/functions/events-lock.js
// Lock the event and generate derangement assignments
const { getDb, initDb, ok, err, optionsResponse } = require("./_db");

function generateDerangement(arr) {
  // Sattolo's algorithm — guaranteed derangement
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i); // j < i always
    [a[i], a[j]] = [a[j], a[i]];
  }
  // Sanity check
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
    const { eventId } = JSON.parse(event.body || "{}");

    if (!eventId) return err("Missing eventId");

    const [ev] = await sql`SELECT id, locked FROM events WHERE id = ${eventId}`;
    if (!ev) return err("ไม่พบกิจกรรมนี้", 404);
    if (ev.locked) return err("กิจกรรมถูกล็อกแล้ว");

    const participants = await sql`
      SELECT name FROM participants WHERE event_id = ${eventId} ORDER BY joined_at ASC
    `;
    const names = participants.map((p) => p.name);

    if (names.length < 2) return err("ต้องมีผู้เข้าร่วมอย่างน้อย 2 คน");

    // Generate derangement (retry up to 20 times if unlucky)
    let assigned = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      assigned = generateDerangement(names);
      if (assigned) break;
    }
    if (!assigned) return err("ไม่สามารถสุ่มได้ กรุณาลองใหม่", 500);

    // Save assignments
    for (let i = 0; i < names.length; i++) {
      await sql`
        UPDATE participants SET recipient = ${assigned[i]}
        WHERE event_id = ${eventId} AND name = ${names[i]}
      `;
    }

    await sql`UPDATE events SET locked = TRUE WHERE id = ${eventId}`;

    return ok({ success: true, count: names.length });
  } catch (e) {
    console.error(e);
    return err("เกิดข้อผิดพลาด: " + e.message, 500);
  }
};
