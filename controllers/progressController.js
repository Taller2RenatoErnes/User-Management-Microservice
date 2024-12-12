const {Progress} = require('../models/database/indexDB.js');

const grpc = require('@grpc/grpc-js');

const createProgress = async (request)=>{
    try {
        const { idUser, asignatureCode, state} = request;

        if (!idUser || !asignatureCode || !state) {
            return Promise.resolve({ error: true, message: 'Faltan campos obligatorios: idUser, asignatureCode, state' });
        }

        if (Progress.findOne({ where: { idUser, asignatureCode } })) {
            return Promise.resolve({ error: true, message: 'Ya existe un progreso con estos datos, debe actualizar no crear.' });
        }

        const newProgress = await Progress.create({ idUser, asignatureCode, state, lastTimeUpdated: new Date() });

        return Promise.resolve(newProgress);

    } catch (error) {
        console.log('Error en /progress:', error);
        return Promise.reject({ code: grpc.status.INTERNAL, message: 'Error al crear el progreso.' });
    }
}

const updateProgress = async (request) => {
    try{
        const { idUser, asignatureCode, state } = request;

        if (!idUser || !asignatureCode || !state) {
            return Promise.resolve({ error: true, message: 'Faltan campos obligatorios: idUser, asignatureCode, state' });
        }

        const progress = await Progress.findOne({ where: { idUser, asignatureCode } });

        if (!progress) {
            return Promise.resolve({ error: true, message: 'No existe un progreso con estos datos, debe crear no actualizar.' });
        }
        progress.state = state;
        progress.lastTimeUpdated = new Date();
        await progress.save();

        return Promise.resolve(progress);

    } catch (error) {
        console.error('Error en /progress:', error);
        return Promise.reject({ code: grpc.status.INTERNAL, message: 'Error al actualizar el progreso.' });
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
module.exports = {getProgressesUsers, createProgress, updateProgress};