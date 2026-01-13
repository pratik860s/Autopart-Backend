const VehicleCatagories = require("../../../models/vehicle-catagories");

exports.CreateCatalogue = async (req, res) => {
  try {
    function extractLeafCategories(node, categoryName, parentCategory) {
      let arr = [];
      if (node.childCategoryTreeNodes) {
        node.childCategoryTreeNodes.forEach((child) => {
          let leafNode = child.leafCategoryTreeNode ? "true" : "false"; // Convert to string
          let data = {
            categoryid: child.category.categoryId,
            categoryname: child.category.categoryName,
            categorytree: `${categoryName} ${child.category.categoryName}`,
            parentcategory: parentCategory ?? null,
            leafcategorytreenode: leafNode,
            created_at: new Date(), // Add current timestamp
          };
          arr.push(data);
          arr = arr.concat(
            extractLeafCategories(
              child,
              `${categoryName}:${child.category.categoryName}`,
              child.category.categoryId
            )
          );
        });
      }
      return arr;
    }

    // Starting from the root node
    let rootCategoryNode = req.body.rootCategoryNode;
    let categoryName = rootCategoryNode.category.categoryName;
    let rootCategory = rootCategoryNode.childCategoryTreeNodes;
    let arr = [];

    // Extract leaf categories from the root
    rootCategory.forEach((item) => {
      let data = {
        categoryid: item.category.categoryId,
        categoryname: item.category.categoryName,
        categorytree: item.category.categoryName,
        parentcategory: rootCategoryNode.category.categoryId ?? null,
        leafcategorytreenode: item.leafCategoryTreeNode ? "true" : "false", // Convert to string
        created_at: new Date(), // Add current timestamp
      };
      arr.push(data);
      arr = arr.concat(
        extractLeafCategories(
          item,
          item.category.categoryName,
          item.category.categoryId
        )
      );
    });

    // Store data in the database
    await Promise.all(arr.map((item) => VehicleCatagories.create(item)));

    return res.status(200).json({
      success: true,
      status: 200,
      data: arr.length,
      message: "",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: err.message,
    });
  }
};