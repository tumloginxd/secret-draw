// netlify/functions/events-join.js
const { getDb, initDb, ok, err, optionsResponse } = require("./_db");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse();
  if (event.httpMethod !== "POST") return err("Method not allowed", 405);

  try {
    await initDb();
    const sql = getDb();
    const { eventId, name } = JSON.parse(event.body || "{}");

    if (!eventId || !name?.trim()) return err("ข้อมูลไม่ครบ");

    const [ev] = await sql`SELECT id, locked FROM events WHERE id = ${eventId}`;
    if (!ev) return err("ไม่พบกิจกรรมนี้", 404);
    if (ev.locked) return err("กิจกรรมนี้ล็อกรายชื่อแล้ว ไม่สามารถเข้าร่วมได้");

    const trimmed = name.trim();
    try {
      await sql`
        INSERT INTO participants (event_id, name)
        VALUES (${eventId}, ${trimmed})
      `;
    } catch (e) {
      if (e.message?.includes("unique") || e.message?.includes("duplicate")) {
        return err("ชื่อนี้ถูกใช้ในกิจกรรมนี้แล้ว");
      }
      throw e;
    }

    return ok({ success: true, name: trimmed });
  } catch (e) {
    console.error(e);
    return err("เกิดข้อผิดพลาด: " + e.message, 500);
  }
};
