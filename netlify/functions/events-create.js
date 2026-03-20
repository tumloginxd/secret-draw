// netlify/functions/events-create.js
const bcrypt = require("bcryptjs");
const { customAlphabet } = require("nanoid");
const { getDb, initDb, ok, err, optionsResponse } = require("./_db");

const nanoid = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 8);

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse();
  if (event.httpMethod !== "POST") return err("Method not allowed", 405);

  try {
    await initDb();
    const sql = getDb();
    const { name, eventDate, password } = JSON.parse(event.body || "{}");

    if (!name || name.trim().length < 1) return err("กรุณาใส่ชื่อกิจกรรม");

    const id = nanoid();
    let hashedPassword = null;
    if (password && password.trim().length > 0) {
      hashedPassword = await bcrypt.hash(password.trim(), 10);
    }

    await sql`
      INSERT INTO events (id, name, event_date, password)
      VALUES (${id}, ${name.trim()}, ${eventDate || null}, ${hashedPassword})
    `;

    return ok({ id, name: name.trim(), eventDate: eventDate || null, hasPassword: !!hashedPassword });
  } catch (e) {
    console.error(e);
    return err("เกิดข้อผิดพลาด: " + e.message, 500);
  }
};
