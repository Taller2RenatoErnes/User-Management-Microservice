const sequelize = require('./database.js');
const { DataTypes } = require('sequelize');

//Importar modelos
const User = require('./users.js');
const Progress = require('./progress.js');

//Definir relaciones

//Un usuario tiene muchos progresos
User.hasMany(Progress, {foreignKey: 'idUser', sourceKey: 'id'});
Progress.belongsTo(User, {foreignKey: 'idUser', sourceKey: 'id'});

//Exportar modelos
module.exports = {
    sequelize,
    User,
    Progress
}