const {
  Quotations,
  QuotationItems,
  Enquiries,
  EnquiryItems,
  User,
  ProductType,
  Vehicle,
  Brand,
} = require("../../../models");
const { sendEmail } = require("../../../utils/sendEmail");
const { sendVerificationEmail, transporter } = require("../../../utils/mailer");
const { Op } = require("sequelize");
const EnquirySeller = require("../../../models/enquiry_seller_mapping");

exports.createQuotation = async (req, res) => {
  try {
    const { enquiry_id, items, notes } = req.body;
    const seller_id = req.user.id;

    // Validate the enquiry
    const enquiry = await Enquiries.findByPk(enquiry_id, {
      include: [{ model: EnquiryItems }],
    });
    if (!enquiry) {
      return res.status(404).json({ error: "Enquiry not found" });
    }

    // Ensure seller is mapped to this enquiry and has accepted
    const mapping = await EnquirySeller.findOne({
      where: { enquiry_id, seller_id, status: "accepted" },
    });
    if (!mapping) {
      return res
        .status(403)
        .json({ error: "You are not authorized to quote for this enquiry" });
    }
    const existingQuotation = await Quotations.findOne({
      where: { enquiry_id, seller_id },
    });
    if (existingQuotation) {
      return res.status(400).json({
        error: "You have already submitted a quotation for this enquiry",
      });
    }
    // Ensure all items belong to this enquiry
    const validItemIds = (enquiry.enquiry_items || []).map((i) => i.id);
    for (const item of items) {
      if (!validItemIds.includes(item.enquiry_item_id)) {
        return res
          .status(400)
          .json({ error: "Invalid enquiry item in quotation" });
      }
    }

    // // Create quotation
    // const quotation = await Quotations.create({
    //   enquiry_id,
    //   seller_id,
    //   notes: notes || null,
    // });

    // Prepare quotation items with full fields
    const quotationItemsPayload = items.map((item) => ({
      quotation_id: null, // will set after quotation is created
      enquiry_item_id: item.enquiry_item_id,
      quoted_price: item.quoted_price,
      delivery_time: item.delivery_time,
      delivery_charges: item.delivery_charges,
      condition: item.condition,
      guarantee: item.guarantee,
      invoice_type: item.invoice_type,
      remarks: item.remarks || null,
      status: item.status || "pending",
      subtotal: item.subtotal || null,
      p_and_p: item.p_and_p || null,
      discount: item.discount || null,
      total_ex_vat: item.total_ex_vat || null,
      vat_percent: item.vat_percent || null,
      vat_amount: item.vat_amount || null,
      grand_total: item.grand_total || null,
      is_free_delivery: item.is_free_delivery || false,
      is_collection_only: item.is_collection_only || false,
      is_vat_exempt: item.is_vat_exempt || false,
    }));

    // Create quotation first (total_price will be updated after items are created)
    const quotation = await Quotations.create({
      enquiry_id,
      seller_id,
      notes: notes || null,
      total_price: 0, // temporary, will update after items are created
    });
    // Set quotation_id for all items
    quotationItemsPayload.forEach((item) => (item.quotation_id = quotation.id));

    const createdQuotationItems = await QuotationItems.bulkCreate(
      quotationItemsPayload,
      { returning: true }
    );

    // Calculate total_price and update quotation
    const total_price = createdQuotationItems.reduce(
      (sum, item) => sum + (parseFloat(item.quoted_price) || 0),
      0
    );
    quotation.total_price = total_price;
    await quotation.save();

    // Fetch buyer
    const buyer = await User.findByPk(enquiry.buyer_id);

    // Email construction
    const itemDetails = await Promise.all(
      createdQuotationItems.map(async (item) => {
        const enquiryItem = await EnquiryItems.findByPk(item.enquiry_item_id);
        const productType = await ProductType.findByPk(
          enquiryItem.product_type_id
        );
        return `
          <li>
            <strong>Part:</strong> ${productType?.name || "Unknown"}<br/>
            <strong>Quoted Price:</strong> £${item.quoted_price || "N/A"}<br/>
            <strong>Delivery Time:</strong> ${item.delivery_time || "N/A"}<br/>
            <strong>Condition:</strong> ${item.condition || "N/A"}<br/>
            <strong>Guarantee:</strong> ${item.guarantee || "N/A"}<br/>
            <strong>Invoice Type:</strong> ${item.invoice_type || "N/A"}<br/>
            <strong>Remarks:</strong> ${item.remarks || "N/A"}<br/>
          </li>
        `;
      })
    );

    const emailHtml = `
      <h2>Quotation for Your Enquiry</h2>
      <p><strong>Enquiry ID:</strong> ${enquiry.id}</p>
      <p><strong>Seller Notes:</strong> ${notes || "N/A"}</p>
      <ul>${itemDetails.join("")}</ul>
    `;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: buyer.email,
      subject: "Quotation for Your Enquiry",
      html: emailHtml,
    });

    res.status(201).json({
      success: true,
      message: "Quotation created successfully",
      quotation,
      quotationItems: createdQuotationItems,
    });
  } catch (err) {
    console.error("Failed to create quotation:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.editQuotationItem = async (req, res) => {
  try {
    const { quotation_item_id } = req.params;
    const {
      quoted_price,
      delivery_time,
      delivery_charges,
      condition,
      guarantee,
      invoice_type,
      remarks,
      subtotal,
      p_and_p,
      discount,
      total_ex_vat,
      vat_percent,
      vat_amount,
      grand_total,
      is_free_delivery,
      is_collection_only,
      is_vat_exempt,
    } = req.body;

    const quotationItem = await QuotationItems.findByPk(quotation_item_id);
    if (!quotationItem) {
      return res.status(404).json({ error: "Quotation item not found" });
    }

    // Update the fields
    quotationItem.quoted_price = quoted_price || quotationItem.quoted_price;
    quotationItem.delivery_time = delivery_time || quotationItem.delivery_time;
    quotationItem.delivery_charges =
      delivery_charges || quotationItem.delivery_charges;
    quotationItem.condition = condition || quotationItem.condition;
    quotationItem.guarantee = guarantee || quotationItem.guarantee;
    quotationItem.invoice_type = invoice_type || quotationItem.invoice_type;
    quotationItem.remarks = remarks || quotationItem.remarks;
    quotationItem.subtotal = subtotal || quotationItem.subtotal;
    quotationItem.p_and_p = p_and_p || quotationItem.p_and_p;
    quotationItem.discount = discount || quotationItem.discount;
    quotationItem.total_ex_vat = total_ex_vat || quotationItem.total_ex_vat;
    quotationItem.vat_percent = vat_percent || quotationItem.vat_percent;
    quotationItem.vat_amount = vat_amount || quotationItem.vat_amount;
    quotationItem.grand_total = grand_total || quotationItem.grand_total;
    quotationItem.is_free_delivery =
      is_free_delivery !== undefined
        ? is_free_delivery
        : quotationItem.is_free_delivery;
    quotationItem.is_collection_only =
      is_collection_only !== undefined
        ? is_collection_only
        : quotationItem.is_collection_only;
    quotationItem.is_vat_exempt =
      is_vat_exempt !== undefined ? is_vat_exempt : quotationItem.is_vat_exempt;

    await quotationItem.save();

    res.status(200).json({
      success: true,
      message: "Quotation item updated successfully",
      quotationItem,
    });
  } catch (err) {
    console.error("Failed to edit quotation item:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateQuotationItemStatus = async (req, res) => {
  try {
    const { quotation_item_id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!["accepted", "rejected", "pending", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const quotationItem = await QuotationItems.findByPk(quotation_item_id, {
      include: [
        {
          model: Quotations,
          include: [{ model: Enquiries }],
        },
      ],
    });
    if (!quotationItem) {
      return res.status(404).json({ error: "Quotation item not found" });
    }

    // Use correct property names (lowercase, singular)
    const quotation = quotationItem.quotation || quotationItem.Quotations;
    const enquiry = quotation?.enquiry || quotation?.Enquiries;

    if (!quotation || !enquiry) {
      return res.status(400).json({ error: "Quotation or Enquiry not found" });
    }

    const isBuyer = req.user.id === enquiry.buyer_id;
    const isSeller = req.user.id === quotation.seller_id;

    if (
      (["accepted", "rejected"].includes(status) && !isBuyer) ||
      (status === "completed" && !isSeller)
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this status" });
    }

    quotationItem.status = status;
    await quotationItem.save();

    res.status(200).json({
      success: true,
      message: "Quotation item status updated successfully",
      quotationItem,
    });
  } catch (err) {
    console.error("Failed to update quotation item status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getQuotationsByEnquiry = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const quotations = await Quotations.findAll({
      where: { enquiry_id: enquiryId },
      include: [
        {
          model: QuotationItems,
          include: [
            {
              model: EnquiryItems,
              attributes: ["id"],
              include: [
                {
                  model: ProductType,
                  attributes: ["name"],
                },
              ],
            },
          ],
        },
        {
          model: User,
          as: "seller",
          attributes: [
            "id",
            "name",
            "email",
            "phone_number",
            "logo",
            "company_name",
          ],
        },
        // Add EnquiryItems through Enquiry association
        {
          model: Enquiries, // Assuming you have an Enquiry model
          include: [
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

    res.json({
      enquiryId: enquiryId,
      quotations: quotations.map((q) => ({
        id: q.id,
        seller: q.seller,
        total_price: q.total_price,
        notes: q.notes,
        created_at: q.created_at,
        quotationItems: q.quotation_items,
        parts:
          q.enquiry?.enquiry_items?.map((item) => ({
            id: item.id,
            image: Array.isArray(item.image) ? item.image[0] : item.image, // Get single image
            details: item.details,
            name: item.product_type?.name || null, // Use name instead of product_type.name
          })) || [], // Access enquiry items and transform them
      })),
    });
  } catch (err) {
    console.error("Error in getQuotationsByEnquiry:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
// New API: Get all quotation_items for an enquiry_id
exports.getQuotationDetailsByEnquiry = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const quotations = await Quotations.findAll({
      where: { enquiry_id: enquiryId },
      include: [{ model: QuotationItems }],
      order: [["created_at", "DESC"]],
    });
    // Use the correct association key
    const allItems = quotations.flatMap((q) => q.quotation_items);
    res.json(allItems);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.negotiateQuotation = async (req, res) => {
  try {
    const { quotationId } = req.params;
    const { negotiation_notes } = req.body;
    const quotation = await Quotations.findByPk(quotationId);
    if (!quotation)
      return res.status(404).json({ error: "Quotation not found" });
    quotation.notes = negotiation_notes;
    await quotation.save();
    res.json({ message: "Negotiation notes updated", quotation });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getQuotationsBySeller = async (req, res) => {
  try {
    const seller_id = req.user.id;

    const quotations = await Quotations.findAll({
      where: { seller_id },
      include: [
        {
          model: QuotationItems,
          include: [
            {
              model: EnquiryItems,
              include: [
                {
                  model: ProductType,
                  attributes: ["name", "user_id"],
                },
              ],
            },
          ],
        },
        {
          model: Enquiries,
          include: [
            {
              model: User,
              attributes: ["id", "name", "email", "phone_number"],
            },
            {
              model: Vehicle,
              attributes: [
                "id",
                "make",
                "model",
                "year",
                "body_style",
                "trim",
                "gearbox",
                "fuel",
              ],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Transform the response to match the expected format (without brand)
    const formattedQuotations = quotations.map((quotation) => {
      const enquiry = quotation.enquiry;
      const vehicle = enquiry?.vehicle;

      //   return {
      //     ...quotation.toJSON(),
      //     enquiry: {
      //       ...enquiry.toJSON(),
      //       buyer: enquiry.user,
      //       vehicle: vehicle ? { ...vehicle } : null,
      //     },
      //   };
      // });
      // Calculate totals for the quotation
      const quotationItems = quotation.quotation_items || [];
      const totals = quotationItems.reduce((acc, item) => {
        return {
          p_and_p: (acc.p_and_p || 0) + parseFloat(item.p_and_p || 0),
          discount: (acc.discount || 0) + parseFloat(item.discount || 0),
          total_ex_vat:
            (acc.total_ex_vat || 0) + parseFloat(item.total_ex_vat || 0),
          vat_amount: (acc.vat_amount || 0) + parseFloat(item.vat_amount || 0),
          grand_total:
            (acc.grand_total || 0) + parseFloat(item.grand_total || 0),
        };
      }, {});

      // Get delivery and VAT flags from the first item (assuming they're the same for all items)
      const firstItem = quotationItems[0] || {};
      const isFreeDelivery = firstItem.is_free_delivery || false;
      const isCollectionOnly = firstItem.is_collection_only || false;
      const isVatExempt = firstItem.is_vat_exempt || false;
      const vatPercent = firstItem.vat_percent || 0;

      // Format numbers to 2 decimal places and add £ symbol
      const formatCurrency = (value) => {
        const num = parseFloat(value) || 0;
        return `${num.toFixed(2)}`;
      };

      return {
        ...quotation.toJSON(),
        enquiry: {
          ...enquiry.toJSON(),
          buyer: enquiry.user,
          vehicle: vehicle ? { ...vehicle } : null,
        },
        // Add the additional details with proper formatting
        p_and_p: formatCurrency(totals.p_and_p),
        discount: formatCurrency(totals.discount),
        total_ex_vat: formatCurrency(totals.total_ex_vat),
        vat_percent: `${vatPercent}%`,
        vat_amount: formatCurrency(totals.vat_amount),
        grand_total: formatCurrency(totals.grand_total),
        is_free_delivery: isFreeDelivery,
        is_collection_only: isCollectionOnly,
        is_vat_exempt: isVatExempt,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedQuotations,
    });
  } catch (err) {
    console.error("Failed to fetch seller quotations:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.sendQuotationEmail = async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    // Validate required fields
    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: to, subject, or body",
      });
    }

    // Send the email
    await sendEmail({
      to,
      subject,
      html: body, // Assuming the body contains HTML content
    });

    // Update the quotation to mark email as sent (optional)
    // await Quotations.update(
    //   { email_sent: true },
    //   { where: { id: quotationId } }
    // );

    res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Failed to send quotation email:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send email",
    });
  }
};
