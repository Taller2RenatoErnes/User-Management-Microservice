const { DataTypes } = require('sequelize');
const sequelize = require('./database.js');
const { v4: uuidv4 } = require('uuid');

const Progress = sequelize.define('Progress', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
    },
    idUser: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    asignatureCode: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    state:{
        type: DataTypes.STRING,
        allowNull: false
    },
    lastTimeUpdated:{
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    timestamps: true,
    paranoid: true,
});

module.exports = Progress;
