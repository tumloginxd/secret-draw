# 🎁 Secret Draw

แอปจับฉลากของขวัญ Secret Santa — แชร์ลิงก์ให้เพื่อน แต่ละคนจับฉลากเองโดยไม่ต้องอยู่ด้วยกัน

**Stack:** Netlify Functions (serverless) + Neon PostgreSQL (ฟรีทั้งหมด)

---

## 🗂 โครงสร้างโปรเจกต์

```
secret-draw/
├── netlify.toml                  # Netlify config + redirects
├── package.json
├── schema.sql                    # SQL สำหรับสร้าง tables ใน Neon
├── netlify/
│   └── functions/
│       ├── _db.js                # Shared DB helper
│       ├── events-create.js      # POST /api/events-create
│       ├── events-get.js         # GET  /api/events-get?id=xxx
│       ├── events-join.js        # POST /api/events-join
│       ├── events-lock.js        # POST /api/events-lock
│       ├── events-draw.js        # POST /api/events-draw
│       ├── events-reveal.js      # POST /api/events-reveal
│       └── events-redraw.js      # POST /api/events-redraw
└── public/
    ├── index.html                # หน้าสร้างกิจกรรม
    ├── event.html                # หน้าจับฉลาก (shared URL)
    └── css/
        └── style.css
```

---

## 🚀 วิธี Deploy (ทีละขั้น)

### ขั้นตอนที่ 1 — สร้าง Neon Database (ฟรี)

1. ไปที่ [https://neon.tech](https://neon.tech) → Sign up ฟรี
2. สร้าง Project ใหม่ (เลือก Region ใกล้ๆ เช่น Singapore)
3. ไปที่ **SQL Editor** แล้ว paste เนื้อหาใน `schema.sql` แล้วกด Run
4. ไปที่ **Dashboard → Connection Details** → คัดลอก **Connection string** รูปแบบ:
   ```
   postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

### ขั้นตอนที่ 2 — Push ขึ้น GitHub

```bash
cd secret-draw
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/secret-draw.git
git push -u origin main
```

### ขั้นตอนที่ 3 — Deploy บน Netlify

1. ไปที่ [https://netlify.com](https://netlify.com) → Sign up / Login
2. กด **"Add new site"** → **"Import an existing project"**
3. เชื่อมต่อ GitHub และเลือก repo `secret-draw`
4. ตั้งค่า Build:
   - **Build command:** _(ว่างเปล่า หรือ `echo done`)_
   - **Publish directory:** `public`
5. กด **Deploy site**

### ขั้นตอนที่ 4 — ตั้ง Environment Variable

1. ใน Netlify → ไปที่ **Site settings → Environment variables**
2. กด **Add a variable**:
   - Key: `DATABASE_URL`
   - Value: (Connection string จาก Neon ในขั้นตอนที่ 1)
3. กด **Save** แล้ว **Trigger deploy** ใหม่

### ขั้นตอนที่ 5 — (ไม่บังคับ) ตั้ง Custom Domain

1. Netlify → **Domain management → Add custom domain**
2. ใส่โดเมนของคุณ เช่น `secret-draw.yourdomain.com`

---

## 🏃 รัน Local (Development)

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. สร้างไฟล์ .env
echo "DATABASE_URL=postgresql://..." > .env

# 3. รัน local dev server (ต้องติดตั้ง netlify-cli)
npx netlify dev
```

เปิด [http://localhost:8888](http://localhost:8888)

---

## 📖 User Flow

```
ผู้สร้าง:
  1. เปิด https://your-site.netlify.app
  2. ใส่ชื่อกิจกรรม / วันที่ / รหัสผ่าน (ไม่บังคับ)
  3. กด "สร้างกิจกรรม" → ได้ URL เช่น /event/ab3x9kp2
  4. แชร์ URL ให้เพื่อน

เพื่อนแต่ละคน:
  5. เปิด URL ที่ได้รับ
  6. กรอกชื่อตัวเอง → กด "เข้าร่วม"

ผู้สร้าง:
  7. รอทุกคนเข้าร่วมครบ
  8. กด "ล็อกรายชื่อ & เริ่มจับฉลาก"
     → ระบบสุ่ม derangement (ไม่มีใครได้ตัวเอง) เก็บใน DB

เพื่อนแต่ละคน:
  9. กดปุ่ม "จับ!" ที่การ์ดชื่อตัวเอง
  10. Popup แสดงชื่อคนที่ตัวเองต้องซื้อของให้ (เห็นเฉพาะตัวเอง)

หลังครบทุกคน:
  11. ช่องรหัสผ่านจะปรากฏขึ้น
  12. กรอกรหัสผ่าน (ค่าเริ่มต้น: "eiei") → กด "ดูผล"
  13. Popup แสดงผลทั้งหมด + ปุ่ม "สุ่มใหม่ทั้งหมด"
```

---

## 🔐 ระบบรหัสผ่าน

| สถานการณ์ | รหัสผ่านที่ใช้ดูผล |
|---|---|
| ไม่ได้ตั้งรหัสผ่านตอนสร้าง | `eiei` |
| ตั้งรหัสผ่านเองตอนสร้าง | รหัสผ่านที่ตั้ง |

รหัสผ่านถูก hash ด้วย **bcrypt** ก่อนเก็บใน database

---

## 🛡 Algorithm

ใช้ **Sattolo's Algorithm** สำหรับสร้าง derangement — รับประกัน 100% ว่าไม่มีใครได้ชื่อตัวเอง แม้มีผู้เข้าร่วมจำนวนมาก

---

## 💰 ค่าใช้จ่าย

| Service | Free Tier |
|---|---|
| Netlify | 100GB bandwidth/เดือน, 125K function calls/เดือน |
| Neon | 0.5 GB storage, compute ฟรี |

สำหรับงาน Secret Santa ทั่วไป ใช้ฟรีได้ตลอด ✅
