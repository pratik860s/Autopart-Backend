const express = require("express");
const { SitemapStream, streamToPromise } = require("sitemap");
const { Readable } = require("stream");

// Import all models for dynamic content
const Product = require("../models/products");
const VehicleCategory = require("../models/vehicle-catagories");
const Enquiry = require("../models/enquiries");
const Quotation = require("../models/quotations");
const Feedback = require("../models/feedback");
const Brand = require("../models/brands");
const User = require("../models/user");
const ContactData = require("../models/contactData");

const router = express.Router();

router.get("/sitemap.xml", async (req, res) => {
  try {
    // 1. Static routes (main pages)
    const links = [
      { url: "/", changefreq: "daily", priority: 1.0 },
      { url: "/about", changefreq: "monthly", priority: 0.7 },
      { url: "/contact", changefreq: "monthly", priority: 0.7 },
      { url: "/help", changefreq: "monthly", priority: 0.6 },
      { url: "/privacy-policy", changefreq: "yearly", priority: 0.3 },
      { url: "/terms-of-service", changefreq: "yearly", priority: 0.3 },
    ];

    // 2. Authentication routes (public pages)
    const authRoutes = [
      { url: "/auth/login", changefreq: "monthly", priority: 0.5 },
      { url: "/auth/register", changefreq: "monthly", priority: 0.5 },
      { url: "/auth/forgot-password", changefreq: "monthly", priority: 0.4 },
    ];
    links.push(...authRoutes);

    // 3. Product-related routes
    const productRoutes = [
      { url: "/products/get-all-products", changefreq: "daily", priority: 0.9 },
      { url: "/products/brand", changefreq: "weekly", priority: 0.8 },
      { url: "/products/models", changefreq: "weekly", priority: 0.8 },
      { url: "/products/years", changefreq: "monthly", priority: 0.7 },
      { url: "/products/body-types", changefreq: "monthly", priority: 0.7 },
      { url: "/products/trims", changefreq: "monthly", priority: 0.7 },
      { url: "/products/gearboxes", changefreq: "monthly", priority: 0.7 },
      { url: "/products/fuels", changefreq: "monthly", priority: 0.7 },
      { url: "/products/parts", changefreq: "weekly", priority: 0.8 },
      { url: "/products/compatibility", changefreq: "weekly", priority: 0.8 },
    ];
    links.push(...productRoutes);

    // 4. Vehicle-related routes
    const vehicleRoutes = [
      { url: "/vehicles/by-reg", changefreq: "weekly", priority: 0.8 },
      { url: "/vehicles/makes", changefreq: "weekly", priority: 0.8 },
      { url: "/vehicles/models", changefreq: "weekly", priority: 0.8 },
      { url: "/vehicles/years", changefreq: "monthly", priority: 0.7 },
      { url: "/vehicles/trims", changefreq: "monthly", priority: 0.7 },
      { url: "/vehicles/body-styles", changefreq: "monthly", priority: 0.7 },
      { url: "/vehicles/gearboxes", changefreq: "monthly", priority: 0.7 },
      { url: "/vehicles/fuels", changefreq: "monthly", priority: 0.7 },
      { url: "/vehicles/parts", changefreq: "weekly", priority: 0.8 },
      { url: "/vehicles/makes-by-part", changefreq: "weekly", priority: 0.8 },
      {
        url: "/vehicles/models-by-part-and-make",
        changefreq: "weekly",
        priority: 0.8,
      },
      {
        url: "/vehicles/body-styles-by-part-make-and-model",
        changefreq: "weekly",
        priority: 0.8,
      },
      {
        url: "/vehicles/trims-by-part-make-model-and-body-style",
        changefreq: "weekly",
        priority: 0.8,
      },
    ];
    links.push(...vehicleRoutes);

    // 5. Vehicle categories
    const vehicleCategories = [
      { url: "/vehicle-categories", changefreq: "weekly", priority: 0.8 },
    ];
    links.push(...vehicleCategories);

    // 6. Enquiry and quotation routes
    const enquiryRoutes = [
      { url: "/enquiries/create", changefreq: "monthly", priority: 0.6 },
    ];
    links.push(...enquiryRoutes);

    // 7. Feedback routes
    const feedbackRoutes = [
      { url: "/feedback/submit", changefreq: "monthly", priority: 0.5 },
      {
        url: "/feedback/get-all-feedback",
        changefreq: "weekly",
        priority: 0.6,
      },
    ];
    links.push(...feedbackRoutes);

    // 8. Contact routes
    const contactRoutes = [
      { url: "/contact/contact-us", changefreq: "monthly", priority: 0.6 },
    ];
    links.push(...contactRoutes);

    // 9. Upload routes
    const uploadRoutes = [
      { url: "/upload", changefreq: "monthly", priority: 0.4 },
    ];
    links.push(...uploadRoutes);

    // 11. Dynamic: Products (individual product pages)
    try {
      const products = await Product.findAll({
        attributes: ["id", "updated_at"],
        where: { is_verified: true }, // Only include verified products
      });

      products.forEach((product) => {
        links.push({
          url: `/products/${product.id}`,
          changefreq: "weekly",
          priority: 0.8,
          lastmod: product.updated_at,
        });
      });
    } catch (error) {
      console.log("Error fetching products for sitemap:", error.message);
    }

    // 12. Dynamic: Vehicle Categories (individual category pages)
    try {
      const categories = await VehicleCategory.findAll({
        attributes: ["id", "categoryid", "created_at"],
      });

      categories.forEach((category) => {
        links.push({
          url: `/vehicle-categories/${category.categoryid}`,
          changefreq: "weekly",
          priority: 0.7,
          lastmod: category.created_at,
        });
      });
    } catch (error) {
      console.log(
        "Error fetching vehicle categories for sitemap:",
        error.message
      );
    }

    // 13. Dynamic: Brands (individual brand pages)
    try {
      const brands = await Brand.findAll({
        attributes: ["name"],
      });

      brands.forEach((brand) => {
        links.push({
          url: `/brands/${encodeURIComponent(brand.name)}`,
          changefreq: "monthly",
          priority: 0.6,
        });
      });
    } catch (error) {
      console.log("Error fetching brands for sitemap:", error.message);
    }

    // 14. Dynamic: Enquiries (for admin/seller access)
    try {
      const enquiries = await Enquiry.findAll({
        attributes: ["id", "created_at"],
        limit: 1000, // Limit to prevent sitemap from getting too large
      });

      enquiries.forEach((enquiry) => {
        links.push({
          url: `/enquiries/${enquiry.id}`,
          changefreq: "daily",
          priority: 0.5,
          lastmod: enquiry.created_at,
        });
      });
    } catch (error) {
      console.log("Error fetching enquiries for sitemap:", error.message);
    }

    // 15. Dynamic: Quotations (for admin/seller access)
    try {
      const quotations = await Quotation.findAll({
        attributes: ["id", "created_at"],
        limit: 1000, // Limit to prevent sitemap from getting too large
      });

      quotations.forEach((quotation) => {
        links.push({
          url: `/quotations/${quotation.id}`,
          changefreq: "daily",
          priority: 0.5,
          lastmod: quotation.created_at,
        });
      });
    } catch (error) {
      console.log("Error fetching quotations for sitemap:", error.message);
    }

    // 16. Dynamic: Feedback (for admin access)
    try {
      const feedbacks = await Feedback.findAll({
        attributes: ["id", "created_at"],
        limit: 500, // Limit to prevent sitemap from getting too large
      });

      feedbacks.forEach((feedback) => {
        links.push({
          url: `/feedback/${feedback.id}`,
          changefreq: "weekly",
          priority: 0.4,
          lastmod: feedback.created_at,
        });
      });
    } catch (error) {
      console.log("Error fetching feedback for sitemap:", error.message);
    }

    // Generate sitemap
    const stream = new SitemapStream({
      hostname: "https://sparesgateway.co.uk", // Update with your actual domain
    });

    const xml = await streamToPromise(Readable.from(links).pipe(stream)).then(
      (data) => data.toString()
    );

    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.send(xml);
  } catch (err) {
    console.error("Sitemap generation error:", err);
    res.status(500).json({ error: "Failed to generate sitemap" });
  }
});

module.exports = router;
