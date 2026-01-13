const {
  Enquiries,
  EnquiryItems,
  User,
  Vehicle,
  ProductType,
} = require("../../../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SellerProductTypeConfig = require("../../../models/seller_product_type_config");
const EnquirySeller = require("../../../models/enquiry_seller_mapping");
const { Op, col } = require("sequelize");
const Quotations = require("../../../models/quotations");
const { sendVerificationEmail, transporter } = require("../../../utils/mailer");
const Brand = require("../../../models/brands");

exports.createEnquiry = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, vehicleInfo, parts, message } =
      req.body;

    // Validate required fields
    if (!fullName || !email || !phoneNumber) {
      return res.status(400).json({
        error:
          "Missing required user information (fullName, email, phoneNumber)",
      });
    }
    if (
      !vehicleInfo ||
      !vehicleInfo.brand ||
      !vehicleInfo.model ||
      !vehicleInfo.year
    ) {
      return res.status(400).json({
        error: "Missing required vehicle information (brand, model, year)",
      });
    }
    if (!Array.isArray(parts) || parts.length === 0) {
      return res
        .status(400)
        .json({ error: "Parts array is required and cannot be empty" });
    }
    for (const p of parts) {
      if (!p.name) {
        return res.status(400).json({ error: "Each part must have a name" });
      }
    }

    // Find or create the buyer
    let buyer = await User.findOne({
      where: { email, phone_number: phoneNumber, type: "buyer" },
    });
    let isNewUser = false;

    if (!buyer) {
      // Generate a random password
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      // Create new buyer
      buyer = await User.create({
        name: fullName,
        email,
        phone_number: phoneNumber,
        type: "buyer",
        password: hashedPassword,
        email_verified: false, // Auto-verify since they're creating an enquiry
      });
      isNewUser = true;

      // Generate password reset token
      const resetToken = jwt.sign(
        {
          id: buyer.id,
          email,
          type: "buyer",
          purpose: "password_reset", // Add purpose to token
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Send password reset email
      const resetEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px 32px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #2d3748; font-size: 28px; margin: 0;">Welcome to SparesGateway!</h1>
          <p style="color: #4a5568; font-size: 16px; margin-top: 12px;">Your enquiry has been created successfully</p>
        </div>
        
        <div style="background: #f7fafc; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
          <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin: 0;">
            To access your account and verify your email, please click the button below:
          </p>
        </div>
    
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.FRONTEND_URL}?resetToken=${resetToken}" 
             style="background: #4299e1; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 18px; font-weight: 600; display: inline-block; transition: background-color 0.3s;">
            Set Your Password
          </a>
        </div>
    
        <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
          <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
            <strong>Note:</strong> This link will expire in 1 hour.
          </p>
          <p style="color: #718096; font-size: 14px; margin: 0;">
            You will be redirected to the homepage where you can set your password through the login popup.
          </p>
        </div>
      </div>
    `;

      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: "Set Your Password - AutoParts",
        html: resetEmailHtml,
      });
    }

    // Create vehicle
    let vehicle = await Vehicle.findOne({
      where: {
        make: vehicleInfo.brand,
        model: vehicleInfo.model,
        year: vehicleInfo.year,
        body_style: vehicleInfo.bodyStyle,
        trim: vehicleInfo.trimType || vehicleInfo.trim,
        gearbox: vehicleInfo.transmission,
        fuel: vehicleInfo.fuel,
        additional_info: vehicleInfo.additionalInfo || null,
      },
    });
    if (!vehicle) {
      vehicle = await Vehicle.create({
        make: vehicleInfo.brand,
        model: vehicleInfo.model,
        year: vehicleInfo.year,
        body_style: vehicleInfo.bodyStyle,
        trim: vehicleInfo.trimType || vehicleInfo.trim,
        gearbox: vehicleInfo.transmission,
        fuel: vehicleInfo.fuel,
        additional_info: vehicleInfo.additionalInfo || null,
      });
    }

    // Create enquiry
    const enquiry = await Enquiries.create({
      buyer_id: buyer.id,
      vehicle_id: vehicle.id,
      message: message || null,
      status: "open",
      created_at: new Date(),
    });

    // Create enquiry items
    const partsPayload = await Promise.all(
      parts.map(async (p) => {
        // const productType = await ProductType.findOne({
        //   where: { name: p.name },
        // });
        let productType;
        // Check if this is a custom product type
        if (p.isCustom) {
          // Create new product type with user_id
          productType = await ProductType.create({
            name: p.name,
            user_id: buyer.id, // Set the user_id for custom product type
          });
        } else {
          // Find existing product type
          productType = await ProductType.findOne({
            where: {
              name: p.name,
              user_id: null, // Only get standard product types
            },
          });

          if (!productType) {
            throw new Error(`Product type not found for part name: ${p.name}`);
          }
        }
        return {
          enquiry_id: enquiry.id,
          product_type_id: productType.id,
          details: p.details || null,
          image: p.imageUrl ? [p.imageUrl] : null,
          status: "open",
          created_at: new Date(),
          updated_at: new Date(),
        };
      })
    );

    const createdParts = await EnquiryItems.bulkCreate(partsPayload, {
      returning: true,
    });

    // Find relevant sellers and create mappings
    const partTypeIds = createdParts.map((item) => item.product_type_id);
    const sellerConfigs = await SellerProductTypeConfig.findAll({
      where: { product_type_id: { [Op.in]: partTypeIds } },
      attributes: ["seller_id"],
      group: ["seller_id"],
    });
    const sellerIds = sellerConfigs.map((c) => c.seller_id);

    await Promise.all(
      sellerIds.map((seller_id) =>
        EnquirySeller.create({
          enquiry_id: enquiry.id,
          seller_id,
          status: "pending",
          created_at: new Date(),
        })
      )
    );

    // Notify sellers
    const sellers = await User.findAll({
      where: {
        id: { [Op.in]: sellerIds },
        type: "seller",
        email_verified: true,
      },
    });

    const partDetails = await Promise.all(
      createdParts.map(async (part) => {
        const type = await ProductType.findByPk(part.product_type_id);
        return {
          name: type?.name || "Unknown",
          details: part.details || "N/A",
          image: part.image && part.image.length > 0 ? part.image[0] : null,
        };
      })
    );

    const emailHtml = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px 32px; background: #ffffff;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #2d3748; font-size: 28px; margin: 0;">New Vehicle Part Enquiry</h1>
    </div>

    <div style="background: #f7fafc; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
      <h2 style="color: #2d3748; font-size: 20px; margin: 0 0 16px 0; text-align: center;">Customer Information</h2>
      <p style="color: #4a5568; font-size: 16px; margin: 0; text-align: center;">
        <strong>Name:</strong> ${buyer.name}<br>
        <strong>Email:</strong> ${buyer.email}<br>
        <strong>Phone:</strong> ${buyer.phone_number}
      </p>
    </div>

    <div style="background: #f7fafc; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
      <h2 style="color: #2d3748; font-size: 20px; margin: 0 0 16px 0; text-align: center;">Vehicle Details</h2>
      <p style="color: #4a5568; font-size: 16px; margin: 0; text-align: center;">
        <strong>Make & Model:</strong> ${vehicle.make} ${vehicle.model} (${
      vehicle.year
    })<br>
        <strong>Trim:</strong> ${vehicle.trim}<br>
        <strong>Fuel Type:</strong> ${vehicle.fuel}<br>
        <strong>Transmission:</strong> ${vehicle.gearbox}<br>
        <strong>Body Style:</strong> ${vehicle.body_style}
      </p>
    </div>

    <div style="background: #f7fafc; border-radius: 8px; padding: 24px;">
      <h2 style="color: #2d3748; font-size: 20px; margin: 0 0 24px 0; text-align: center;">Requested Parts</h2>
      <div style="display: grid; gap: 24px; max-width: 500px; margin: 0 auto;">
        ${partDetails
          .map(
            (part) => `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h3 style="color: #2d3748; font-size: 20px; margin: 0 0 16px 0; font-weight: 600;">${part.name}</h3>
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <p style="color: #4a5568; font-size: 16px; margin: 0;">
                <strong style="color: #2d3748;">Details:</strong><br>
                ${part.details}
              </p>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  </div>
`;

    // Send enquiry notification email to buyer
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: buyer.email,
      subject: "Your Enquiry Has Been Created",
      html: emailHtml,
    });

    // Send notifications to sellers
    for (const seller of sellers) {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: seller.email,
        subject: "New Vehicle Parts Enquiry",
        html: emailHtml,
      });
    }

    // Return appropriate response based on user status
    if (isNewUser) {
      return res.status(201).json({
        success: true,
        message:
          "Enquiry created successfully. A password reset link has been sent to your email.",
        enquiry_id: enquiry.id,
        isNewUser: true,
      });
    } else {
      return res.status(201).json({
        success: true,
        message: "Enquiry created successfully",
        enquiry_id: enquiry.id,
        isNewUser: false,
        userExists: true,
      });
    }
  } catch (err) {
    console.error("Failed to create enquiry:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Add new endpoint to verify reset token
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is for password reset
    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ error: "Invalid token purpose" });
    }

    // Find the user
    const user = await User.findOne({
      where: {
        id: decoded.id,
        email: decoded.email,
        type: "buyer",
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return user details needed for the login popup
    return res.status(200).json({
      success: true,
      isValid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    console.error("Failed to verify token:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Add new endpoint to reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is for password reset
    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ error: "Invalid token purpose" });
    }

    // Find the user
    const user = await User.findOne({
      where: {
        id: decoded.id,
        email: decoded.email,
        type: "buyer",
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and verify email
    await user.update({
      password: hashedPassword,
      email_verified: true,
    });

    // Generate new JWT token for login
    const loginToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: user.type,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30h" }
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successful and email verified",
      token: loginToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
        phone_number: user.phone_number,
      },
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    console.error("Failed to reset password:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.respondToEnquiry = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const { status } = req.body; // "accepted" or "rejected"
    const sellerId = req.user.id;

    const enquirySeller = await EnquirySeller.findOne({
      where: { enquiry_id: enquiryId, seller_id: sellerId },
    });
    if (!enquirySeller) {
      return res
        .status(404)
        .json({ error: "Enquiry not found for this seller" });
    }
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    enquirySeller.status = status;
    await enquirySeller.save();

    res.json({ message: `Enquiry ${status} successfully`, status: status });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getMyEnquiries = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const enquiries = await Enquiries.findAll({
      where: { buyer_id: buyerId },
      include: [
        {
          model: Vehicle,
          attributes: [
            "make",
            "model",
            "year",
            "body_style",
            "trim",
            "gearbox",
            "fuel",
          ],
        },
        {
          model: EnquiryItems,
          attributes: ["id", "image", "details"], // Only need id to count
          include: [
            {
              model: ProductType,
              attributes: ["name"],
              // where: {
              //   [Op.or]: [
              //     { user_id: null }, // Standard product types
              //     { user_id: buyerId }, // User's custom product types
              //   ],
              // },
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Fetch brand logos for all unique makes
    const makes = [
      ...new Set(
        enquiries
          .map(
            (enq) =>
              enq.vehicle && enq.vehicle.make && enq.vehicle.make.toLowerCase()
          )
          .filter(Boolean)
      ),
    ];
    const brands = await Brand.findAll({
      where: {
        [Op.or]: makes.map((make) => ({
          name: { [Op.iLike]: make },
        })),
      },
      attributes: ["name", "logo"],
    });
    const brandMap = {};
    brands.forEach((b) => {
      brandMap[b.name.toLowerCase()] = b.logo;
    });

    // Count the total number of quotations for each enquiry
    const quotationCounts = {};
    await Promise.all(
      enquiries.map(async (enquiry) => {
        const count = await Quotations.count({
          where: { enquiry_id: enquiry.id },
        });
        quotationCounts[enquiry.id] = count;
      })
    );

    // Format response to include vehicle and brand logo
    const formatted = enquiries.map((enq) => {
      const { vehicle_id, vehicle, enquiry_items, ...enquiryData } =
        enq.toJSON(); // Remove vehicle_id, keep rest
      return {
        ...enquiryData,
        vehicle: vehicle
          ? {
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
              body_style: vehicle.body_style,
              trim: vehicle.trim,
              gearbox: vehicle.gearbox,
              fuel: vehicle.fuel,
              brand_logo: brandMap[vehicle.make.toLowerCase()] || null,
            }
          : null,
        parts: Array.isArray(enquiry_items)
          ? enquiry_items
              .map((item) => {
                return {
                  id: item.id,
                  name: item.product_type ? item.product_type.name : null,
                  details: item.details || null,
                  image:
                    item.image && item.image.length > 0 ? item.image[0] : null,
                };
              })
              .filter(Boolean)
          : [],
        total_quotations: quotationCounts[enq.id] || 0,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("getMyEnquiries error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getReceivedEnquiries = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // 1. Check if seller has any product type config
    const sellerConfigs = await SellerProductTypeConfig.findAll({
      where: { seller_id: sellerId },
    });

    let received;
    if (sellerConfigs.length > 0) {
      // Seller has config: show only mapped enquiries (current logic)
      received = await EnquirySeller.findAll({
        where: { seller_id: sellerId },
        include: [
          {
            model: Enquiries,
            include: [
              {
                model: Vehicle,
                attributes: [
                  "make",
                  "model",
                  "year",
                  "body_style",
                  "trim",
                  "gearbox",
                  "fuel",
                ],
              },
              {
                model: EnquiryItems,
                attributes: ["id", "image", "details"],
                include: [
                  {
                    model: ProductType,
                    attributes: ["name"],
                  },
                ],
              },
            ],
          },
        ],
        order: [["created_at", "DESC"]],
      });
    } else {
      // Seller has no config: show all enquiries
      const allEnquiries = await Enquiries.findAll({
        include: [
          {
            model: Vehicle,
            attributes: [
              "make",
              "model",
              "year",
              "body_style",
              "trim",
              "gearbox",
              "fuel",
            ],
          },
          {
            model: EnquiryItems,
            attributes: ["id", "image", "details"],
            include: [
              {
                model: ProductType,
                attributes: ["name"],
                // where: {
                //   [Op.or]: [
                //     { user_id: null }, // Standard product types
                //     { user_id: { [Op.col]: "Enquiries.buyer_id" } }, // User's custom product types
                //   ],
                // },
              },
            ],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      // For each enquiry, ensure an enquiry_seller mapping exists for this seller
      received = [];
      for (const enquiry of allEnquiries) {
        let mapping = await EnquirySeller.findOne({
          where: { enquiry_id: enquiry.id, seller_id: sellerId },
        });
        if (!mapping) {
          mapping = await EnquirySeller.create({
            enquiry_id: enquiry.id,
            seller_id: sellerId,
            status: "pending",
            created_at: new Date(),
          });
        }
        // Attach the enquiry to the mapping for response formatting
        mapping.Enquiry = enquiry;
        received.push(mapping);
      }
    }

    // Gather all makes for brand lookup
    const makes = [
      ...new Set(
        received
          .map(
            (rec) =>
              rec.Enquiry &&
              rec.Enquiry.Vehicle &&
              rec.Enquiry.Vehicle.make &&
              rec.Enquiry.Vehicle.make.toLowerCase()
          )
          .filter(Boolean)
      ),
    ];
    const brands = await Brand.findAll({
      where: {
        [Op.or]: makes.map((make) => ({
          name: { [Op.iLike]: make },
        })),
      },
      attributes: ["name", "logo"],
    });
    const brandMap = {};
    brands.forEach((b) => {
      brandMap[b.name.toLowerCase()] = b.logo;
    });

    // For each enquiry, count the number of sellers who have sent a quotation
    const applicantCounts = {};
    await Promise.all(
      received.map(async (rec) => {
        const enquiryId = rec.enquiry_id || (rec.Enquiry && rec.Enquiry.id);
        if (enquiryId) {
          const count = await Quotations.count({
            where: { enquiry_id: enquiryId },
            distinct: true,
            col: "seller_id",
          });
          applicantCounts[enquiryId] = count;
        }
      })
    );

    // Format response and add isAlreadyQuoted
    const formatted = await Promise.all(
      received.map(async (rec) => {
        const recJson = rec.toJSON();
        const enquiry = rec.Enquiry ? rec.Enquiry.toJSON() : recJson.enquiry;
        const vehicle = enquiry?.vehicle;
        const enquiryId = enquiry?.id;

        let isAlreadyQuoted = false;
        if (enquiryId) {
          const existingQuote = await Quotations.findOne({
            where: { enquiry_id: enquiryId, seller_id: sellerId },
          });
          isAlreadyQuoted = !!existingQuote;
        }

        return {
          ...recJson,
          enquiry: enquiry
            ? {
                ...enquiry,
                isAlreadyQuoted,
                vehicle: vehicle
                  ? {
                      make: vehicle.make,
                      model: vehicle.model,
                      year: vehicle.year,
                      body_style: vehicle.body_style,
                      trim: vehicle.trim,
                      gearbox: vehicle.gearbox,
                      fuel: vehicle.fuel,
                      brand_logo:
                        vehicle.make && brandMap[vehicle.make.toLowerCase()]
                          ? brandMap[vehicle.make.toLowerCase()]
                          : null,
                    }
                  : null,
                applicant_count: applicantCounts[enquiryId] || 0,
              }
            : null,
        };
      })
    );

    res.json(formatted);
  } catch (err) {
    console.error("getReceivedEnquiries error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getEnquiryDetails = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const enquiry = await Enquiries.findByPk(enquiryId, {
      include: [
        {
          model: EnquiryItems,
          include: [
            {
              model: ProductType,
              attributes: ["name"],
            },
          ],
        },
      ],
    });
    if (!enquiry) return res.status(404).json({ error: "Enquiry not found" });

    // Format response to show product_type name in each enquiry item
    const enquiryJson = enquiry.toJSON();
    enquiryJson.enquiry_items = enquiryJson.enquiry_items.map((item) => ({
      ...item,
      product_type: item.product_type ? item.product_type.name : null,
      product_type_id: undefined, // Optionally remove the id
    }));

    res.json(enquiryJson);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
