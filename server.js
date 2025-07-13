const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

const db = new sqlite3.Database("./data/data.db", (err) => {
  if (err) return console.error(err.message);
  db.run(`CREATE TABLE IF NOT EXISTS Numbers (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Date TEXT,
    Year INTEGER,
    Month INTEGER,
    WeekNo INTEGER,
    DayName TEXT,
    FirstNumber INTEGER,
    SecondNumber INTEGER,
    DaySpecial TEXT
  )`);
});

db.run(`CREATE TABLE IF NOT EXISTS DaySpecialOptions (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  Name TEXT UNIQUE
)`);

const defaultOptions = ["Holiday", "Festival", "Workday", "Event"];
defaultOptions.forEach(opt => {
  db.run(`INSERT OR IGNORE INTO DaySpecialOptions (Name) VALUES (?)`, [opt]);
});

app.post("/add", (req, res) => {
  const { date, first, second, special } = req.body;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
  const weekNo = Math.ceil((d.getDate() + 6 - d.getDay()) / 7);
  db.run(
    `INSERT INTO Numbers (Date, Year, Month, WeekNo, DayName, FirstNumber, SecondNumber, DaySpecial)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [date, year, month, weekNo, dayName, first, second, special],
    (err) => {
      if (err) {
        console.error("DB Insert Error:", err.message);
        return res.status(500).send("Database error");
      }
      res.send({ message: "Added successfully" });
    }
  );
});

app.post("/dayspecials", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).send("Name required");
  db.run(`INSERT OR IGNORE INTO DaySpecialOptions (Name) VALUES (?)`, [name], function (err) {
    if (err) {
      console.error("Failed to add option", err.message);
      return res.status(500).send("Error");
    }
    res.send({ success: true });
  });
});

app.get("/dayspecials", (req, res) => {
  db.all("SELECT Name FROM DaySpecialOptions", [], (err, rows) => {
    if (err) {
      console.error("Failed to load DaySpecialOptions", err.message);
      return res.status(500).send("Error");
    }
    res.json(rows.map(r => r.Name));
  });
});

app.post("/filter", (req, res) => {
  const { year, month, day, week, special } = req.body;
  let sql = "SELECT * FROM Numbers WHERE 1=1";
  const params = [];

  if (year) { sql += " AND Year = ?"; params.push(year); }
  if (month) { sql += " AND Month = ?"; params.push(month); }
  if (day) { sql += " AND strftime('%d', Date) = ?"; params.push(day.padStart(2, "0")); }
  if (week) { sql += " AND WeekNo = ?"; params.push(week); }
  if (special) { sql += " AND DaySpecial = ?"; params.push(special); }

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("Filter query failed:", err.message);
      res.status(500).send("Query error");
    } else {
      res.json(rows);
    }
  });
});

app.get("/data", (req, res) => {
  db.all("SELECT * FROM Numbers", [], (err, rows) => {
    if (err) return res.status(500).send(err.message);
    res.send(rows);
  });
});


app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
