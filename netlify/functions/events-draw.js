// netlify/functions/events-draw.js
// Called when a participant clicks their own name to reveal their recipient
const { getDb, initDb, ok, err, optionsResponse } = require("./_db");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse();
  if (event.httpMethod !== "POST") return err("Method not allowed", 405);

  try {
    await initDb();
    const sql = getDb();
    const { eventId, name } = JSON.parse(event.body || "{}");

    if (!eventId || !name) return err("ข้อมูลไม่ครบ");

    const [ev] = await sql`SELECT locked FROM events WHERE id = ${eventId}`;
    if (!ev) return err("ไม่พบกิจกรรมนี้", 404);
    if (!ev.locked) return err("กิจกรรมยังไม่พร้อม รอให้เจ้าของกิจกรรมล็อกรายชื่อก่อน");

    const [participant] = await sql`
      SELECT name, recipient, has_drawn
      FROM participants
      WHERE event_id = ${eventId} AND name = ${name}
    `;

    if (!participant) return err("ไม่พบชื่อนี้ในกิจกรรม");

    // Mark as drawn
    if (!participant.has_drawn) {
      await sql`
        UPDATE participants SET has_drawn = TRUE
        WHERE event_id = ${eventId} AND name = ${name}
      `;
    }

    return ok({ recipient: participant.recipient });
  } catch (e) {
    console.error(e);
    return err("เกิดข้อผิดพลาด: " + e.message, 500);
  }
};
