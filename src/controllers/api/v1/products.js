const Products = require("../../../models/products");
const User = require("../../../models/user");
const { Op, fn, col, where } = require("sequelize");
const Brand = require("../../../models/brands");
const Vehicle = require("../../../models/vehicle");
const ProductType = require("../../../models/product_type");
const { uploadToS3 } = require("../../../services/s3Service");
const VehicleProductType = require("../../../models/vehicle_product_type_mapping");
const ProductVehicleMapping = require("../../../models/product_vehicle_mapping");
const EnquiryItems = require("../../../models/enquiry_items");

function toArray(param) {
  if (Array.isArray(param)) return param.filter(Boolean);
  if (typeof param === "string" && param.length > 0) {
    return param.includes(",") ? param.split(",").filter(Boolean) : [param];
  }
  return [];
}

// exports.GetAllProducts = async (req, res) => {
//   try {
//     const { page = 1, limit = 10 } = req.query;
//     const offset = (page - 1) * limit;

//     const products = await Products.findAndCountAll({
//       limit: parseInt(limit),
//       offset: parseInt(offset),
//       // order: [["createdAt", "DESC"]],
//     });

//     return res.status(200).json({
//       status: "success",
//       data: products,
//     });
//   } catch (error) {
//     console.error("Error fetching products:", error);
//     return res.status(500).json({
//       status: "error",
//       message: "Internal server error",
//     });
//   }
// };

exports.GetAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Fetch products with pagination
    const { rows: products, count } = await Products.findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    // Get all user_ids and product_ids from the products
    const userIds = products.map((p) => p.user_id);
    const productIds = products.map((p) => p.id);

    // Fetch all users in one go
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ["id", "company_name"],
      raw: true,
    });
    const userMap = {};
    users.forEach((u) => {
      userMap[u.id] = u.company_name;
    });

    // Fetch all product_vehicle_mappings for these products
    const productVehicleMappings = await ProductVehicleMapping.findAll({
      where: { product_id: productIds },
      attributes: ["product_id", "vehicle_id"],
      raw: true,
    });

    // Map product_id to vehicle_ids
    const productToVehicleIds = {};
    productVehicleMappings.forEach((m) => {
      if (!productToVehicleIds[m.product_id])
        productToVehicleIds[m.product_id] = [];
      productToVehicleIds[m.product_id].push(m.vehicle_id);
    });

    // Get all unique vehicle_ids
    const allVehicleIds = [
      ...new Set(productVehicleMappings.map((m) => m.vehicle_id)),
    ];

    // Fetch all vehicles in one go
    const vehicles = await Vehicle.findAll({
      where: { id: allVehicleIds },
      raw: true,
    });
    const vehicleMap = {};
    vehicles.forEach((v) => {
      vehicleMap[v.id] = v;
    });

    // Build the response
    const result = products.map((product) => ({
      id: product.id,
      title: product.title,
      currency: product.currency,
      price: product.price,
      images: product.images,
      company_name: userMap[product.user_id] || null,
      vehicles: (productToVehicleIds[product.id] || []).map(
        (vehicleId) => vehicleMap[vehicleId]
      ),
    }));

    return res.status(200).json({
      status: "success",
      data: {
        count,
        products: result,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch product by ID
    const product = await Products.findOne({ where: { id } });
    if (!product) {
      return res
        .status(404)
        .json({ status: "error", message: "Product not found" });
    }

    // Fetch seller details
    const seller = await User.findOne({
      where: { id: product.user_id },
      attributes: [
        "id",
        "name",
        "email",
        "company_name",
        "phone_number",
        "country",
        "city",
        "address",
        "logo",
        "type",
        "status",
        "is_verified",
      ],
    });

    return res.status(200).json({
      status: "success",
      data: {
        product,
        seller,
      },
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.getProductsBySeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Fetch products for the given seller with pagination
    const { rows: products, count } = await Products.findAndCountAll({
      where: { user_id: sellerId },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    if (!products.length) {
      return res.status(200).json({
        status: "success",
        data: {
          count: 0,
          products: [],
        },
      });
    }

    // Fetch seller details (company_name)
    const seller = await User.findOne({
      where: { id: sellerId },
      attributes: [
        "id",
        "name",
        "email",
        "company_name",
        "phone_number",
        "country",
        "city",
        "zip_code",
        "vat_number",
        "address",
        "logo",
        "type",
        "status",
        "is_verified",
        "registration_number",
        "establishment_year",
        "company_description",
        "legal_status",
        "country",
      ],
      raw: true,
    });

    // Get all product IDs
    const productIds = products.map((p) => p.id);

    // Fetch all product_vehicle_mappings for these products
    const productVehicleMappings = await ProductVehicleMapping.findAll({
      where: { product_id: productIds },
      attributes: ["product_id", "vehicle_id"],
      raw: true,
    });

    // Map product_id to vehicle_ids
    const productToVehicleIds = {};
    productVehicleMappings.forEach((m) => {
      if (!productToVehicleIds[m.product_id])
        productToVehicleIds[m.product_id] = [];
      productToVehicleIds[m.product_id].push(m.vehicle_id);
    });

    // Get all unique vehicle_ids
    const allVehicleIds = [
      ...new Set(productVehicleMappings.map((m) => m.vehicle_id)),
    ];

    // Fetch all vehicles in one go
    const vehicles = await Vehicle.findAll({
      where: { id: allVehicleIds },
      raw: true,
    });
    const vehicleMap = {};
    vehicles.forEach((v) => {
      vehicleMap[v.id] = v;
    });

    // Build the response
    const result = products.map((product) => ({
      id: product.id,
      title: product.title,
      currency: product.currency,
      price: product.price,
      images: product.images,
      company_name: seller ? seller.company_name : null,
      vehicles: (productToVehicleIds[product.id] || []).map(
        (vehicleId) => vehicleMap[vehicleId]
      ),
    }));

    return res.status(200).json({
      status: "success",
      data: {
        count,
        products: result,
        seller,
      },
    });
  } catch (error) {
    console.error("Error fetching seller's products:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// exports.getBrand = async (req, res) => {
//   try {
//     const brand = await Brand.findAll({
//       attributes: ["name", "logo"],
//       group: ["name", "logo"],
//       order: [["name", "ASC"]],
//     });
//     res.json(brand.map((v) => ({ name: v.name, logo: v.logo })));
//   } catch (err) {
//     res.status(500).json({ error: "Failed to fetch brands" });
//   }
// };
exports.getBrand = async (req, res) => {
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
  const brandsParam =
    req.query.brand || req.query.brands || req.query["brands[]"];
  const brandsArray = toArray(brandsParam);
  try {
    const models = await Vehicle.findAll({
      where: {
        make: { [Op.in]: brandsArray },
      },
      attributes: ["model"],
      group: ["model"],
      order: [["model", "ASC"]],
    });
    res.json(models.map((v) => v.model));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch models" });
  }
};

exports.getBodyTypes = async (req, res) => {
  const { brand } = req.query;
  // Support both models and models[]
  const brandsParam =
    req.query.brand || req.query.brands || req.query["brands[]"];
  const brandsArray = toArray(brandsParam);
  const modelsParam = req.query.models || req.query["models[]"];
  const modelsArray = toArray(modelsParam);

  if (!brandsArray.length || !modelsArray.length) {
    return res.status(400).json({ error: "brands and models are required" });
  }

  try {
    const bodyStyles = await Vehicle.findAll({
      where: {
        [Op.and]: [
          where(fn("LOWER", col("make")), {
            [Op.in]: brandsArray.map((b) => b.toLowerCase()),
          }),
          where(fn("LOWER", col("model")), {
            [Op.in]: modelsArray.map((m) => m.toLowerCase()),
          }),
        ],
      },
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
  const brandsParam =
    req.query.brand || req.query.brands || req.query["brands[]"];
  const brandsArray = toArray(brandsParam);
  const modelsParam = req.query.models || req.query["models[]"];
  const bodyStylesParam = req.query.body_styles || req.query["body_styles[]"];
  const modelsArray = toArray(modelsParam);
  const bodyStylesArray = toArray(bodyStylesParam);

  try {
    const trims = await Vehicle.findAll({
      where: {
        make: { [Op.in]: brandsArray },
        model: { [Op.in]: modelsArray },
        body_style: { [Op.in]: bodyStylesArray },
      },
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
  const brandsParam =
    req.query.brand || req.query.brands || req.query["brands[]"];
  const brandsArray = toArray(brandsParam);
  const modelsParam = req.query.models || req.query["models[]"];
  const bodyStylesParam = req.query.body_styles || req.query["body_styles[]"];
  const trimsParam = req.query.trims || req.query["trims[]"];
  const modelsArray = toArray(modelsParam);
  const bodyStylesArray = toArray(bodyStylesParam);
  const trimsArray = toArray(trimsParam);

  try {
    const years = await Vehicle.findAll({
      where: {
        [Op.and]: [
          where(fn("LOWER", col("make")), {
            [Op.in]: brandsArray.map((b) => b.toLowerCase()),
          }),
          where(fn("LOWER", col("model")), {
            [Op.in]: modelsArray.map((m) => m.toLowerCase()),
          }),
          where(fn("LOWER", col("body_style")), {
            [Op.in]: bodyStylesArray.map((b) => b.toLowerCase()),
          }),
          where(fn("LOWER", col("trim")), {
            [Op.in]: trimsArray.map((t) => t.toLowerCase()),
          }),
        ],
      },
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
  const brandsParam =
    req.query.brand || req.query.brands || req.query["brands[]"];
  const brandsArray = toArray(brandsParam);
  const modelsParam = req.query.models || req.query["models[]"];
  const bodyStylesParam = req.query.body_styles || req.query["body_styles[]"];
  const trimsParam = req.query.trims || req.query["trims[]"];
  const yearsParam = req.query.years || req.query["years[]"];
  const modelsArray = toArray(modelsParam);
  const bodyStylesArray = toArray(bodyStylesParam);
  const trimsArray = toArray(trimsParam);
  const yearsArray = toArray(yearsParam);

  try {
    const gearboxes = await Vehicle.findAll({
      where: {
        make: { [Op.in]: brandsArray },
        model: { [Op.in]: modelsArray },
        body_style: { [Op.in]: bodyStylesArray },
        trim: { [Op.in]: trimsArray },
        year: { [Op.in]: yearsArray },
      },
      attributes: ["gearbox"],
      group: ["gearbox"],
      order: [["gearbox", "ASC"]],
    });
    res.json(gearboxes.map((v) => v.gearbox));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch gearbox" });
  }
};

exports.getFuels = async (req, res) => {
  const brandsParam =
    req.query.brand || req.query.brands || req.query["brands[]"];
  const brandsArray = toArray(brandsParam);
  const modelsParam = req.query.models || req.query["models[]"];
  const bodyStylesParam = req.query.body_styles || req.query["body_styles[]"];
  const trimsParam = req.query.trims || req.query["trims[]"];
  const yearsParam = req.query.years || req.query["years[]"];
  const gearboxesParam = req.query.gearboxes || req.query["gearboxes[]"];
  const modelsArray = toArray(modelsParam);
  const bodyStylesArray = toArray(bodyStylesParam);
  const trimsArray = toArray(trimsParam);
  const yearsArray = toArray(yearsParam);
  const gearboxesArray = toArray(gearboxesParam);

  try {
    const fuels = await Vehicle.findAll({
      where: {
        make: { [Op.in]: brandsArray },
        model: { [Op.in]: modelsArray },
        body_style: { [Op.in]: bodyStylesArray },
        trim: { [Op.in]: trimsArray },
        year: { [Op.in]: yearsArray },
        gearbox: { [Op.in]: gearboxesArray },
      },
      attributes: ["fuel"],
      group: ["fuel"],
      order: [["fuel", "ASC"]],
    });
    res.json(fuels.map((v) => v.fuel));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch fuel" });
  }
};

exports.getParts = async (req, res) => {
  const brandsParam =
    req.query.brand || req.query.brands || req.query["brands[]"];
  const brandsArray = toArray(brandsParam);
  const modelsParam = req.query.models || req.query["models[]"];
  const bodyTypesParam = req.query.body_types || req.query["body_types[]"];
  const trimsParam = req.query.trims || req.query["trims[]"];
  const yearsParam = req.query.years || req.query["years[]"];
  const gearboxesParam = req.query.gearboxes || req.query["gearboxes[]"];
  const fuelsParam = req.query.fuels || req.query["fuels[]"];
  const models = toArray(modelsParam);
  const body_types = toArray(bodyTypesParam);
  const trims = toArray(trimsParam);
  const years = toArray(yearsParam);
  const gearboxes = toArray(gearboxesParam);
  const fuels = toArray(fuelsParam);

  try {
    // Find all matching vehicles based on the provided filters
    const vehicles = await Vehicle.findAll({
      where: {
        make: { [Op.in]: brandsArray },
        model: { [Op.in]: models },
        body_style: { [Op.in]: body_types },
        trim: { [Op.in]: trims },
        year: { [Op.in]: years },
        gearbox: { [Op.in]: gearboxes },
        fuel: { [Op.in]: fuels },
      },
      attributes: ["id"],
    });

    if (!vehicles.length) {
      return res
        .status(404)
        .json({ error: "No vehicles found for the given criteria" });
    }

    const vehicleIds = vehicles.map((v) => v.id);

    // Find all product type IDs associated with the vehicle IDs
    const vehicleProductMappings = await VehicleProductType.findAll({
      where: {
        vehicle_id: { [Op.in]: vehicleIds },
      },
      attributes: ["product_type_id"],
      group: ["product_type_id"],
    });

    if (!vehicleProductMappings.length) {
      return res
        .status(404)
        .json({ error: "No product types found for the selected vehicles" });
    }

    const productTypeIds = vehicleProductMappings.map(
      (mapping) => mapping.product_type_id
    );

    //Fetch all product types based on the product type IDs
    const productTypes = await ProductType.findAll({
      where: {
        id: { [Op.in]: productTypeIds },
      },
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });

    res.json(productTypes);
  } catch (err) {
    console.error("Error fetching parts:", err);
    res.status(500).json({ error: "Failed to fetch parts" });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const {
      user_id,
      product_name,
      description,
      quantity,
      sku,
      price,
      currency,
      variant,
      images,
      compatibilities,
    } = req.body;

    // Generate product title
    //const title = `${brand} ${year} ${model} ${trim} ${body_style} ${gearbox} ${fuel} ${part_name}`;
    title = product_name;

    let imageUrls = Array.isArray(images) ? images : [];

    // Get the first user from DB for user_id (for testing)
    const user = await User.findOne();
    if (!user) {
      return res.status(400).json({
        message: "No users found in database. Please register a user first.",
      });
    }
    //const resolvedUserId = user.id;

    // Create product
    const product = await Products.create({
      title,
      description,
      quantity,
      images: imageUrls,
      user_id: user_id || user.id, // Use provided user_id or fallback to first user
      is_verified: false,
      sku,
      price,
      currency,
      variant: variant || "Default",
    });

    if (Array.isArray(compatibilities)) {
      for (const comp of compatibilities) {
        const vehicle = await Vehicle.findOne({
          where: {
            make: comp.brand,
            model: comp.model,
            year: comp.year,
            body_style: comp.body_style,
            trim: comp.trim,
            gearbox: comp.gearbox,
            fuel: comp.fuel,
          },
        });
        if (vehicle) {
          await ProductVehicleMapping.create({
            product_id: product.id,
            vehicle_id: vehicle.id,
          });
        }
      }
    }

    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    if (
      error.name === "SequelizeUniqueConstraintError" &&
      error.errors.some((e) => e.path === "sku")
    ) {
      return res
        .status(400)
        .json({ message: "SKU must be unique. This SKU already exists." });
    }
    console.error("Error adding product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// GET /api/products/compatibility
exports.getProductCompatibility = async (req, res) => {
  try {
    // Find all vehicles that are mapped to products
    const vehicleMappings = await ProductVehicleMapping.findAll({
      attributes: ["vehicle_id"],
      group: ["vehicle_id"],
    });
    const vehicleIds = vehicleMappings.map((m) => m.vehicle_id);

    if (!vehicleIds.length) {
      return res.status(200).json({
        makes: [],
        models: [],
        body_styles: [],
        trims: [],
        years: [],
        gearboxes: [],
        fuels: [],
      });
    }

    // Fetch all relevant vehicle details
    const vehicles = await Vehicle.findAll({
      where: { id: { [Op.in]: vehicleIds } },
      attributes: [
        "make",
        "model",
        "body_style",
        "trim",
        "year",
        "gearbox",
        "fuel",
      ],
    });

    // Extract unique values for each attribute
    const makes = Array.from(
      new Set(vehicles.map((v) => v.make).filter(Boolean))
    );
    const models = Array.from(
      new Set(vehicles.map((v) => v.model).filter(Boolean))
    );
    const body_styles = Array.from(
      new Set(vehicles.map((v) => v.body_style).filter(Boolean))
    );
    const trims = Array.from(
      new Set(vehicles.map((v) => v.trim).filter(Boolean))
    );
    const years = Array.from(
      new Set(vehicles.map((v) => v.year).filter(Boolean))
    );
    const gearboxes = Array.from(
      new Set(vehicles.map((v) => v.gearbox).filter(Boolean))
    );
    const fuels = Array.from(
      new Set(vehicles.map((v) => v.fuel).filter(Boolean))
    );

    res.status(200).json({
      makes,
      models,
      body_styles,
      trims,
      years,
      gearboxes,
      fuels,
    });
  } catch (error) {
    console.error("Error fetching product compatibility:", error);
    res.status(500).json({ error: "Failed to fetch product compatibility" });
  }
};

// GET /api/products/my-products
exports.getMyProducts = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Fetch all products for this seller
    const products = await Products.findAll({
      where: { user_id: sellerId },
      attributes: ["id", "title", "price", "createdAt", "status", "images"],
      order: [["createdAt", "DESC"]],
    });

    // Get all product IDs
    const productIds = products.map((p) => p.id);

    // Get all product_type_ids for these products via product_vehicle_mapping
    const productVehicleMappings = await ProductVehicleMapping.findAll({
      where: { product_id: { [Op.in]: productIds } },
      attributes: ["product_id", "vehicle_id"],
    });

    // Map product_id to product_type_ids (via vehicle -> product_type)
    // First, get all vehicle_ids
    const vehicleIds = productVehicleMappings.map((m) => m.vehicle_id);

    // Get all product_type_ids for these vehicles
    const vehicleProductTypes =
      await require("../../../models/vehicle_product_type_mapping").findAll({
        where: { vehicle_id: { [Op.in]: vehicleIds } },
        attributes: ["vehicle_id", "product_type_id"],
      });

    // Build a map: product_id -> Set of product_type_ids
    const productIdToProductTypeIds = {};
    productVehicleMappings.forEach((mapping) => {
      const types = vehicleProductTypes
        .filter((vpt) => vpt.vehicle_id === mapping.vehicle_id)
        .map((vpt) => vpt.product_type_id);
      if (!productIdToProductTypeIds[mapping.product_id]) {
        productIdToProductTypeIds[mapping.product_id] = new Set();
      }
      types.forEach((typeId) =>
        productIdToProductTypeIds[mapping.product_id].add(typeId)
      );
    });

    // For each product, count enquiry_items whose product_type_id matches
    const response = [];
    for (const product of products) {
      const plainProduct = product.toJSON ? product.toJSON() : product; // Ensure we have a plain object
      const typeIds = Array.from(
        productIdToProductTypeIds[plainProduct.id] || []
      );
      let enquiryCount = 0;
      if (typeIds.length > 0) {
        enquiryCount = await EnquiryItems.count({
          where: { product_type_id: { [Op.in]: typeIds } },
        });
      }
      response.push({
        id: plainProduct.id,
        images: plainProduct.images || [],
        title: plainProduct.title,
        price: plainProduct.price,
        date: plainProduct.createdAt,
        status: plainProduct.status,
        enquiry_items_count: enquiryCount,
      });
    }

    res.json({ products: response });
  } catch (err) {
    console.error("Error in getMyProducts:", err);
    res.status(500).json({ error: "Failed to fetch seller products" });
  }
};
