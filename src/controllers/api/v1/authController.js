const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Users = require("../../../models/user");
const { sendVerificationEmail, transporter } = require("../../../utils/mailer");
const { Op } = require("sequelize");
//const path = require("path");

exports.register = async (req, res) => {
  try {
    const {
      name,
      password,
      type,
      email,
      phone_number,
      logo,
      company_phone_number,
      address,
      address2,
      city,
      country,
      state,
      zip_code,
      vat_number,
      companyName,
    } = req.body;

    if (!["buyer", "seller", "admin"].includes(type)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existingUser = await Users.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }
    const existingPhone = await Users.findOne({ where: { phone_number } });
    if (existingPhone) {
      return res
        .status(400)
        .json({ message: "Phone number already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      password: hashedPassword,
      type,
      email,
      phone_number,
      email_verified: false,
    };

    if (type === "seller") {
      Object.assign(newUser, {
        logo,
        company_phone_number,
        address,
        city,
        zip_code,
        vat_number,
        company_name: companyName, // new
        address2, // new
        country,
        state,
      });
    }

    const createdUser = await Users.create(newUser);
    const token = jwt.sign(
      { id: createdUser.id, email, type: type },
      process.env.JWT_SECRET,
      {
        expiresIn: "30m",
      }
    );
    await sendVerificationEmail(email, token);
    //  const userDetails = newUser.toJSON();
    //   delete userDetails.password;
    res.json({
      //token,
      userId: createdUser.id,
      role: createdUser.type,
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        type: createdUser.type,
        phone_number: createdUser.phone_number,
      },

      message: "User registered successfully! Please verify your email.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Users.findOne({ where: { email: decoded.email } });

    if (!user) {
      return res.status(400).send("Invalid token or user not found");
    }

    if (!user.email_verified) {
      user.email_verified = true;
      await user.save();
    }

    // Get redirect URLs from environment variables
    let redirectUrl = process.env.FRONTEND_URL;
    if (user.type === "seller") {
      redirectUrl = `${process.env.FRONTEND_URL}/seller-signup?tabValue=1`;
    } else if (user.type === "buyer") {
      redirectUrl = process.env.FRONTEND_URL;
    } else if (user.type === "admin") {
      redirectUrl = `${process.env.ADMIN_FRONTEND_URL}/auth/login`;
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Verified</title>
          <meta http-equiv="refresh" content="2;url=${redirectUrl}" />
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
          </style>
        </head>
        <body>
          <h2>Thanks for verifying your account!</h2>
          <p>You will be redirected to the login page shortly...</p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

exports.login = async (req, res) => {
  try {
    const { emailOrPhone, password, role } = req.body;

    const user = await Users.findOne({
      where: {
        [Op.or]: [{ email: emailOrPhone }, { phone_number: emailOrPhone }],
      },
    });

    if (!user) {
      // If role is provided, show specific error
      if (role === "seller") {
        return res.status(404).json({ message: "Seller not found" });
      } else if (role === "buyer") {
        return res.status(404).json({ message: "Buyer not found" });
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    }

    if (role && user.type !== role) {
      return res.status(403).json({ message: `User is not a ${role}` });
    }
    if (!user.password) {
      return res.status(400).json({ message: "User password not set" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!user.email_verified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in." });
    }

    if (user.type === "buyer" && user.type === "admin") {
      user.status = "active";
      await user.save();
    }

    const token = jwt.sign(
      { id: user.id, type: user.type },
      process.env.JWT_SECRET,
      { expiresIn: "30h" }
    );
    const userDetails = user.toJSON();
    delete userDetails.password;

    // Use the value from the DB
    res.json({
      token,
      role: user.type,
      userId: user.id,
      isCompanydetailsFilled: user.isCompanydetailsFilled,
      user: userDetails,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSellerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await Users.findByPk(userId, {
      attributes: {
        exclude: ["password"],
      },
    });

    if (!user || user.type !== "seller") {
      return res.status(404).json({ message: "Seller not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.completeSellerSignup = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No user ID found" });
    }
    const {
      logo,
      company_phone_number,
      address,
      address2,
      city,
      country,
      state,
      zip_code,
      vat_number,
      company_name,
    } = req.body;

    const user = await Users.findByPk(userId);

    if (!user || user.type !== "seller") {
      return res.status(404).json({ message: "Seller not found" });
    }

    if (company_phone_number !== undefined && company_phone_number !== null)
      user.company_phone_number = company_phone_number;
    if (address !== undefined && address !== null) user.address = address;
    if (address2 !== undefined && address2 !== null) user.address2 = address2;
    if (city !== undefined && city !== null) user.city = city;
    if (country !== undefined && country !== null) user.country = country;
    if (state !== undefined && state !== null) user.state = state;
    if (zip_code !== undefined && zip_code !== null) user.zip_code = zip_code;
    if (vat_number !== undefined && vat_number !== null)
      user.vat_number = vat_number;
    if (company_name !== undefined && company_name !== null)
      user.company_name = company_name;

    // Update seller details
    user.logo = logo;
    user.isCompanydetailsFilled = true;

    await user.save();

    res.json({
      message: "Seller details updated successfully",
      isCompanydetailsFilled: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET: Redirect to frontend with token
exports.resetPasswordPage = async (req, res) => {
  try {
    const { token } = req.params;
    // Optionally: verify token here and show error if invalid/expired
    const redirectUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    return res.status(400).send("Invalid or expired reset link.");
  }
};

// POST: Actually reset the password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and password are required" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Users.findOne({
      where: { id: decoded.id, email: decoded.email },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await Users.findOne({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User with this email does not exist" });
    }

    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    const resetLink = `${process.env.BACKEND_BASE_URL}/api/auth/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Reset your SparesGetways password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 32px 24px; background: #fafbfc;">
          <h2 style="color: #2d3748;">Reset Your Password</h2>
          <p style="font-size: 16px; color: #333;">
            We received a request to reset your SparesGetways account password.<br>
            Click the button below to set a new password.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background: #007bff; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 5px; font-size: 18px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #666;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color: #007bff;">${resetLink}</a>
          </p>
          <hr style="margin: 32px 0;">
          <p style="font-size: 12px; color: #999;">
            If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    res.json({ message: "Password reset email sent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.logout = async (req, res) => {
  res.json({ message: "User logged out successfully" });
};

exports.protectedRoute = async (req, res) => {
  res.json({ message: `Welcome ${req.user.type}`, user: req.user });
};

exports.protectRoute = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, type }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

exports.checkToken = async (req, res) => {
  res.status(200).json({ message: "Hello World" });
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await Users.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.type === "buyer") {
      const { name, phone_number } = req.body;
      if (!name && !phone_number) {
        return res.status(400).json({ message: "Nothing to update" });
      }
      if (name) user.name = name;
      if (phone_number) user.phone_number = phone_number;
    } else if (user.type === "seller") {
      const {
        name,
        phone_number,
        email,
        logo,
        company_phone_number,
        address,
        address2,
        city,
        country,
        state,
        zip_code,
        vat_number,
        company_name,
        registration_number,
        establishment_year,
        legal_status,
        company_description,
      } = req.body;

      if (name) user.name = name;
      if (phone_number) user.phone_number = phone_number;
      if (email) user.email = email;
      if (logo !== undefined) user.logo = logo;
      if (company_phone_number !== undefined)
        user.company_phone_number = company_phone_number;
      if (address !== undefined) user.address = address;
      if (address2 !== undefined) user.address2 = address2;
      if (city !== undefined) user.city = city;
      if (country !== undefined) user.country = country;
      if (state !== undefined) user.state = state;
      if (zip_code !== undefined) user.zip_code = zip_code;
      if (vat_number !== undefined) user.vat_number = vat_number;
      if (company_name !== undefined) user.company_name = company_name;
      if (registration_number !== undefined)
        user.registration_number = registration_number;
      if (establishment_year !== undefined)
        user.establishment_year = establishment_year;
      if (legal_status !== undefined) user.legal_status = legal_status;
      if (company_description !== undefined)
        user.company_description = company_description;
      user.isCompanydetailsFilled = true;
    } else {
      return res.status(400).json({ message: "Invalid user type" });
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        name: user.name,
        phone_number: user.phone_number,
        email: user.email,
        type: user.type,
        logo: user.logo,
        company_phone_number: user.company_phone_number,
        address: user.address,
        address2: user.address2,
        city: user.city,
        country: user.country,
        state: user.state,
        zip_code: user.zip_code,
        vat_number: user.vat_number,
        company_name: user.company_name,
        registration_number: user.registration_number,
        establishment_year: user.establishment_year,
        legal_status: user.legal_status,
        company_description: user.company_description,
        isCompanydetailsFilled: user.isCompanydetailsFilled,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
