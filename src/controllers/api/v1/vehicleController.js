const Vehicle = require("../../../models/vehicle");
const ProductType = require("../../../models/product_type");
const VehicleProductType = require("../../../models/vehicle_product_type_mapping");
// const {Vehicle} = require("../../../models/index")
//const { ProductType } = require("../../../models/index");
const Brand = require("../../../models/brands");
const axios = require("axios");
const { Op } = require("sequelize");

exports.getVehicleByReg = async (req, res) => {
  try {
    const { reg } = req.query;
    if (!reg) {
      return res
        .status(400)
        .json({ error: "Missing registration number (reg)" });
    }

    // Call the external API
    const apiUrl = `https://uk.api.vehicledataglobal.com/r2/lookup?packageName=VehicleDetails&vrm=${encodeURIComponent(
      reg
    )}`;
    const apiKey = process.env.VEHICLE_DATA_GLOBAL_API_KEY;

    const { data } = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    // Defensive: check structure
    const vehicle = data?.Results?.VehicleDetails?.VehicleIdentification || {};

    // Map fields
    const brand = vehicle.DvlaMake || "";
    const dvlaModel = vehicle.DvlaModel || "";
    let model = dvlaModel;
    let trim = "";
    if (dvlaModel) {
      const parts = dvlaModel.trim().split(" ");
      if (parts.length > 1) {
        trim = parts[parts.length - 1];
        model = parts.slice(0, -1).join(" ");
      } else {
        trim = dvlaModel;
        model = dvlaModel;
      }
    }
    // const model = vehicle.DvlaModel || "";
    const year = vehicle.YearOfManufacture || "";
    const bodyStyle = vehicle.DvlaBodyType || "";
    const fuel = vehicle.DvlaFuelType || "";
    const gearbox = "Manual"; // Set as requested

    // Fetch brand logo from the Brand table
    const brandData = await Brand.findOne({
      where: { name: brand },
      attributes: ["logo"],
    });

    const brandLogo = brandData ? brandData.logo : null;

    // Extract trim from model (last word or meaningful suffix)
    // let trim = "";
    // if (model) {
    //   const parts = model.trim().split(" ");
    //   trim = parts.length > 1 ? parts[parts.length - 1] : model;
    // }

    res.json({
      brand,
      model,
      year,
      bodyStyle,
      trim,
      gearbox,
      fuel,
      logo: brandLogo || null,
    });
  } catch (error) {
    console.error(
      "Vehicle reg lookup failed:",
      error?.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to lookup vehicle by registration" });
  }
};

// exports.getMakes = async (req, res) => {
//   try {
//     const makes = await Brand.findAll({
//       attributes: ["name", "logo"],
//       group: ["name", "logo"],
//       order: [["name", "ASC"]],
//     });
//     res.json(makes.map((v) => ({ name: v.name, logo: v.logo })));
//   } catch (err) {
//     res.status(500).json({ error: "Failed to fetch makes" });
//   }
// };
exports.getMakes = async (req, res) => {
  try {
    // Get unique makes from Vehicle table
    const makes = await Vehicle.findAll({
      attributes: [
        [
          Vehicle.sequelize.fn("DISTINCT", Vehicle.sequelize.col("make")),
          "make",
        ],
      ],
      order: [["make", "ASC"]],
      raw: true,
    });

    const makeNames = makes.map((m) => m.make);

    // Fetch logos for these makes from Brand table
    const brands = await Brand.findAll({
      where: { name: { [Op.in]: makeNames } },
      attributes: ["name", "logo"],
      raw: true,
    });

    // Map brand logos to makes
    const brandLogoMap = {};
    brands.forEach((b) => {
      brandLogoMap[b.name.toLowerCase()] = b.logo;
    });

    // Build response: always include make, logo if present
    const result = makeNames.map((make) => ({
      name: make,
      logo: brandLogoMap[make.toLowerCase()] || null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch makes" });
  }
};

exports.getModels = async (req, res) => {
  const { make } = req.query;
  if (!make) {
    return res.status(400).json({ error: "Missing required parameter: make" });
  }
  try {
    const models = await Vehicle.findAll({
      where: { make },
      attributes: ["model"],
      group: ["model"],
      order: [["model", "ASC"]],
    });
    res.json(models.map((v) => v.model));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch models" });
  }
};

exports.getBodyStyles = async (req, res) => {
  const { make, model } = req.query;
  if (!make || !model) {
    return res
      .status(400)
      .json({ error: "Missing required parameters: make, model" });
  }
  try {
    const bodyStyles = await Vehicle.findAll({
      where: { make, model },
      attributes: ["body_style"],
      group: ["body_style"],
      order: [["body_style", "ASC"]],
    });
    res.json(bodyStyles.map((v) => v.body_style));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch body styles" });
  }
};

exports.getTrims = async (req, res) => {
  const { make, model, body_style } = req.query;
  if (!make || !model || !body_style) {
    return res
      .status(400)
      .json({ error: "Missing required parameters: make, model, body_style" });
  }
  try {
    const trims = await Vehicle.findAll({
      where: { make, model, body_style },
      attributes: ["trim"],
      group: ["trim"],
      order: [["trim", "ASC"]],
    });
    res.json(trims.map((v) => v.trim));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trims" });
  }
};

exports.getYears = async (req, res) => {
  const { make, model, body_style, trim } = req.query;
  if (!make || !model || !body_style || !trim) {
    return res.status(400).json({
      error: "Missing required parameters: make, model, body_style, trim",
    });
  }
  try {
    const years = await Vehicle.findAll({
      where: { make, model, body_style, trim },
      attributes: ["year"],
      group: ["year"],
      order: [["year", "DESC"]],
    });
    res.json(years.map((v) => v.year));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch years" });
  }
};

exports.getGearboxes = async (req, res) => {
  const { make, model, year, trim, body_style } = req.query;
  if (!make || !model || !year || !trim || !body_style) {
    return res.status(400).json({
      error: "Missing required parameters: make, model, year, trim, body_style",
    });
  }
  try {
    const gearboxes = await Vehicle.findAll({
      where: { make, model, year, trim, body_style },
      attributes: ["gearbox"],
      group: ["gearbox"],
      order: [["gearbox", "ASC"]],
    });
    res.json(gearboxes.map((v) => v.gearbox));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch gearboxes" });
  }
};

exports.getFuels = async (req, res) => {
  const { make, model, year, trim, body_style, gearbox } = req.query;
  if (!make || !model || !year || !trim || !body_style || !gearbox) {
    return res.status(400).json({
      error:
        "Missing required parameters: make, model, year, trim, body_style, gearbox",
    });
  }
  try {
    const fuels = await Vehicle.findAll({
      where: { make, model, year, trim, body_style, gearbox },
      attributes: ["fuel"],
      group: ["fuel"],
      order: [["fuel", "ASC"]],
    });
    res.json(fuels.map((v) => v.fuel));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch fuels" });
  }
};

exports.getPartsByVehicle = async (req, res) => {
  try {
    const parts = await ProductType.findAll({
      where: {
        user_id: null,
      },
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });
    res.json(parts.map((p) => p.name));
  } catch (err) {
    console.error("Error fetching all parts:", err);
    res.status(500).json({ error: "Failed to fetch parts" });
  }
};

//parts -> make/brand -> model -> body type -> trim level -> form

exports.getMakesByPart = async (req, res) => {
  const { partId } = req.query;

  try {
    const makes = await VehicleProductType.findAll({
      where: { product_type_id: partId },
      include: [
        {
          model: Vehicle,
          attributes: ["make"],
        },
      ],
      group: ["Vehicle.make"],
      order: [["Vehicle", "make", "ASC"]],
    });

    res.json(makes.map((v) => v.Vehicle.make));
  } catch (err) {
    console.error("Error fetching makes by part:", err);
    res.status(500).json({ error: "Failed to fetch makes by part" });
  }
};

exports.getModelsByPartAndMake = async (req, res) => {
  const { partId, make } = req.query;

  try {
    const models = await VehicleProductType.findAll({
      where: { product_type_id: partId },
      include: [
        {
          model: Vehicle,
          where: { make },
          attributes: ["model"],
        },
      ],
      group: ["Vehicle.model"],
      order: [["Vehicle", "model", "ASC"]],
    });

    res.json(models.map((v) => v.Vehicle.model));
  } catch (err) {
    console.error("Error fetching models by part and make:", err);
    res.status(500).json({ error: "Failed to fetch models by part and make" });
  }
};

exports.getBodyStylesByPartMakeAndModel = async (req, res) => {
  const { partId, make, model } = req.query;

  try {
    const bodyStyles = await VehicleProductType.findAll({
      where: { product_type_id: partId },
      include: [
        {
          model: Vehicle,
          where: { make, model },
          attributes: ["body_style"],
        },
      ],
      group: ["Vehicle.body_style"],
      order: [["Vehicle", "body_style", "ASC"]],
    });

    res.json(bodyStyles.map((v) => v.Vehicle.body_style));
  } catch (err) {
    console.error("Error fetching body styles by part, make, and model:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch body styles by part, make, and model" });
  }
};

exports.getTrimsByPartMakeModelAndBodyStyle = async (req, res) => {
  const { partId, make, model, body_style } = req.query;

  try {
    const trims = await VehicleProductType.findAll({
      where: { product_type_id: partId },
      include: [
        {
          model: Vehicle,
          where: { make, model, body_style },
          attributes: ["trim"],
        },
      ],
      group: ["Vehicle.trim"],
      order: [["Vehicle", "trim", "ASC"]],
    });

    res.json(trims.map((v) => v.Vehicle.trim));
  } catch (err) {
    console.error(
      "Error fetching trims by part, make, model, and body style:",
      err
    );
    res.status(500).json({
      error: "Failed to fetch trims by part, make, model, and body style",
    });
  }
};
