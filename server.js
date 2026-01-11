const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const client = require("prom-client");

const app = express();
const PORT = process.env.PORT || 5000;

/* ============================
   PROMETHEUS METRICS
============================ */
client.collectDefaultMetrics({ timeout: 5000 });

/* ============================
   CORS (MUST BE FIRST)
============================ */
app.use(cors({
  origin: "https://activity-app11.netlify.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// Handle preflight requests (CRITICAL)
app.options("*", cors());

/* ============================
   MIDDLEWARE
============================ */
app.use(express.json());

/* ============================
   MONGODB CONNECTION
============================ */
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));

/* ============================
   SCHEMAS
============================ */
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: { type: String, required: true, unique: true }
  })
);

const Task = mongoose.model(
  "Task",
  new mongoose.Schema({
    username: String,
    title: String,
    date: String,
    time: String,
    alarm: Boolean,
    done: Boolean,
    score: Number
  })
);

/* ============================
   HEALTH CHECK
============================ */
app.get("/", (req, res) => {
  res.send("Backend running 👍");
});

/* ============================
   AUTH ROUTES
============================ */
app.post("/register", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username)
      return res.status(400).json({ error: "Username required" });

    const exists = await User.findOne({ username });
    if (exists)
      return res.status(400).json({ error: "User already exists" });

    await User.create({ username });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Register failed" });
  }
});

app.post("/signin", async (req, res) => {
  try {
    const { username } = req.body;
    const exists = await User.findOne({ username });

    if (!exists)
      return res.status(404).json({ error: "User not found" });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Signin failed" });
  }
});

/* ============================
   TASK ROUTES
============================ */
app.get("/tasks/:username", async (req, res) => {
  const tasks = await Task.find({ username: req.params.username });
  res.json(tasks);
});

app.post("/tasks/:username", async (req, res) => {
  const task = await Task.create({
    ...req.body,
    username: req.params.username
  });
  res.json(task);
});

app.put("/tasks/:username/:id", async (req, res) => {
  try {
    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/tasks/:username/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});

/* ============================
   METRICS
============================ */
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

/* ============================
   START SERVER
============================ */
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
