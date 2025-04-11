const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const xml2js = require("xml2js");
const morgan = require("morgan");
const logger = require("./logger"); // Імпортуємо наш логгер

const app = express();
const db = new sqlite3.Database("jobs.db");
const SECRET = "supersecretkey";

const cors = require("cors");
app.use(cors());

app.use(express.json());

// Використовуємо morgan для логування HTTP запитів
app.use(morgan("combined", {
  stream: {
    write: (message) => logger.info(message.trim())  // Логуємо в winston
  }
}));

// Инициализация БД
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT, first_name TEXT, last_name TEXT, email TEXT, job_tag TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY, employer_id INTEGER, name TEXT, salary INTEGER, description TEXT, tag TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS subscriptions (worker_id INTEGER, job_id INTEGER, PRIMARY KEY(worker_id, job_id))");
    db.run("CREATE TABLE IF NOT EXISTS tokens (user_id INTEGER, token TEXT, PRIMARY KEY(user_id, token))");
});

// Middleware для проверки токена
function authenticateToken(req, res, next) {
    const token = req.header("Authorization");
    if (!token) {
        logger.warn(`Access denied, no token provided`);
        return res.status(401).json({ error: "Access denied" });}

    jwt.verify(token, SECRET, (err, user) => {
        if (err){
            logger.error(`Invalid Token: ${token}`);
            return res.status(403).json({ error: "Invalid token" });}
        req.user = user;
        next();
    });
}

// Регистрация
app.post("/register", (req, res) => {
    const { username, password, role } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [username, hash, role], err => {
            if (err) return res.status(400).json({ error: "User already exists" });
            res.json({ message: "User registered" });
        });
    });
});

// Вход
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (!user) return res.status(400).json({ error: "User not found" });
        bcrypt.compare(password, user.password, (err, match) => {
            if (!match) return res.status(400).json({ error: "Incorrect password" });
            const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
            db.run("INSERT INTO tokens (user_id, token) VALUES (?, ?)", [user.id, token]);
            res.json({ token, role:user.role });
        });
    });
});


// Вход
app.get("/user",authenticateToken, (req, res) => {
    const user=req.user
    db.get("SELECT * FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (!user) return res.status(400).json({ error: "User not found" });
        delete user.password
        res.json(user);
    });
});

app.post("/user", authenticateToken, (req, res) => {
    const {first_name, last_name, email, job_tag } = req.body;
    // console.log(role);

    // if (role !== "employer" && role !== "worker") {
    //     return res.status(404).json({ error: `Wrong role ${role}` });
    // }

    const query = `
        UPDATE users 
        SET first_name = ?, last_name = ?, email = ?, job_tag = ? 
        WHERE id = ?
    `;

    db.run(query, [first_name, last_name, email, job_tag, req.user.id], function (err) {
        if (err) {
            console.log(err);
            return res.status(400).json({ error: "Error updating user" });
        }
        res.json({ message: "User updated", changes: this.changes });
    });
});



// {
//     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6InVzZXIiLCJpYXQiOjE3NDQwMjA5NzN9.Zm41AIBrsDcu_K9Tvr8XsGzzi_QcmKR7tuyrd18mlds",
//     "role": "user"
// }

// Получение списка работ
app.get("/jobs", (req, res) => {
    db.all("SELECT * FROM jobs", [], (err, jobs) => {
        res.json(jobs);
    });
});

// Создание работы (для работодателя)
app.post("/jobs", authenticateToken, (req, res) => {
    if (req.user.role !== "employer") return res.status(403).json({ error: "Access denied" });
    const { name, salary, description, tag } = req.body;
    db.run("INSERT INTO jobs (employer_id, name, salary, description, tag) VALUES (?, ?, ?, ?, ?)", [req.user.id, name, salary, description, tag], function(err) {
        if (err) return res.status(400).json({ error: "Error creating job" });
        res.json({ message: "Job created", job_id: this.lastID });
    });
});

// Получение работ, созданных работодателем
app.get("/employer_jobs", authenticateToken, (req, res) => {
    if (req.user.role !== "employer") return res.status(403).json({ error: "Access denied" });
    db.all("SELECT * FROM jobs WHERE employer_id = ?", [req.user.id], (err, jobs) => {
        res.json(jobs);
    });
});

// Удаление работы (для работодателя)
app.delete("/jobs/:job_id", authenticateToken, (req, res) => {
    if (req.user.role !== "employer") return res.status(403).json({ error: "Access denied" });
    db.run("DELETE FROM jobs WHERE id = ? AND employer_id = ?", [req.params.job_id, req.user.id], function(err) {
        if (err) return res.status(400).json({ error: "Error deleting job" });
        res.json({ message: "Job deleted" });
    });
});

// Подписка на работу
app.post("/subscribe", authenticateToken, (req, res) => {
    if (req.user.role !== "worker") return res.status(403).json({ error: "Access denied" });
    const { job_id } = req.body;
    db.run("INSERT INTO subscriptions (worker_id, job_id) VALUES (?, ?)", [req.user.id, job_id], err => {
        if (err) return res.status(400).json({ error: "Already subscribed" });
        res.json({ message: "Subscribed successfully" });
        console.log("Subscribed successfully")
    });
});

// Отписка от работы
app.post("/unsubscribe", authenticateToken, (req, res) => {
    if (req.user.role !== "worker") return res.status(403).json({ error: "Access denied" });
    const { job_id } = req.body;
    db.run("DELETE FROM subscriptions WHERE worker_id = ? AND job_id = ?", [req.user.id, job_id], err => {
        if (err) return res.status(400).json({ error: "Error unsubscribing" });
        res.json({ message: "Unsubscribed successfully" });
        console.log("Unsubscribed successfully")
    });
});

// Получение подписанных клиентов (для работодателя)
app.get("/job_subscribers/:job_id", authenticateToken, (req, res) => {
    if (req.user.role !== "employer") return res.status(403).json({ error: "Access denied" });
    db.all("SELECT users.id, users.username FROM users JOIN subscriptions ON users.id = subscriptions.worker_id WHERE subscriptions.job_id = ?", [req.params.job_id], (err, workers) => {
        res.json(workers);
    });
});

// Получение информации о пользователе по ID
// app.get("/user/:user_id", authenticateToken, (req, res) => {
//     db.get("SELECT id, username, role, first_name, last_name, email, job_tag FROM users WHERE id = ?", [req.params.user_id], (err, user) => {
//         if (!user) return res.status(404).json({ error: "User not found" });
//         res.json(user);
//     });
// });

// Запуск сервера
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});


app.get("/export_workers_xml", authenticateToken, (req, res) => {
    // Тільки адміністратор або роботодавець можуть експортувати
    if (req.user.role !== "employer") {
        return res.status(403).json({ error: "Access denied" });
    }

    db.all("SELECT id, username, first_name, last_name, email, job_tag FROM users WHERE role = 'worker'", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        // Створення структури XML
        const builder = new xml2js.Builder();
        const obj = {
            workers: {
                worker: rows.map(user => ({
                    id: user.id,
                    username: user.username,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    job_tag: user.job_tag
                }))
            }
        };

        const xml = builder.buildObject(obj);

        // Запис у файл
        fs.writeFile("workers.xml", xml, err => {
            if (err) {
                return res.status(500).json({ error: "Error writing XML file" });
            }
            res.json({ message: "Workers exported to XML", file: xml });
        });
    });
});

app.get("/user/subscriptions", authenticateToken, (req, res) => {
    console.log(req.user.role)
    if (req.user.role !== "worker") {
      return res.status(403).json({ error: "Access denied" });
    }
  
    const sql = `
      SELECT jobs.id, jobs.name, jobs.description, jobs.salary
      FROM jobs
      JOIN subscriptions ON jobs.id = subscriptions.job_id
      WHERE subscriptions.worker_id = ?
    `;
  
    db.all(sql, [req.user.id], (err, rows) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
  
      res.json(rows); // возвращаем массив работ, на которые подписан пользователь
      
    });
  });
  
  app.use((req, res, next) => {
    const send = res.send;
    
    res.send = function (body) {
      logger.info(`Response to ${req.method} ${req.url}: ${res.statusCode}`);
      send.call(res, body);
    };
  
    next();
  });
  // Глобальне оброблення помилок
app.use((err, req, res, next) => {
    logger.error(`Error occurred on ${req.method} ${req.url}: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  });
  