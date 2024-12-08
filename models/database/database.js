const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('user_management', 'user_management', 'user_management', {
    host: 'localhost', 
    dialect: 'postgres', 
    port: 5432,
    logging: false,
});

module.exports = sequelize;
