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
