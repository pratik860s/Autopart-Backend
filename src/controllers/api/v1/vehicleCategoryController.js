const VehicleCategories = require("../../../models/vehicle-catagories");
const { Op } = require("sequelize");

// Get category details by categorytree or search
exports.getCategories = async (req, res) => {
  try {
    const { categorytree, search, page = 1 } = req.query;
    const pageSize = 20;
    const offset = (parseInt(page) - 1) * pageSize;

    let where = { leafcategorytreenode: "true" };
    // Fetch by categorytree (exact match)
    if (categorytree) {
      const treeParts = categorytree.split(":").map((s) => s.trim());
      where.categorytree = { [Op.iLike]: treeParts.join(":%") + "%" };
    }

    // Search by first 3+ characters (case-insensitive)
    if (search && search.length >= 3) {
      where.categoryname = { [Op.iLike]: `${search}%` };
    }

    // If neither, return top-level categories (parentcategory null)
    // if (!categorytree && !search) {
    //   where.parentcategory = { [Op.is]: null };
    // }

    const { rows, count } = await VehicleCategories.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [["categoryname", "ASC"]],
    });

    // Map DB fields to desired response format
    const mappedRows = rows.map((row) => ({
      id: row.id,
      categoryId: row.categoryid,
      categoryName: row.categoryname,
      categoryTree: row.categorytree,
      parentCategory: row.parentcategory,
      // add other fields as needed
    }));

    res.status(200).json({
      success: true,
      data: mappedRows,
      total: count,
      page: parseInt(page),
      pageSize,
      hasMore: offset + rows.length < count,
      message: "Categories fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
