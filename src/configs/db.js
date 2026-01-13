const { Sequelize } = require("sequelize");
const pg = require("pg"); // 👈 THIS IS THE KEY FIX

let sequelize;

function getSequelize() {
  if (!sequelize) {
    sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USERNAME,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        dialect: "postgres",
        dialectModule: pg, // 👈 FORCE Sequelize to use pg
        logging: false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      }
    );
  }
  return sequelize;
}

module.exports = { getSequelize };
