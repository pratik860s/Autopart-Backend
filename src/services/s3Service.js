// const AWS = require("aws-sdk");

// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY,
//   secretAccessKey: process.env.AWS_SECRET_KEY,
//   region: process.env.AWS_REGION,
// });

// // Create S3 instance
// const s3 = new AWS.S3();
// const uploadToS3 = async (fileBuffer, fileName, bucketName) => {
//   const uniqueFileName = `${Date.now()}-${fileName}`;
//   const params = {
//     Bucket: bucketName,
//     Key: uniqueFileName,
//     Body: fileBuffer,
//     ACL: "public-read",
//   };

//   try {
//     const data = await s3.upload(params).promise();
//     return data.Location; // The S3 URL of the uploaded file
//   } catch (err) {
//     console.error("S3 Upload Error:", err);
//     throw new Error("Failed to upload image to S3");
//   }
// };

// module.exports = { uploadToS3 };

const AWS = require("aws-sdk");
const sharp = require("sharp");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

// Create S3 instance
const s3 = new AWS.S3();

const compressImage = async (fileBuffer) => {
  try {
    // Initial compression with high quality
    let quality = 90;
    let compressedBuffer = await sharp(fileBuffer)
      .resize(1920, 1920, {
        // Larger initial size for high-quality images
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toBuffer();

    // If size is still too large, gradually reduce quality
    while (compressedBuffer.length > 5 * 1024 * 1024 && quality > 30) {
      // 5MB
      quality -= 10;
      compressedBuffer = await sharp(fileBuffer)
        .resize(1920, 1920, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality })
        .toBuffer();
    }

    // If size is too small, increase quality
    // while (compressedBuffer.length < 3 * 1024 * 1024 && quality < 100) {
    //   // 3MB
    //   quality += 5;
    //   compressedBuffer = await sharp(fileBuffer)
    //     .resize(1920, 1920, {
    //       fit: "inside",
    //       withoutEnlargement: true,
    //     })
    //     .jpeg({ quality })
    //     .toBuffer();
    // }

    return compressedBuffer;
  } catch (err) {
    console.error("Image compression error:", err);
    throw new Error("Failed to compress image");
  }
};

const uploadToS3 = async (fileBuffer, fileName, bucketName) => {
  const uniqueFileName = `${Date.now()}-${fileName}`;

  try {
    // Compress the image before uploading
    const compressedBuffer = await compressImage(fileBuffer);

    const params = {
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: compressedBuffer,
      ContentType: "image/jpeg, image/png",
      ACL: "public-read",
    };

    const data = await s3.upload(params).promise();
    return data.Location; // The S3 URL of the uploaded file
  } catch (err) {
    console.error("S3 Upload Error:", err);
    throw new Error("Failed to upload image to S3");
  }
};

module.exports = { uploadToS3 };
