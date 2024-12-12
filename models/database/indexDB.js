const sequelize = require('./database.js');
const { DataTypes } = require('sequelize');

const User = require('./users.js');
const Progress = require('./progress.js');

User.hasMany(Progress, {foreignKey: 'idUser', sourceKey: 'id'});
Progress.belongsTo(User, {foreignKey: 'idUser', sourceKey: 'id'});

module.exports = {
    sequelize,
    User,
    Progress
}