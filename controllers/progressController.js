const express = require('express');
const app = express();
const {Progress} = require('../models/database/indexDB.js');

createProgress = async (req, res)=>{
    try {
        const { idUser, asignatureCode, state} = req.body;
        const newProgress = await Progress.create({ idUser, asignatureCode, state, lastTimeUpdated: new Date() });

        return res.status(201).json(newProgress);
    } catch (error) {
        console.log('Error en /progress:', error);
        return res.status(500).json({ message: 'Error al crear el progreso.' });
    }
}


const getProgressesUsers = async (id) => {
    try {
        const progress = await Progress.findAll({
            where: {
                idUser: id
            }
        });
        return Promise.resolve(progress);

    } catch (error) {
        console.error('Error en /get-progress:', error);
        return Promise.reject({ code: grpc.status.INTERNAL, message: 'Error al obtener el progreso.' });
    }
}
module.exports = {getProgressesUsers, createProgress};