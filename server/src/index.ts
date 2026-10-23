import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose, { Schema, Types } from "mongoose";
import { createClient } from "redis";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const redis = createClient({ url: process.env.REDIS_URL });
redis.on("error", (err) => console.error("Redis error:", err.message));

const artifactSchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  period: { type: String, default: "" },
  origin: { type: String, default: "" },
  condition: { type: String, default: "Good" },
  image_url: { type: String, default: "" },
  description: { type: String, default: "" },
}, { timestamps: { createdAt: "created_at", updatedAt: false }, versionKey: false });

const restorationSchema = new Schema({
  artifact_id: { type: Schema.Types.ObjectId, ref: "Artifact", default: null },
  activity: { type: String, required: true, trim: true },
  date: { type: Date, default: Date.now },
  notes: { type: String, default: "" },
}, { versionKey: false });

const exhibitionSchema = new Schema({
  title: { type: String, required: true, trim: true },
  venue: { type: String, default: "" },
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  description: { type: String, default: "" },
}, { versionKey: false });

const visitorSchema = new Schema({
  visit_date: { type: Date, default: Date.now },
  count: { type: Number, required: true, min: 0 },
  source: { type: String, default: "" },
}, { versionKey: false });

const Artifact = mongoose.model("Artifact", artifactSchema);
const Restoration = mongoose.model("Restoration", restorationSchema);
const Exhibition = mongoose.model("Exhibition", exhibitionSchema);
const Visitor = mongoose.model("Visitor", visitorSchema);

function plain<T extends { _id: Types.ObjectId }>(doc: T) {
  const value = (doc as any).toObject ? (doc as any).toObject() : doc;
  const { _id, ...rest } = value;
  return { id: String(_id), ...rest };
}

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 ? "connected" : "disconnected", redis: redis.isReady ? "connected" : "disconnected" });
});

app.get("/api/dashboard", async (_req, res) => {
  const [artifacts, restorations, exhibitions, visitors] = await Promise.all([
    Artifact.countDocuments(), Restoration.countDocuments(), Exhibition.countDocuments(),
    Visitor.aggregate([{ $group: { _id: null, count: { $sum: "$count" } } }]),
  ]);
  res.json({ artifacts, restorations, exhibitions, visitors: visitors[0]?.count ?? 0 });
});

app.get("/api/artifacts", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const filter = q ? { $or: [{ name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }, { category: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }] } : {};
  const docs = await Artifact.find(filter).sort({ _id: -1 });
  res.json(docs.map(plain));
});
app.post("/api/artifacts", async (req, res) => {
  const { name, category, period = "", origin = "", condition = "Good", image_url = "", description = "" } = req.body;
  if (!name?.trim() || !category?.trim()) return res.status(400).json({ error: "Name and category are required" });
  const doc = await Artifact.create({ name, category, period, origin, condition, image_url, description });
  res.status(201).json(plain(doc));
});
app.delete("/api/artifacts/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid artifact ID" });
  await Artifact.findByIdAndDelete(req.params.id);
  await Restoration.updateMany({ artifact_id: new Types.ObjectId(req.params.id) }, { $set: { artifact_id: null } });
  res.status(204).end();
});
app.get("/api/restorations", async (_req, res) => {
  const docs = await Restoration.find().sort({ date: -1, _id: -1 }).lean();
  const ids = docs.map(d => d.artifact_id).filter(Boolean);
  const artifacts = await Artifact.find({ _id: { $in: ids } }).select("name").lean();
  const names = new Map(artifacts.map(a => [String(a._id), a.name]));
  res.json(docs.map(d => { const { _id, ...rest } = d; return { id: String(_id), ...rest, artifact_name: d.artifact_id ? names.get(String(d.artifact_id)) || "" : "" }; }));
});
app.post("/api/restorations", async (req, res) => {
  const { artifact_id, activity, date, notes = "" } = req.body;
  if (!activity?.trim()) return res.status(400).json({ error: "Activity is required" });
  if (artifact_id && !mongoose.isValidObjectId(artifact_id)) return res.status(400).json({ error: "Invalid artifact ID" });
  const doc = await Restoration.create({ artifact_id: artifact_id || null, activity, date: date || new Date(), notes });
  res.status(201).json(plain(doc));
});
app.get("/api/exhibitions", async (_req, res) => {
  const docs = await Exhibition.find().sort({ start_date: -1, _id: -1 });
  res.json(docs.map(plain));
});
app.post("/api/exhibitions", async (req, res) => {
  const { title, venue = "", start_date = null, end_date = null, description = "" } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title is required" });
  const doc = await Exhibition.create({ title, venue, start_date: start_date || null, end_date: end_date || null, description });
  res.status(201).json(plain(doc));
});
app.get("/api/visitors", async (_req, res) => {
  const docs = await Visitor.find().sort({ visit_date: -1, _id: -1 }).limit(100);
  res.json(docs.map(plain));
});
app.post("/api/visitors", async (req, res) => {
  const { visit_date, count, source = "" } = req.body;
  if (!Number.isInteger(Number(count)) || Number(count) < 0) return res.status(400).json({ error: "Visitor count must be a non-negative whole number" });
  const doc = await Visitor.create({ visit_date: visit_date || new Date(), count: Number(count), source });
  res.status(201).json(plain(doc));
});

const port = Number(process.env.PORT || 4000);
async function start() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/heritagevault");
  console.log("Connected to MongoDB");
  try { await redis.connect(); } catch { console.warn("Redis unavailable; continuing without cache."); }
  app.listen(port, () => console.log(`HeritageVault API running at http://localhost:${port}`));
}
start().catch(err => { console.error("Startup failed:", err); process.exit(1); });
