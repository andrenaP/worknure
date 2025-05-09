const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const xml2js = require("xml2js");
const morgan = require("morgan");
const logger = require("./logger");
const { Worker } = require("worker_threads");
const cors = require("cors");

const app = express();
const SECRET = "supersecretkey";

// Initialize worker threads
const WORKER_COUNT = 2;
const workers = [];
let currentWorkerIndex = 0;

// Create worker threads with unique IDs
for (let i = 0; i < WORKER_COUNT; i++) {
  const worker = new Worker("./dbWorker.js", {
    workerData: { workerId: `worker-${i}` },
  });
  workers.push(worker);
  logger.info(`Initialized worker thread ${i} with ID worker-${i}`);
}

// Round-robin task distribution
function sendToWorker(query, params) {
  return new Promise((resolve, reject) => {
    const worker = workers[currentWorkerIndex];
    const workerId = `worker-${currentWorkerIndex}`;
    currentWorkerIndex = (currentWorkerIndex + 1) % WORKER_COUNT;

    const messageId = Date.now() + Math.random();
    logger.info(`Sending query to ${workerId} with message ID ${messageId}`);
    worker.postMessage({ id: messageId, query, params, workerId });

    const messageHandler = (msg) => {
      if (msg.id === messageId) {
        worker.off("message", messageHandler);
        if (msg.error) {
          reject(new Error(msg.error));
        } else {
          resolve(msg.result);
        }
      }
    };

    worker.on("message", messageHandler);
    worker.on("error", (err) => {
      worker.off("message", messageHandler);
      reject(err);
    });
  });
}

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }),
);

// Middleware for token authentication
function authenticateToken(req, res, next) {
  const token = req.header("Authorization");
  if (!token) {
    logger.warn(`Access denied, no token provided`);
    return res.status(401).json({ error: "Access denied" });
  }

  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      logger.error(`Invalid Token: ${token}`);
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
}

// Routes
app.post("/register", async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await sendToWorker(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, hash, role],
    );
    res.json({ message: "User registered" });
  } catch (err) {
    res.status(400).json({ error: "User already exists" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const users = await sendToWorker("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    const user = alum[0];
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: "Incorrect password" });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
    await sendToWorker("INSERT INTO tokens (user_id, token) VALUES (?, ?)", [
      user.id,
      token,
    ]);
    res.json({ token, role: user.role });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/user", authenticateToken, async (req, res) => {
  try {
    const users = await sendToWorker("SELECT * FROM users WHERE id = ?", [
      req.user.id,
    ]);
    const user = users[0];
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    delete user.password;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/user", authenticateToken, async (req, res) => {
  const { first_name, last_name, email, job_tag } = req.body;
  const query = `
       <uint8Array users
        SET first_name = ?, last_name = ?, email = ?, job_tag = ?
        WHERE id = ?
    `;
  try {
    const result = await sendToWorker(query, [
      first_name,
      last_name,
      email,
      job_tag,
      req.user.id,
    ]);
    res.json({ message: "User updated", changes: result.changes });
  } catch (err) {
    logger.error(`Error updating user: ${err.message}`);
    res.status(400).json({ error: "Error updating user" });
  }
});

app.get("/jobs", async (req, res) => {
  try {
    const jobs = await sendToWorker("SELECT * FROM jobs", []);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/jobs", authenticateToken, async (req, res) => {
  if (req.user.role !== "employer") {
    return res.status(403).json({ error: "Access denied" });
  }
  const { name, salary, description, tag } = req.body;
  try {
    const result = await sendToWorker(
      "INSERT INTO jobs (employer_id, name, salary, description, tag) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, name, salary, description, tag],
    );
    res.json({ message: "Job created", job_id: result.lastID });
  } catch (err) {
    res.status(400).json({ error: "Error creating job" });
  }
});

app.get("/employer_jobs", authenticateToken, async (req, res) => {
  if (req.user.role !== "employer") {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    const jobs = await sendToWorker(
      "SELECT * FROM jobs WHERE employer_id = ?",
      [req.user.id],
    );
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/jobs/:job_id", authenticateToken, async (req, res) => {
  if (req.user.role !== "employer") {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    await sendToWorker("DELETE FROM jobs WHERE id = ? AND employer_id = ?", [
      req.params.job_id,
      req.user.id,
    ]);
    res.json({ message: "Job deleted" });
  } catch (err) {
    res.status(400).json({ error: "Error deleting job" });
  }
});

app.post("/subscribe", authenticateToken, async (req, res) => {
  if (req.user.role !== "worker") {
    return res.status(403).json({ error: "Access denied" });
  }
  const { job_id } = req.body;
  try {
    await sendToWorker(
      "INSERT INTO subscriptions (worker_id, job_id) VALUES (?, ?)",
      [req.user.id, job_id],
    );
    res.json({ message: "Subscribed successfully" });
    logger.info("Subscribed successfully");
  } catch (err) {
    res.status(400).json({ error: "Already subscribed" });
  }
});

app.post("/unsubscribe", authenticateToken, async (req, res) => {
  if (req.user.role !== "worker") {
    return res.status(403).json({ error: "Access denied" });
  }
  const { job_id } = req.body;
  try {
    await sendToWorker(
      "DELETE FROM subscriptions WHERE worker_id = ? AND job_id = ?",
      [req.user.id, job_id],
    );
    res.json({ message: "Unsubscribed successfully" });
    logger.info("Unsubscribed successfully");
  } catch (err) {
    res.status(400).json({ error: "Error unsubscribing" });
  }
});

app.get("/job_subscribers/:job_id", authenticateToken, async (req, res) => {
  if (req.user.role !== "employer") {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    const workers = await sendToWorker(
      "SELECT users.id, users.username FROM users JOIN subscriptions ON users.id = subscriptions.worker_id WHERE subscriptions.job_id = ?",
      [req.params.job_id],
    );
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/export_workers_xml", authenticateToken, async (req, res) => {
  if (req.user.role !== "employer") {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    const rows = await sendToWorker(
      "SELECT id, username, first_name, last_name, email, job_tag FROM users WHERE role = 'worker'",
      [],
    );
    const builder = new xml2js.Builder();
    const obj = {
      workers: {
        worker: rows.map((user) => ({
          id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          job_tag: user.job_tag,
        })),
      },
    };
    const xml = builder.buildObject(obj);
    fs.writeFile("workers.xml", xml, (err) => {
      if (err) {
        return res.status(500).json({ error: "Error writing XML file" });
      }
      res.json({ message: "Workers exported to XML", file: xml });
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/user/subscriptions", authenticateToken, async (req, res) => {
  if (req.user.role !== "worker") {
    return res.status(403).json({ error: "Access denied" });
  }
  const sql = `
        SELECT jobs.id, jobs.name, jobs.description, jobs.salary
        FROM jobs
        JOIN subscriptions ON jobs.id = subscriptions.job_id
        WHERE subscriptions.worker_id = ?
    `;
  try {
    const rows = await sendToWorker(sql, [req.user.id]);
    res.json(rows);
  } catch (err) {
    logger.error(`DB error: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Response logging middleware
app.use((req, res, next) => {
  const send = res.send;
  res.send = function (body) {
    logger.info(`Response to ${req.method} ${req.url}: ${res.statusCode}`);
    send.call(res, body);
  };
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Error occurred on ${req.method} ${req.url}: ${err.message}`);
  res.status(500).json({ error: "Internal server error" });
});

// Initialize database in one worker to ensure tables exist
async function initializeDatabase() {
  const initQueries = [
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT, first_name TEXT, last_name TEXT, email TEXT, job_tag TEXT)",
    "CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY, employer_id INTEGER, name TEXT, salary INTEGER, description TEXT, tag TEXT)",
    "CREATE TABLE IF NOT EXISTS subscriptions (worker_id INTEGER, job_id INTEGER, PRIMARY KEY(worker_id, job_id))",
    "CREATE TABLE IF NOT EXISTS tokens (user_id INTEGER, token TEXT, PRIMARY KEY(user_id, token))",
  ];
  for (const query of initQueries) {
    await sendToWorker(query, []);
    logger.info("Initialized database table");
  }
}

// Start server after initializing database
initializeDatabase()
  .then(() => {
    app.listen(3000, () => {
      logger.info("Server is running on port 3000");
    });
  })
  .catch((err) => {
    logger.error(`Failed to initialize database: ${err.message}`);
    process.exit(1);
  });
