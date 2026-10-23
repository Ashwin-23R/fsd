import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose, { Schema, model } from "mongoose";
import { createClient } from "redis";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

mongoose.set("toJSON", { virtuals: true });
mongoose.set("toObject", { virtuals: true });

const artifactSchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  period: { type: String, default: "" }, origin: { type: String, default: "" },
  condition: { type: String, default: "Good" }, image_url: { type: String, default: "" },
  description: { type: String, default: "" }
}, { timestamps: { createdAt: "created_at", updatedAt: false }, toJSON: { virtuals: true }, toObject: { virtuals: true } });
artifactSchema.virtual("id").get(function () { return this._id.toString(); });

const restorationSchema = new Schema({
  artifact_id: { type: Schema.Types.ObjectId, ref: "Artifact", default: null },
  activity: { type: String, required: true, trim: true }, date: { type: Date, default: Date.now }, notes: { type: String, default: "" }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
restorationSchema.virtual("id").get(function () { return this._id.toString(); });

const exhibitionSchema = new Schema({
  title: { type: String, required: true, trim: true }, venue: { type: String, default: "" },
  start_date: { type: Date, default: null }, end_date: { type: Date, default: null }, description: { type: String, default: "" }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
exhibitionSchema.virtual("id").get(function () { return this._id.toString(); });

const visitorSchema = new Schema({
  visit_date: { type: Date, default: Date.now }, count: { type: Number, required: true, min: 0, validate: Number.isInteger }, source: { type: String, default: "" }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
visitorSchema.virtual("id").get(function () { return this._id.toString(); });

const Artifact = model("Artifact", artifactSchema);
const Restoration = model("Restoration", restorationSchema);
const Exhibition = model("Exhibition", exhibitionSchema);
const Visitor = model("Visitor", visitorSchema);

const redis = createClient({ url: process.env.REDIS_URL });
redis.on("error", (err) => console.error("Redis error:", err.message));

function serialize<T extends { toObject: () => any }>(doc: T) {
  const value = doc.toObject({ virtuals: true });
  value.id = value._id.toString();
  delete value._id;
  delete value.__v;
  return value;
}
function safeDate(value: unknown) { return value ? new Date(String(value)) : null; }

app.get("/api/health", async (_req, res) => res.json({
  ok: true,
  database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  redis: redis.isReady ? "connected" : "disconnected"
}));

app.get("/api/dashboard", async (_req, res, next) => {
  try {
    const [artifacts, restorations, exhibitions, visitorRows] = await Promise.all([
      Artifact.countDocuments(), Restoration.countDocuments(), Exhibition.countDocuments(), Visitor.find({}, { count: 1, _id: 0 }).lean()
    ]);
    res.json({ artifacts, restorations, exhibitions, visitors: visitorRows.reduce((sum, row) => sum + (row.count || 0), 0) });
  } catch (e) { next(e); }
});

app.get("/api/artifacts", async (req, res, next) => {
  try {
    const q = String(req.query.q || "");
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const rows = await Artifact.find(q ? { $or: [{ name: regex }, { category: regex }] } : {}).sort({ _id: -1 });
    res.json(rows.map(serialize));
  } catch (e) { next(e); }
});
app.post("/api/artifacts", async (req, res, next) => {
  try {
    const { name, category, period = "", origin = "", condition = "Good", image_url = "", description = "" } = req.body;
    if (!name?.trim() || !category?.trim()) return res.status(400).json({ error: "Name and category are required" });
    const row = await Artifact.create({ name, category, period, origin, condition, image_url, description });
    res.status(201).json(serialize(row));
  } catch (e) { next(e); }
});
app.delete("/api/artifacts/:id", async (req, res, next) => {
  try {
    await Restoration.updateMany({ artifact_id: req.params.id }, { $set: { artifact_id: null } });
    await Artifact.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
});

app.get("/api/restorations", async (_req, res, next) => {
  try {
    const rows = await Restoration.find().sort({ date: -1, _id: -1 }).populate("artifact_id", "name");
    res.json(rows.map((row: any) => {
      const value = serialize(row);
      value.artifact_name = row.artifact_id && typeof row.artifact_id === "object" ? row.artifact_id.name : "";
      value.artifact_id = row.artifact_id && typeof row.artifact_id === "object" ? row.artifact_id._id.toString() : null;
      return value;
    }));
  } catch (e) { next(e); }
});
app.post("/api/restorations", async (req, res, next) => {
  try {
    const { artifact_id, activity, date, notes = "" } = req.body;
    if (!activity?.trim()) return res.status(400).json({ error: "Activity is required" });
    const row = await Restoration.create({ artifact_id: artifact_id || null, activity, date: safeDate(date) || new Date(), notes });
    res.status(201).json(serialize(row));
  } catch (e) { next(e); }
});

app.get("/api/exhibitions", async (_req, res, next) => {
  try { res.json((await Exhibition.find().sort({ start_date: -1, _id: -1 })).map(serialize)); }
  catch (e) { next(e); }
});
app.post("/api/exhibitions", async (req, res, next) => {
  try {
    const { title, venue = "", start_date = null, end_date = null, description = "" } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Title is required" });
    const row = await Exhibition.create({ title, venue, start_date: safeDate(start_date), end_date: safeDate(end_date), description });
    res.status(201).json(serialize(row));
  } catch (e) { next(e); }
});

app.get("/api/visitors", async (_req, res, next) => {
  try { res.json((await Visitor.find().sort({ visit_date: -1, _id: -1 }).limit(100)).map(serialize)); }
  catch (e) { next(e); }
});
app.post("/api/visitors", async (req, res, next) => {
  try {
    const { visit_date, count, source = "" } = req.body;
    if (!Number.isInteger(Number(count)) || Number(count) < 0) return res.status(400).json({ error: "Visitor count must be a non-negative whole number" });
    const row = await Visitor.create({ visit_date: safeDate(visit_date) || new Date(), count: Number(count), source });
    res.status(201).json(serialize(row));
  } catch (e) { next(e); }
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(400).json({ error: err?.message || "Request failed" });
});

const port = Number(process.env.PORT || 4000);
async function init() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/heritagevault";
  await mongoose.connect(uri);
  try { await redis.connect(); } catch { console.warn("Redis unavailable; continuing without cache."); }
  app.listen(port, () => console.log(`HeritageVault API running at http://localhost:${port}`));
}
init().catch(err => { console.error("Startup failed:", err); process.exit(1); });
