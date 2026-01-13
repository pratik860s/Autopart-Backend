const express = require("express");
const cors = require("cors");
require("dotenv").config();

const apiRoutes = require("./src/routes");
const { getSequelize } = require("./src/configs/db");
const bodyParser = require("body-parser");

const app = express();

/* ---------- CORS (MUST BE FIRST) ---------- */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://autopart-frontent-master-6jmw.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/* ---------- MIDDLEWARE ---------- */
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.json());

/* ---------- ROUTES ---------- */
app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/* ---------- DB ---------- */
const sequelize = getSequelize();
sequelize
  .authenticate()
  .then(() => console.log("PostgreSQL connected"))
  .catch((err) => console.error("DB connection failed:", err));

/* ---------- EXPORT (REQUIRED FOR VERCEL) ---------- */
module.exports = app;
