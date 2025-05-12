const { parentPort, workerData } = require("worker_threads");
const sqlite3 = require("sqlite3").verbose();

// Sleep function to introduce a delay
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Initialize SQLite database connection
const db = new sqlite3.Database("jobs.db", (err) => {
  if (err) {
    console.error(
      `Worker ${workerData.workerId} failed to connect to database: ${err.message}`,
    );
    process.exit(1);
  }
  console.log(`Worker ${workerData.workerId} connected to database`);
});

// Handle incoming messages
parentPort.on("message", async (msg) => {
  const { id, query, params, workerIndex } = msg;
  console.log(`Worker worker-${workerIndex} received task with ID ${id}`);

  // Introduce a 1-second delay to simulate workload

  console.log(
    `Worker worker-${workerIndex} processing task with ID ${id} after delay`,
  );

  // Determine the type of query
  if (query.trim().toUpperCase().startsWith("SELECT")) {
    await sleep(100);
    db.all(query, params, (err, rows) => {
      if (err) {
        console.log(
          `Worker worker-${workerIndex} failed to process task ${id}: ${err.message}`,
        );
        parentPort.postMessage({ id, error: err.message });
      } else {
        console.log(
          `Worker worker-${workerIndex} completed task ${id} successfully`,
        );
        parentPort.postMessage({ id, result: rows });
        parentPort.postMessage({ type: "completed", workerIndex, taskId: id });
      }
    });
  } else {
    db.run(query, params, function (err) {
      if (err) {
        console.log(
          `Worker worker-${workerIndex} failed to process task ${id}: ${err.message}`,
        );
        parentPort.postMessage({ id, error: err.message });
      } else {
        console.log(
          `Worker worker-${workerIndex} completed task ${id} successfully`,
        );
        parentPort.postMessage({
          id,
          result: { lastID: this.lastID, changes: this.changes },
        });
        parentPort.postMessage({ type: "completed", workerIndex, taskId: id });
      }
    });
  }
});

// Handle worker errors
parentPort.on("error", (err) => {
  console.error(`Worker ${workerData.workerId} error: ${err.message}`);
});

// Close database on worker termination
process.on("exit", () => {
  db.close((err) => {
    if (err) {
      console.error(
        `Worker ${workerData.workerId} error closing database: ${err.message}`,
      );
    }
    console.log(`Worker ${workerData.workerId} closed database connection`);
  });
});
