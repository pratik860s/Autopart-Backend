const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const sequelize = require("./src/configs/db").sequelize;
const Vehicle = require("./src/models/vehicle");

const BASE_URL = "https://www.1stchoice.co.uk/api/parts";
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const SKIPPED_MAKES = new Set([
  "AC",
  "Abarth",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Austin",
  "BMW",
  "BYD",
  "Bedford",
  "Bentley",
  "Cadillac",
  "Chrysler",
  "Chevrolet",
  "Citroen",
  "Cupra",
  "DFSK",
  "DS",
  "Dacia",
  "Daewoo",
  "Daihatsu",
  "Daimler",
  "Dodge",
  "Ferrari",
  "Fiat",
  "Ford",
  "Genesis",
  "Great Wall",
  "HILLMAN",
  "Honda",
  "Hyundai",
  "INEOS",
  "Infiniti",
  "Isuzu",
  "Iveco",
  "Jaguar",
  "Jeep",
  "KGM",
  "Kia",
  "LDV",
  "Lamborghini",
  "Land Rover",
  "Lexus",
  "Lotus",
  "MG",
  "Maxus",
  "Maybach",
  "Mazda",
  "Mercedes-Benz",
  "Microcar",
  "Mini",
  "Mitsubishi",
  "Morgan",
  //   "Maserati",
  "Nissan",
  "Noble",
  "Omoda",
  "Opel",
  "Peugeot",
  "Peugeot Talbot",
  "Piaggio",
  "Polestar",
  "Porsche",
  "Proton",
  "Reliant",
  "Renault",
  "Tesla",
  "Toyota",
  "Volkswagen",
]);

async function fetchJSON(url) {
  try {
    const res = await axios.get(url);
    return res.data;
  } catch (err) {
    console.warn(`⚠️ Failed to fetch: ${url}`);
    return null;
  }
}

async function fetchMakesAndModels() {
  return await fetchJSON(`${BASE_URL}/makes-and-models`);
}
async function fetchBodyStyles(modelId) {
  return await fetchJSON(`${BASE_URL}/body-styles/${modelId}`);
}
async function fetchTrims(modelId, bodyStyleId) {
  return await fetchJSON(`${BASE_URL}/trims/${modelId}/${bodyStyleId}`);
}
async function fetchYears(modelId, bodyStyleId, trimId) {
  return await fetchJSON(
    `${BASE_URL}/years/${modelId}/${bodyStyleId}/${trimId}`
  );
}

async function main() {
  const makes = await fetchMakesAndModels();
  const seenVehicles = new Set();

  for (const make of makes) {
    if (SKIPPED_MAKES.has(make.name)) {
      console.log(`⏭️ Skipping already inserted make: ${make.name}`);
      continue;
    }

    const allData = [];
    let insertedCount = 0;

    for (const model of make.models || []) {
      const bodyStyles = await fetchBodyStyles(model.id);
      if (!bodyStyles?.length) {
        console.warn(`❌ No body styles for ${make.name} ${model.name}`);
        continue;
      }

      for (const bodyStyle of bodyStyles) {
        const trims = await fetchTrims(model.id, bodyStyle.id);
        if (!trims?.length) {
          console.warn(`❌ No trims for ${make.name} ${model.name}`);
          continue;
        }

        for (const trim of trims) {
          const years = await fetchYears(model.id, bodyStyle.id, trim.id);
          if (!years?.length) {
            console.warn(
              `❌ No years for ${make.name} ${model.name} ${trim.name}`
            );
            continue;
          }

          const gearboxes = ["Manual", "Automatic"];
          const fuels = ["Petrol", "Diesel", "LPG", "Electric"];

          for (const year of years) {
            for (const gearbox of gearboxes) {
              for (const fuel of fuels) {
                const key = `${make.name}|${model.name}|${year.name}|${bodyStyle.name}|${trim.name}|${gearbox}|${fuel}`;

                if (seenVehicles.has(key)) {
                  console.log(`⚠️ Duplicate skipped: ${key}`);
                  continue;
                }

                seenVehicles.add(key);

                allData.push({
                  make: make.name,
                  model: model.name,
                  year: parseInt(year.name),
                  body_style: bodyStyle.name,
                  trim: trim.name,
                  gearbox,
                  fuel,
                });

                insertedCount++;
                console.log(`✅ ${key}`);
                await delay(10);
              }
            }
          }
        }
      }

      await delay(100); // small delay between models
    }

    if (insertedCount === 0) {
      console.log(`⚠️ No data inserted for make: ${make.name}`);
      continue;
    }

    // Insert only if data was found
    try {
      await sequelize.authenticate();
      console.log(`💾 Inserting ${allData.length} records for ${make.name}...`);
      await Vehicle.bulkCreate(allData, { ignoreDuplicates: true });
      console.log(`✅ Inserted ${make.name} vehicles.\n`);
    } catch (err) {
      console.error(`❌ DB Insert error for ${make.name}:`, err);
    }
  }

  await sequelize.close();
}

main();

// const axios = require("axios");
// const dotenv = require("dotenv");
// dotenv.config();

// const sequelize = require("./src/configs/db").sequelize;
// const Vehicle = require("./src/models/vehicle");

// const BASE_URL = "https://www.1stchoice.co.uk/api/parts";
// const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// const rest_makes = ["Tata"];

// async function fetchJSON(url) {
//   try {
//     const res = await axios.get(url);
//     return res.data;
//   } catch (err) {
//     console.warn(`⚠️ Failed to fetch: ${url}`);
//     return null;
//   }
// }

// async function fetchMakesAndModels() {
//   return await fetchJSON(`${BASE_URL}/makes-and-models`);
// }
// async function fetchBodyStyles(modelId) {
//   return await fetchJSON(`${BASE_URL}/body-styles/${modelId}`);
// }
// async function fetchTrims(modelId, bodyStyleId) {
//   return await fetchJSON(`${BASE_URL}/trims/${modelId}/${bodyStyleId}`);
// }
// async function fetchYears(modelId, bodyStyleId, trimId) {
//   return await fetchJSON(
//     `${BASE_URL}/years/${modelId}/${bodyStyleId}/${trimId}`
//   );
// }

// async function main() {
//   const allMakes = await fetchMakesAndModels();
//   const seenVehicles = new Set();

//   const filteredMakes =
//     allMakes?.filter((make) => rest_makes.includes(make.name)) || [];

//   for (const make of filteredMakes) {
//     const allData = [];
//     let insertedCount = 0;

//     for (const model of make.models || []) {
//       const bodyStyles = await fetchBodyStyles(model.id);
//       if (!bodyStyles?.length) {
//         console.warn(`❌ No body styles for ${make.name} ${model.name}`);
//         continue;
//       }

//       for (const bodyStyle of bodyStyles) {
//         const trims = await fetchTrims(model.id, bodyStyle.id);
//         if (!trims?.length) {
//           console.warn(`❌ No trims for ${make.name} ${model.name}`);
//           continue;
//         }

//         for (const trim of trims) {
//           const years = await fetchYears(model.id, bodyStyle.id, trim.id);
//           if (!years?.length) {
//             console.warn(
//               `❌ No years for ${make.name} ${model.name} ${trim.name}`
//             );
//             continue;
//           }

//           const gearboxes = ["Manual", "Automatic"];
//           const fuels = ["Petrol", "Diesel", "LPG", "Electric"];

//           for (const year of years) {
//             for (const gearbox of gearboxes) {
//               for (const fuel of fuels) {
//                 const key = `${make.name}|${model.name}|${year.name}|${bodyStyle.name}|${trim.name}|${gearbox}|${fuel}`;

//                 if (seenVehicles.has(key)) {
//                   console.log(`⚠️ Duplicate skipped: ${key}`);
//                   continue;
//                 }

//                 seenVehicles.add(key);

//                 allData.push({
//                   make: make.name,
//                   model: model.name,
//                   year: parseInt(year.name),
//                   body_style: bodyStyle.name,
//                   trim: trim.name,
//                   gearbox,
//                   fuel,
//                 });

//                 insertedCount++;
//                 console.log(`✅ ${key}`);
//                 await delay(10);
//               }
//             }
//           }
//         }
//       }

//       await delay(100); // small delay between models
//     }

//     if (insertedCount === 0) {
//       console.log(`⚠️ No data inserted for make: ${make.name}`);
//       continue;
//     }

//     try {
//       await sequelize.authenticate();
//       console.log(`💾 Inserting ${allData.length} records for ${make.name}...`);
//       await Vehicle.bulkCreate(allData, { ignoreDuplicates: true });
//       console.log(`✅ Inserted ${make.name} vehicles.\n`);
//     } catch (err) {
//       console.error(`❌ DB Insert error for ${make.name}:`, err);
//     }
//   }

//   await sequelize.close();
// }

// main();
