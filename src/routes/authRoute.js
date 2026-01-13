const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  protectedRoute,
  checkToken,
  verifyEmail,
  forgotPassword,
  getSellerProfile,
  completeSellerSignup,
  resetPassword,
  resetPasswordPage,
  updateProfile,
} = require("../controllers/api/v1/authController");

const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

router.post("/register", register);
router.get("/verify-email/:token", verifyEmail);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.get("/reset-password/:token", resetPasswordPage);
router.post("/reset-password", resetPassword);
router.get("/seller-profile", verifyToken, getSellerProfile);
router.patch("/complete-seller-signup", verifyToken, completeSellerSignup);
router.patch("/update-profile", verifyToken, updateProfile);
router.get("/protected", verifyToken, protectedRoute);
router.get("/check-token", verifyToken, checkToken);
router.get("/admin", verifyToken, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "Admin access granted" });
});
router.get(
  "/seller",
  verifyToken,
  authorizeRoles("seller", "admin"),
  (req, res) => {
    res.json({ message: "Seller access granted" });
  }
);
router.get(
  "/buyer",
  verifyToken,
  authorizeRoles("buyer", "admin"),
  (req, res) => {
    res.json({ message: "Buyer access granted" });
  }
);

module.exports = router;

// const express = require("express");
// const {
//   register,
//   login,
//   protectedRoute,
//   checkToken,
// } = require("../controllers/api/v1/authController");
// const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
// const { CreateCatalogue } = require("../controllers/api/v1/categories");

// const router = express.Router();

// router.post("/register", register);
// router.post("/login", login);
// router.post("/category",CreateCatalogue)

// // Accessible to all logged-in users
// router.get("/protected", verifyToken, protectedRoute);
// router.get("/check-token", verifyToken, checkToken);

// // Role-based access routes
// router.get("/admin", verifyToken, authorizeRoles("admin"), (req, res) => {
//   res.json({ message: "Admin access granted" });
// });

// router.get(
//   "/seller",
//   verifyToken,
//   authorizeRoles("seller", "admin"),
//   (req, res) => {
//     res.json({ message: "Seller access granted" });
//   }
// );

// router.get(
//   "/buyer",
//   verifyToken,
//   authorizeRoles("buyer", "admin"),
//   (req, res) => {
//     res.json({ message: "Buyer access granted" });
//   }
// );

// module.exports = router;
