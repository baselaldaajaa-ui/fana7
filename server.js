require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-only-change-me";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeThisDemoPassword123!";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Set it in .env locally or as an environment variable on Render.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      national_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS students_email_unique
      ON students (LOWER(email));

    CREATE UNIQUE INDEX IF NOT EXISTS students_national_id_unique
      ON students (national_id);
  `);

  const existing = await pool.query(
    "SELECT id FROM admins WHERE username = $1",
    [ADMIN_USERNAME]
  );

  if (existing.rowCount === 0) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
    await pool.query(
      "INSERT INTO admins (username, password_hash) VALUES ($1, $2)",
      [ADMIN_USERNAME, hash]
    );
  }
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8
  }
}));
app.use(express.static(path.join(__dirname, "public")));

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "عدد المحاولات كبير. حاول مرة أخرى لاحقًا." }
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.status(401).json({ error: "غير مصرح." });
}

function clean(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validNationalId(id) {
  return /^[A-Za-z0-9_-]{4,20}$/.test(id);
}

app.post("/api/register", registrationLimiter, async (req, res) => {
  const fullName = clean(req.body.fullName, 120);
  const email = clean(req.body.email, 160).toLowerCase();
  const nationalId = clean(req.body.nationalId, 20);

  if (fullName.length < 2) return res.status(400).json({ error: "يرجى إدخال الاسم الكامل." });
  if (!validEmail(email)) return res.status(400).json({ error: "يرجى إدخال بريد إلكتروني صحيح." });
  if (!validNationalId(nationalId)) {
    return res.status(400).json({ error: "الرقم التجريبي يجب أن يكون من 4 إلى 20 خانة." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO students (full_name, email, national_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [fullName, email, nationalId]
    );
    res.status(201).json({ message: "تم تسجيل المعلومات بنجاح.", id: result.rows[0].id });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "يوجد تسجيل سابق بنفس البريد أو الرقم التجريبي." });
    }
    console.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم." });
  }
});

app.post("/api/login", registrationLimiter, async (req, res) => {
  const username = clean(req.body.username, 80);
  const password = String(req.body.password ?? "");

  const result = await pool.query(
    "SELECT * FROM admins WHERE username = $1",
    [username]
  );
  const admin = result.rows[0];

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." });
  }

  req.session.adminId = admin.id;
  req.session.adminUsername = admin.username;
  res.json({ message: "تم تسجيل الدخول." });
});

app.post("/api/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ message: "تم تسجيل الخروج." }));
});

app.get("/api/me", (req, res) => {
  res.json({
    authenticated: Boolean(req.session && req.session.adminId),
    username: req.session?.adminUsername || null
  });
});

app.get("/api/students", requireAdmin, async (req, res) => {
  const q = clean(req.query.q, 100);
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  let result;
  if (q) {
    const like = `%${q}%`;
    result = await pool.query(`
      SELECT id, full_name, email, national_id, created_at
      FROM students
      WHERE full_name ILIKE $1 OR email ILIKE $1 OR national_id ILIKE $1
      ORDER BY id DESC
      LIMIT $2 OFFSET $3
    `, [like, limit, offset]);
  } else {
    result = await pool.query(`
      SELECT id, full_name, email, national_id, created_at
      FROM students
      ORDER BY id DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
  }

  const count = await pool.query("SELECT COUNT(*)::int AS count FROM students");
  res.json({ students: result.rows, total: count.rows[0].count });
});

app.delete("/api/students/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "معرّف غير صحيح." });

  const result = await pool.query("DELETE FROM students WHERE id = $1", [id]);
  if (!result.rowCount) return res.status(404).json({ error: "السجل غير موجود." });

  res.json({ message: "تم حذف السجل." });
});

app.get("/api/export.csv", requireAdmin, async (req, res) => {
  const result = await pool.query(`
    SELECT id, full_name, email, national_id, created_at
    FROM students ORDER BY id ASC
  `);

  const header = "ID,Full Name,Email,Demo National ID,Created At";
  const csv = [
    header,
    ...result.rows.map(r => [
      r.id, r.full_name, r.email, r.national_id, r.created_at.toISOString()
    ].map(v => `"${String(v).replaceAll('"', '""')}"`).join(","))
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="students.csv"');
  res.send("\ufeff" + csv);
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

initDb()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Student registration app running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });