const { DataTypes } = require('sequelize');
const sequelize = require('./database.js');
const { v4: uuidv4 } = require('uuid');

const Progress = sequelize.define('Progress', {
    id: {
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true,
        allowNull: false,
    },
    idUser: {
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        allowNull: false,
    },
    asignatureCode: {
        type: DataTypes.STRING,
        allowNull: false
    },
    state:{
        type: DataTypes.STRING,
        allowNull: false
    },
    lastTimeUpdated:{
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true,
    paranoid: true,
});

module.exports = Progress;
