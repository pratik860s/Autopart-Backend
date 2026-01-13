const ContactData = require("../../../models/contactData");

exports.createContact = async (req, res) => {
  try {
    const { name, email, phone_number, message } = req.body;

    if (!name || !email || !phone_number || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newContact = await ContactData.create({
      name,
      email,
      phone_number,
      message,
    });

    res
      .status(201)
      .json({ message: "Contact data saved successfully", data: newContact });
  } catch (error) {
    console.error("Error saving contact data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
