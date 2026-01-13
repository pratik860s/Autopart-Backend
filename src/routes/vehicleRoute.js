const express = require("express");
const router = express.Router();
const vehicleController = require("../controllers/api/v1/vehicleController");

router.get("/by-reg", vehicleController.getVehicleByReg);
router.get("/makes", vehicleController.getMakes);
router.get("/models", vehicleController.getModels);
router.get("/years", vehicleController.getYears);
router.get("/trims", vehicleController.getTrims);
router.get("/body-styles", vehicleController.getBodyStyles);
router.get("/gearboxes", vehicleController.getGearboxes);
router.get("/fuels", vehicleController.getFuels);

router.get("/parts", vehicleController.getPartsByVehicle);

//parts -> make/brand -> model -> body type -> trim level -> form
router.get("/makes-by-part", vehicleController.getMakesByPart);
router.get(
  "/models-by-part-and-make",
  vehicleController.getModelsByPartAndMake
);
router.get(
  "/body-styles-by-part-make-and-model",
  vehicleController.getBodyStylesByPartMakeAndModel
);
router.get(
  "/trims-by-part-make-model-and-body-style",
  vehicleController.getTrimsByPartMakeModelAndBodyStyle
);

module.exports = router;
