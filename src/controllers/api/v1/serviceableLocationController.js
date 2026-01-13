const Serviceable_location = require("../../../models/serviceable_location");

exports.create = async (req, res) => {
  const { state, country, serviceable } = req.body;
  try {
    const location = await Serviceable_location.create({
      state,
      country,
      serviceable,
    });
    res.status(201).json(location);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.checkServiceable = async (req, res) => {
  const { state, country } = req.body;
  if (!state || !country) {
    return res.status(400).json({ error: "State and country are required." });
  }
  try {
    const location = await Serviceable_location.findOne({
      where: { state, country, serviceable: true },
    });
    if (location) {
      return res.json({ serviceable: true });
    } else {
      return res.json({ serviceable: false });
    }
  } catch (err) {
    console.error("ServiceableLocation error:", err); // <--- ADD THIS LINE
    return res.status(500).json({ error: "Server error." });
  }
};
