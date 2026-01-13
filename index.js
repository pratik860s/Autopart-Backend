const express = require("express");
const cors = require("cors");
const { Sequelize } = require("sequelize");
require("dotenv").config();
const apiRoutes = require("./src/routes/index");
const { getSequelize } = require("./src/configs/db");
const bodyParser = require("body-parser");
const http = require("http");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const { initSocket } = require("./src/socket/chatSocket");
initSocket(server);
const sequelize = getSequelize();


// Middleware
app.use(
  cors({
    origin: [process.env.FRONTEND_URL, process.env.ADMIN_FRONTEND_URL],
    // origin: "*",
    credentials: true,
  })
);
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.json());

//app.use("/uploads", express.static("uploads"));
app.use("/api", apiRoutes);

const sitemapRoute = require("./src/routes/sitemapRoute");
app.use("/", sitemapRoute);

sequelize
  .authenticate()
  .then(() => console.log("PostgreSQL connected..."))
  .catch((err) => console.error("Unable to connect to DB:", err));

// app.get("/", (req, res) => {
//   res.send("Backend is running...");
// });
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// Start the server
//app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
