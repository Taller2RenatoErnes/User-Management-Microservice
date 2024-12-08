const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const sequelize = require('./database.js');
const { v4: uuidv4 } = require('uuid');

const Progress = sequelize.define('Progress', {
    id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
        allowNull: false,
    },
    idUser: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    asignatureCode: {
        type: DataTypes.UUID,
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

module.exports = User;