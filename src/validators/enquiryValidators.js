// const Joi = require("joi");

// const enquirySchema = Joi.object({
//   vehicle: Joi.object({
//     make: Joi.string().required(),
//     model: Joi.string().required(),
//     year: Joi.number().required(),
//     body_style: Joi.string().required(),
//     trim: Joi.string().required(),
//     gearbox: Joi.string().required(),
//     fuel: Joi.string().required(),
//   }).required(),

//   user: Joi.object({
//     name: Joi.string().required(),
//     email: Joi.string().email().required(),
//     phone_number: Joi.string().required(),
//   }).required(),

//   message: Joi.string().allow(null, "").optional(),

//   parts: Joi.array()
//     .items(
//       Joi.object({
//         product_type_id: Joi.number().required(),
//         part_number: Joi.string().allow(null, "").optional(),
//         image_url: Joi.string().uri().allow(null, "").optional(),
//       })
//     )
//     .min(1)
//     .required(),
// });

// module.exports = enquirySchema;

const Joi = require("joi");

const enquirySchema = Joi.object({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().required(),
  vehicleInfo: Joi.object({
    brand: Joi.string().required(),
    year: Joi.string().required(),
    model: Joi.string().required(),
    fuel: Joi.string().required(),
    transmission: Joi.string().required(),
    bodyStyle: Joi.string().required(),
    trim: Joi.string().required(),
    additionalInfo: Joi.string().allow(null, "").optional(),
  }).required(),
  parts: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        details: Joi.string().allow(null, "").optional(),
        imageUrl: Joi.string().uri().allow(null, "").optional(),
      })
    )
    .min(1)
    .required(),
});

module.exports = enquirySchema;
