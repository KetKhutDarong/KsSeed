import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

dotenv.config();

// ================= FIX __dirname =================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= APP SETUP =================
const app = express();
const PORT = process.env.PORT || 5502;

// ================= MIDDLEWARE =================
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// ================= EMAIL TRANSPORTER =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (not your real password)
  },
});

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
    date: { en: String, km: String },
    readTime: Number,
    image: String,
    views: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const Blog = mongoose.model("Blog", BlogSchema);

// PRODUCT
const ProductSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { en: String, km: String },
    desc: { en: String, km: String },
    imgs: { type: [mongoose.Schema.Types.Mixed] },
    category: String,
    tags: [String],
    isActive: { type: Boolean, default: true },
  },
  { strict: false, timestamps: true },
);
const Product = mongoose.model("Product", ProductSchema);

// FAQ SCHEMA
const FAQSchema = new mongoose.Schema(
  {
    order: { type: Number, default: 0 },
    category: String,
    question: { en: String, km: String },
    answer:   { en: String, km: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const FAQ = mongoose.model("FAQ", FAQSchema);

// FARMER STORY SCHEMA
const StorySchema = new mongoose.Schema(
  {
    order:       { type: Number, default: 0 },
    title:       { en: String, km: String },
    description: { en: String, km: String },
    image:       String,
    province:    { en: String, km: String },
    crop:        { en: String, km: String },
    year:        Number,
    hasVideo:    { type: Boolean, default: false },
    videoUrl:    String,
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);
const Story = mongoose.model("Story", StorySchema);

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
  const limit = parseInt(req.query.limit) || 12;
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

  if (!product) return res.status(404).json({ success: false });
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

// ✅ CONTACT — Save to MongoDB + Send Email
app.post("/contact", async (req, res) => {
  try {
    console.log("📨 Contact body:", req.body);
    const { name, email, phone, subject, message } = req.body;

    // Run both operations in parallel
    const [contact] = await Promise.all([
      // 1. Save to MongoDB
      Contact.create({ name, email, phone, subject, message }),

      // 2. Send email notification to your client
      transporter.sendMail({
        from: `"${name}" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_RECEIVER,
        replyTo: `"${name}" <${email}>`, // ← ADD THIS LINE
        subject: subject ? `[Contact] ${subject}` : `New message from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: #2d6a4f; padding: 24px;">
              <h2 style="color: white; margin: 0;">📬 New Contact Form Submission</h2>
            </div>
            <div style="padding: 24px; background: #f9f9f9;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; font-weight: bold; width: 120px; color: #555;">Name</td>
                  <td style="padding: 10px;">${name}</td>
                </tr>
                <tr style="background: #fff;">
                  <td style="padding: 10px; font-weight: bold; color: #555;">Email</td>
                  <td style="padding: 10px;"><a href="mailto:${email}">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; color: #555;">Phone</td>
                  <td style="padding: 10px;">${phone || "—"}</td>
                </tr>
                <tr style="background: #fff;">
                  <td style="padding: 10px; font-weight: bold; color: #555;">Subject</td>
                  <td style="padding: 10px;">${subject || "—"}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; color: #555; vertical-align: top;">Message</td>
                  <td style="padding: 10px; white-space: pre-line;">${message}</td>
                </tr>
              </table>
            </div>
            <div style="padding: 16px; background: #eee; font-size: 12px; color: #888; text-align: center;">
              Sent from KS Seed website contact form &nbsp;·&nbsp; ${new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        `,
      }),
    ]);

    res.status(201).json({ success: true, id: contact._id });
  } catch (err) {
    console.error("❌ Contact error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ NEWSLETTER — Save to MongoDB + Send Email
app.post("/subscribe", async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Save to MongoDB FIRST — throws duplicate error (code 11000) if already subscribed
    await Newsletter.create({ email });

    // 2. Only reaches here if new subscriber — then send email
    await transporter.sendMail({
      from: `"KS Seed Newsletter" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_RECEIVER,
      replyTo: email,
      subject: `📩 New Newsletter Subscriber`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background: #2d6a4f; padding: 24px;">
            <h2 style="color: white; margin: 0;">📩 New Newsletter Subscriber</h2>
          </div>
          <div style="padding: 24px; background: #f9f9f9;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; font-weight: bold; width: 120px; color: #555;">Email</td>
                <td style="padding: 10px;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr style="background: #fff;">
                <td style="padding: 10px; font-weight: bold; color: #555;">Date</td>
                <td style="padding: 10px;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          <div style="padding: 16px; background: #eee; font-size: 12px; color: #888; text-align: center;">
            Sent from KS Seed website newsletter form
          </div>
        </div>
      `,
    });

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

// GET all FAQs
app.get("/api/faqs", async (req, res) => {
  try {
    const faqs = await FAQ.find({ isActive: true }).sort({ order: 1 });
    res.json({ success: true, faqs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET all Farmer Stories
app.get("/api/stories", async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 3;
    const skip  = (page - 1) * limit;

    const stories = await Story.find({ isActive: true })
      .sort({ order: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Story.countDocuments({ isActive: true });
    res.json({ success: true, stories, total });
  } catch (err) {
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