import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// ================= FIX __dirname =================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= APP SETUP =================
const app = express();
const PORT = process.env.PORT || 5502;

// ================= MIDDLEWARE (ORDER IS CRITICAL) =================
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  }),
);

app.use(express.json()); // for JSON requests
app.use(express.urlencoded({ extended: true })); // optional, for HTML forms

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ================= STATIC FILES =================
app.use(express.static(path.join(__dirname, "public")));

// ================= MONGODB CONNECTION =================
console.log("🔗 Connecting to MongoDB...");
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

// ================= SCHEMAS =================

// CONTACT
const ContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    subject: String,
    message: { type: String, required: true },
  },
  { timestamps: true },
);

const Contact = mongoose.model("Contact", ContactSchema);

// NEWSLETTER
const NewsletterSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

const Newsletter = mongoose.model("Newsletter", NewsletterSchema);

// BLOG
const BlogSchema = new mongoose.Schema(
  {
    title: { en: String, km: String },
    content: { en: String, km: String },
    preview: { en: String, km: String },
    category: { en: String, km: String },
    date: String,
    readTime: Number,
    image: String,
    views: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Blog = mongoose.model("Blog", BlogSchema);

// PRODUCT (FULL)
const galleryItemSchema = new mongoose.Schema({
  src: String,
  label: { en: String, km: String },
});

const plantingInfoSchema = new mongoose.Schema({
  distance: { en: String, km: String },
  plantDistance: { en: String, km: String },
  density: { en: String, km: String },
});

const productVariantSchema = new mongoose.Schema({
  src: String,
  title: { en: String, km: String },
  info: { en: String, km: String },
  weight: String,
  views: { type: Number, default: 0 },
  pdfUrl: String,
  gallery: [galleryItemSchema],
  features: { en: [String], km: [String] },
  planting: plantingInfoSchema,
  landPreparation: { en: [String], km: [String] },
  cultivation: { en: [String], km: [String] },
  irrigation: { en: [String], km: [String] },
});

const ProductSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { en: String, km: String },
    desc: { en: String, km: String },
    imgs: { type: [mongoose.Schema.Types.Mixed] }, // ← no sub-schema, saves everything
    category: String,
    tags: [String],
    isActive: { type: Boolean, default: true },
  },
  { strict: false, timestamps: true },
);

const Product = mongoose.model("Product", ProductSchema);

// ================= API ROUTES =================

// HEALTH
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// PRODUCTS
app.get("/api/products", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 12;
  const skip = (page - 1) * limit;

  const products = await Product.find({ isActive: true })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await Product.countDocuments({ isActive: true });

  res.json({ success: true, products, total });
});

// SINGLE PRODUCT
app.get("/api/products/:productKey", async (req, res) => {
  const product = await Product.findOne({
    productKey: req.params.productKey,
    isActive: true,
  });

  if (!product) {
    return res.status(404).json({ success: false });
  }

  res.json({ success: true, product });
});

// BLOGS
app.get("/api/blogs", async (req, res) => {
  const blogs = await Blog.find({ isPublished: true }).sort({ createdAt: -1 });

  res.json({ success: true, blogs });
});

// SINGLE BLOG
app.get("/api/blogs/:id", async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ success: false });

  blog.views++;
  await blog.save();

  res.json({ success: true, blog });
});

// CONTACT (POST FIXED)
app.post("/contact", async (req, res) => {
  try {
    console.log("📨 Contact body:", req.body);
    const contact = await Contact.create(req.body);
    res.status(201).json({ success: true, id: contact._id });
  } catch (err) {
    console.error("❌ Contact error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// NEWSLETTER (POST FIXED)
app.post("/subscribe", async (req, res) => {
  try {
    await Newsletter.create({ email: req.body.email });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Already subscribed" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= FRONTEND ROUTES =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================= 404 =================
app.use((req, res) => {
  res.status(404).send("404 - Not Found");
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("Access at: http://localhost:5502");
});

