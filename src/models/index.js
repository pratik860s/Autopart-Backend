const Vehicle = require("./vehicle");
const ProductType = require("./product_type");
const VehicleProductType = require("./vehicle_product_type_mapping");
// const Enquiry = require("./enquiry");
const User = require("./user");
// const EnquiryPart = require("./enquiry_part");
const Products = require("./products");
const ProductEnquiry = require("./productEnquiry");

const Enquiries = require("./enquiries");
const EnquiryItems = require("./enquiry_items");
const Quotations = require("./quotations");
const QuotationItems = require("./quotation_items");
const Brand = require("./brands");
const Feedback = require("./feedback");
const FeedbackMessage = require("./feedback_message");
const Message = require("./message");

const SellerProductTypeConfig = require("./seller_product_type_config");
const EnquirySeller = require("./enquiry_seller_mapping");
const Serviceable_location = require("./serviceable_location");

// Vehicle <-> ProductType (Many-to-Many)
Vehicle.belongsToMany(ProductType, {
  through: VehicleProductType,
  foreignKey: "vehicle_id",
});
ProductType.belongsToMany(Vehicle, {
  through: VehicleProductType,
  foreignKey: "product_type_id",
});

// Seller <-> ProductType (Many-to-Many)
User.belongsToMany(ProductType, {
  through: SellerProductTypeConfig,
  foreignKey: "seller_id",
  otherKey: "product_type_id",
  as: "offered_product_types",
});
ProductType.belongsToMany(User, {
  through: SellerProductTypeConfig,
  foreignKey: "product_type_id",
  otherKey: "seller_id",
  as: "sellers",
});

ProductType.belongsTo(User, { foreignKey: "user_id", as: "custom_creator" });
User.hasMany(ProductType, {
  foreignKey: "user_id",
  as: "custom_product_types",
});

// Enquiry <-> EnquirySeller (Many-to-Many: which sellers get which enquiry)
Enquiries.belongsToMany(User, {
  through: EnquirySeller,
  foreignKey: "enquiry_id",
  otherKey: "seller_id",
  as: "enquiry_sellers",
});
User.belongsToMany(Enquiries, {
  through: EnquirySeller,
  foreignKey: "seller_id",
  otherKey: "enquiry_id",
  as: "seller_enquiries",
});

Enquiries.belongsTo(Vehicle, { foreignKey: "vehicle_id" });
Vehicle.hasMany(Enquiries, { foreignKey: "vehicle_id" });

EnquirySeller.belongsTo(Enquiries, { foreignKey: "enquiry_id" });
EnquirySeller.belongsTo(User, { foreignKey: "seller_id" });

// Enquiry -> Vehicle
// Enquiry.belongsTo(Vehicle, { foreignKey: "vehicle_id" });
// Vehicle.hasMany(Enquiry, { foreignKey: "vehicle_id" });

// // Enquiry -> UserEnquiry
// Enquiry.belongsTo(User, { foreignKey: "buyer_id" });
// User.hasMany(Enquiry, { foreignKey: "buyer_id" });

// // Enquiry -> EnquiryPart (One-to-Many)
// Enquiry.hasMany(EnquiryPart, { foreignKey: "enquiry_id" });
// EnquiryPart.belongsTo(Enquiry, { foreignKey: "enquiry_id" });

// // EnquiryPart -> ProductType (Each part has a product type)
// EnquiryPart.belongsTo(ProductType, { foreignKey: "product_type_id" });
// ProductType.hasMany(EnquiryPart, { foreignKey: "product_type_id" });

Products.belongsToMany(Vehicle, {
  through: "product_vehicle_mapping",
  foreignKey: "product_id",
});
Vehicle.belongsToMany(Products, {
  through: "product_vehicle_mapping",
  foreignKey: "vehicle_id",
});

Products.belongsToMany(ProductType, {
  through: "vehicle_product_type_mapping",
  foreignKey: "product_id",
});

ProductEnquiry.belongsTo(Products, { foreignKey: "product_id" });
ProductEnquiry.belongsTo(User, { foreignKey: "user_id" });

// Optionally, if you want reverse associations:
Products.hasMany(ProductEnquiry, { foreignKey: "product_id" });
User.hasMany(ProductEnquiry, { foreignKey: "user_id" });

Enquiries.hasMany(EnquiryItems, { foreignKey: "enquiry_id" });
EnquiryItems.belongsTo(Enquiries, { foreignKey: "enquiry_id" });

EnquiryItems.belongsTo(ProductType, { foreignKey: "product_type_id" });
ProductType.hasMany(EnquiryItems, { foreignKey: "product_type_id" });

Enquiries.belongsTo(User, { foreignKey: "buyer_id", as: "buyer" });
User.hasMany(Enquiries, { foreignKey: "buyer_id" });

// EnquiryItems.belongsTo(Products, { foreignKey: "product_id" });
// Products.hasMany(EnquiryItems, { foreignKey: "product_id" });

Quotations.belongsTo(Enquiries, { foreignKey: "enquiry_id" });
Enquiries.hasMany(Quotations, { foreignKey: "enquiry_id" });

Quotations.hasMany(QuotationItems, { foreignKey: "quotation_id" });
QuotationItems.belongsTo(Quotations, { foreignKey: "quotation_id" });

Quotations.belongsTo(User, { foreignKey: "seller_id", as: "seller" });
User.hasMany(Quotations, { foreignKey: "seller_id", as: "quotations" });

QuotationItems.belongsTo(EnquiryItems, { foreignKey: "enquiry_item_id" });
EnquiryItems.hasMany(QuotationItems, { foreignKey: "enquiry_item_id" });
// Feedback -> User (Many-to-One)
Feedback.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(Feedback, { foreignKey: "user_id", as: "feedbacks" });

Feedback.hasMany(FeedbackMessage, {
  foreignKey: "feedback_id",
  as: "messages",
});
FeedbackMessage.belongsTo(Feedback, { foreignKey: "feedback_id" });

// In models/index.js (add after User and Message are defined)
Message.belongsTo(User, { foreignKey: "sender_id", as: "sender" });
Message.belongsTo(User, { foreignKey: "receiver_id", as: "receiver" });
User.hasMany(Message, { foreignKey: "sender_id", as: "sent_messages" });
User.hasMany(Message, { foreignKey: "receiver_id", as: "received_messages" });

module.exports = {
  Brand,
  Vehicle,
  ProductType,
  VehicleProductType,
  // Enquiry,
  User,
  // EnquiryPart,
  Serviceable_location,
  Products,
  Enquiries,
  EnquiryItems,
  Quotations,
  QuotationItems,
  SellerProductTypeConfig,
  EnquirySeller,
  Feedback,
  Message,
};

// const Products = require("./products");
// const Vehicle = require("./vehicle");
// const ProductVehicleMapping = require("./product_vehicle_mapping");

// // Define the many-to-many relationship
// Products.belongsToMany(Vehicle, {
//   through: ProductVehicleMapping,
//   foreignKey: "product_id",
//   otherKey: "vehicle_id",
// });

// Vehicle.belongsToMany(Products, {
//   through: ProductVehicleMapping,
//   foreignKey: "vehicle_id",
//   otherKey: "product_id",
// });
