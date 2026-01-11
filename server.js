const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const client = require("prom-client");

const app = express();
const PORT = process.env.PORT || 5000;

// -------- Prometheus Metrics --------
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

app.use(cors());
app.use(express.json());
app.use(express.static('.'));   // serves index.html etc.

// -------- MongoDB Connection --------
const MONGO_URL = "mongodb+srv://taskuser:abcd1234@cluster0.rf1bwtm.mongodb.net/productivity?retryWrites=true&w=majority";

mongoose.connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));

// -------- Schemas --------
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

// -------- Health Route --------
app.get("/", (req, res) => {
  res.send("Backend running 👍");
});

// -------- Auth Routes --------
app.post("/register", async (req, res) => {
  try {
    const username = req.body.username;
    if (!username) return res.status(400).json({ error: "Username required" });

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: "User already exists" });

    await User.create({ username });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Register failed" });
  }
});

app.post("/signin", async (req, res) => {
  try {
    const exists = await User.findOne({ username: req.body.username });
    if (!exists) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Signin failed" });
  }
});

// -------- Task Routes --------
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

// -------- Prometheus Metrics --------
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// -------- Start Server --------
app.listen(PORT, () => console.log("Backend running on port", PORT));
