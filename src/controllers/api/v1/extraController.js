const Brand = require("../../../models/brands");
const { uploadToS3 } = require("../../../services/s3Service");

exports.addBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const logoFile = req.file; // Assuming you're using multer for file uploads

    if (!name || !logoFile) {
      return res
        .status(400)
        .json({ error: "Brand name and logo are required" });
    }

    // Upload logo to S3
    const logoUrl = await uploadToS3(
      logoFile.buffer,
      logoFile.originalname,
      process.env.S3_BUCKET_NAME
    );

    // Add brand to the database
    const brand = await Brand.create({
      name,
      logo: logoUrl,
    });
    // console.log("logo::", logoUrl);

    res.status(201).json({ success: true, brand });
  } catch (err) {
    console.error("Error adding brand:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
