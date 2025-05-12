const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3");
const fs = require("fs");
const xml2js = require("xml2js");
const morgan = require("morgan");
const logger = require("./logger");

jest.mock("sqlite3", () => {
  const mockDb = {
    serialize: jest.fn((cb) => cb()),
    run: jest.fn(
      (query, params, cb) => cb && cb.call({ lastID: 1, changes: 1 }),
    ),
    get: jest.fn((query, params, cb) => cb(null, null)),
    all: jest.fn((query, params, cb) => cb(null, [])),
  };
  return {
    Database: jest.fn(() => mockDb),
    verbose: jest.fn(() => ({ Database: jest.fn(() => mockDb) })),
  };
});

jest.mock("bcrypt", () => ({
  hash: jest.fn((password, saltRounds, cb) => cb(null, "hashedPassword")),
  compare: jest.fn((password, hash, cb) => cb(null, true)),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "mockedToken"),
  verify: jest.fn((token, secret, cb) => cb(null, { id: 1, role: "worker" })),
}));

jest.mock("fs", () => ({
  writeFile: jest.fn((path, data, cb) => cb(null)),
}));

jest.mock("xml2js", () => ({
  Builder: jest.fn(() => ({
    buildObject: jest.fn(() => "<workers><worker></worker></workers>"),
  })),
}));

jest.mock("./logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock("morgan", () => jest.fn(() => (req, res, next) => next()));

const app = require("./server"); // Assuming the server code is in server.js

describe("Node.js Server API", () => {
  let mockDb;

  beforeEach(() => {
    mockDb = new sqlite3.Database();
    jest.clearAllMocks();
  });

  describe("POST /register", () => {
    it("should register a new user successfully", async () => {
      mockDb.run.mockImplementation((query, params, cb) => cb(null));

      const response = await request(app)
        .post("/register")
        .send({ username: "testuser", password: "password", role: "worker" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "User registered" });
      expect(bcrypt.hash).toHaveBeenCalledWith(
        "password",
        10,
        expect.any(Function),
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        ["testuser", "hashedPassword", "worker"],
        expect.any(Function),
      );
    });

    it("should return 400 if user already exists", async () => {
      mockDb.run.mockImplementation((query, params, cb) =>
        cb(new Error("SQLITE_CONSTRAINT")),
      );

      const response = await request(app)
        .post("/register")
        .send({ username: "testuser", password: "password", role: "worker" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "User already exists" });
    });
  });

  describe("POST /login", () => {
    it("should login user successfully", async () => {
      mockDb.get.mockImplementationOnce((query, params, cb) =>
        cb(null, {
          id: 1,
          username: "testuser",
          password: "hashedPassword",
          role: "worker",
        }),
      );
      mockDb.run.mockImplementationOnce((query, params, cb) => cb(null));

      const response = await request(app)
        .post("/login")
        .send({ username: "testuser", password: "password" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ token: "mockedToken", role: "worker" });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password",
        "hashedPassword",
        expect.any(Function),
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1, role: "worker" },
        "supersecretkey",
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        "INSERT INTO tokens (user_id, token) VALUES (?, ?)",
        [1, "mockedToken"],
        expect.any(Function),
      );
    });

    it("should return 400 if user not found", async () => {
      mockDb.get.mockImplementation((query, params, cb) => cb(null, null));

      const response = await request(app)
        .post("/login")
        .send({ username: "testuser", password: "password" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "User not found" });
    });

    it("should return 400 if password is incorrect", async () => {
      mockDb.get.mockImplementation((query, params, cb) =>
        cb(null, {
          id: 1,
          username: "testuser",
          password: "hashedPassword",
          role: "worker",
        }),
      );
      bcrypt.compare.mockImplementation((password, hash, cb) =>
        cb(null, false),
      );

      const response = await request(app)
        .post("/login")
        .send({ username: "testuser", password: "wrongpassword" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Incorrect password" });
    });
  });

  describe("GET /jobs", () => {
    it("should return list of jobs", async () => {
      mockDb.all.mockImplementation((query, params, cb) =>
        cb(null, [
          {
            id: 1,
            name: "Developer",
            salary: 50000,
            description: "Job desc",
            tag: "tech",
          },
        ]),
      );

      const response = await request(app).get("/jobs");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: 1,
          name: "Developer",
          salary: 50000,
          description: "Job desc",
          tag: "tech",
        },
      ]);
      expect(mockDb.all).toHaveBeenCalledWith(
        "SELECT * FROM jobs",
        [],
        expect.any(Function),
      );
    });
  });

  describe("POST /jobs", () => {
    it("should create a job for employer", async () => {
      jwt.verify.mockImplementation((token, secret, cb) =>
        cb(null, { id: 1, role: "employer" }),
      );
      mockDb.run.mockImplementation((query, params, cb) =>
        cb.call({ lastID: 1 }, null),
      );

      const response = await request(app)
        .post("/jobs")
        .set("Authorization", "mockedToken")
        .send({
          name: "Developer",
          salary: 50000,
          description: "Job desc",
          tag: "tech",
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Job created", job_id: 1 });
      expect(mockDb.run).toHaveBeenCalledWith(
        "INSERT INTO jobs (employer_id, name, salary, description, tag) VALUES (?, ?, ?, ?, ?)",
        [1, "Developer", 50000, "Job desc", "tech"],
        expect.any(Function),
      );
    });

    it("should return 403 if user is not employer", async () => {
      jwt.verify.mockImplementation((token, secret, cb) =>
        cb(null, { id: 1, role: "worker" }),
      );

      const response = await request(app)
        .post("/jobs")
        .set("Authorization", "mockedToken")
        .send({
          name: "Developer",
          salary: 50000,
          description: "Job desc",
          tag: "tech",
        });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Access denied" });
    });

    it("should return 401 if no token provided", async () => {
      const response = await request(app).post("/jobs").send({
        name: "Developer",
        salary: 50000,
        description: "Job desc",
        tag: "tech",
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Access denied" });
    });
  });

  describe("POST /subscribe", () => {
    it("should subscribe worker to a job", async () => {
      jwt.verify.mockImplementation((token, secret, cb) =>
        cb(null, { id: 1, role: "worker" }),
      );
      mockDb.run.mockImplementation((query, params, cb) => cb(null));

      const response = await request(app)
        .post("/subscribe")
        .set("Authorization", "mockedToken")
        .send({ job_id: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Subscribed successfully" });
      expect(mockDb.run).toHaveBeenCalledWith(
        "INSERT INTO subscriptions (worker_id, job_id) VALUES (?, ?)",
        [1, 1],
        expect.any(Function),
      );
    });

    it("should return 403 if user is not worker", async () => {
      jwt.verify.mockImplementation((token, secret, cb) =>
        cb(null, { id: 1, role: "employer" }),
      );

      const response = await request(app)
        .post("/subscribe")
        .set("Authorization", "mockedToken")
        .send({ job_id: 1 });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Access denied" });
    });

    it("should return 400 if already subscribed", async () => {
      jwt.verify.mockImplementation((token, secret, cb) =>
        cb(null, { id: 1, role: "worker" }),
      );
      mockDb.run.mockImplementation((query, params, cb) =>
        cb(new Error("SQLITE_CONSTRAINT")),
      );

      const response = await request(app)
        .post("/subscribe")
        .set("Authorization", "mockedToken")
        .send({ job_id: 1 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Already subscribed" });
    });
  });

  describe("POST /unsubscribe", () => {
    it("should unsubscribe worker from a job", async () => {
      jwt.verify.mockImplementation((token, secret, cb) =>
        cb(null, { id: 1, role: "worker" }),
      );
      mockDb.run.mockImplementation((query, params, cb) => cb(null));

      const response = await request(app)
        .post("/unsubscribe")
        .set("Authorization", "mockedToken")
        .send({ job_id: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Unsubscribed successfully" });
      expect(mockDb.run).toHaveBeenCalledWith(
        "DELETE FROM subscriptions WHERE worker_id = ? AND job_id = ?",
        [1, 1],
        expect.any(Function),
      );
    });

    it("should return 403 if user is not worker", async () => {
      jwt.verify.mockImplementation((token, secret, cb) =>
        cb(null, { id: 1, role: "employer" }),
      );

      const response = await request(app)
        .post("/unsubscribe")
        .set("Authorization", "mockedToken")
        .send({ job_id: 1 });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Access denied" });
    });
  });

  describe("GET /export_workers_xml", () => {
    it("should export workers to XML for employer", async () => {
      jwt.verify.mockImplementation((token, secret, cb) =>
        cb(null, { id: 1, role: "employer" }),
      );
      mockDb.all.mockImplementation((query, params, cb) =>
        cb(null, [
          {
            id: 1,
            username: "worker1",
            first_name: "John",
            last_name: "Doe",
            email: "john@example.com",
            job_tag: "tech",
          },
        ]),
      );

      const response = await request(app)
        .get("/export_workers_xml")
        .set("Authorization", "mockedToken");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Workers exported to XML",
        file: "<workers><worker></worker></workers>",
      });
      expect(fs.writeFile).toHaveBeenCalledWith(
        "workers.xml",
        "<workers><worker></worker></workers>",
        expect.any(Function),
      );
    });

    it("should return 403 if user is not employer", async () => {
      jwt.verify.mockImplementation((token, secret, cb) =>
        cb(null, { id: 1, role: "worker" }),
      );

      const response = await request(app)
        .get("/export_workers_xml")
        .set("Authorization", "mockedToken");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Access denied" });
    });
  });

  describe("GET /user/subscriptions", () => {
    it("should return subscriptions for worker", async () => {
      jwt.verify.mockImplementation((token, secret, cb) =>
        cb(null, { id: 1, role: "worker" }),
      );
      mockDb.all.mockImplementation((query, params, cb) =>
        cb(null, [
          { id: 1, name: "Developer", description: "Job desc", salary: 50000 },
        ]),
      );

      const response = await request(app)
        .get("/user/subscriptions")
        .set("Authorization", "mockedToken");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { id: 1, name: "Developer", description: "Job desc", salary: 50000 },
      ]);
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT jobs.id, jobs.name, jobs.description, jobs.salary",
        ),
        [1],
        expect.any(Function),
      );
    });

    it("should return 403 if user is not worker", async () => {
      jwt.verify.mockImplementation((token, secret, cb) =>
        cb(null, { id: 1, role: "employer" }),
      );

      const response = await request(app)
        .get("/user/subscriptions")
        .set("Authorization", "mockedToken");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Access denied" });
    });
  });

  describe("Performance Test - GET /jobs", () => {
    it("should respond within acceptable time", async () => {
      const start = Date.now();

      const response = await request(app).get("/jobs");

      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      console.log(`GET /jobs took ${duration}ms`);
      expect(duration).toBeLessThan(500); // Adjust threshold as needed
    });
  });
});
