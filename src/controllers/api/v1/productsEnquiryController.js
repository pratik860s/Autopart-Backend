const { Op } = require("sequelize");
const ProductEnquiry = require("../../../models/productEnquiry");
const User = require("../../../models/user");
const Product = require("../../../models/products");
const Message = require("../../../models/message");
const { sendVerificationEmail, transporter } = require("../../../utils/mailer");
const uploadToS3 = require("../../../services/s3Service");
const bcrypt = require("bcryptjs");

exports.createProductEnquiry = async (req, res) => {
  try {
    const { name, phone, email, message, product_id } = req.body;
    let { image_urls } = req.body;

    // 1. Find or create user
    let user = await User.findOne({ where: { email } });
    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      user = await User.create({
        name,
        phone_number: phone,
        password: hashedPassword,
        email,
        type: "buyer",
        email_verified: false,
      });
    }

    // 2. Handle image upload if files are present
    if (req.files && req.files.length > 0) {
      image_urls = [];
      for (const file of req.files) {
        const s3Url = await uploadToS3(file);
        image_urls.push(s3Url);
      }
    }

    // 3. Create product enquiry
    const enquiry = await ProductEnquiry.create({
      product_id,
      user_id: user.id,
      message,
      image_url: image_urls,
    });

    // 4. Find seller for the product
    const product = await Product.findByPk(product_id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const sellerId = product.user_id;

    // 5. Send message to seller (fix: add room_id and receiver_id)
    await Message.create({
      room_id: `${user.id}_${sellerId}`,
      sender_id: user.id,
      receiver_id: sellerId,
      content: message,
      timestamp: new Date(),
    });

    // 6. Send email notification
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: "Your Product Enquiry",
      text: `Thank you for your enquiry for ${product.title}. We will get back to you soon.`,
    });

    res.status(201).json({ message: "Enquiry created successfully", enquiry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
