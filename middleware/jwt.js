const jwt = require('jsonwebtoken');
const { Users } = require('../models/database/indexDB');
const grpc = require('@grpc/grpc-js');

/**
 * Obtiene el ID del usuario a partir del token JWT.
 * @param {string} token - El token JWT.
 * @returns {string} El ID del usuario.
 */
const getIdJWT = (token) => {
    const secret = process.env.SECRET;
    const { id } = jwt.verify(token, secret);
    return id;
}

/**
 * Genera un nuevo token JWT para el usuario.
 * @param {string} id - El ID del usuario.
 * @returns {Promise<string>} El token JWT generado.
 */
const generateToken = (id = '') => {
    return new Promise((resolve, reject) => {
        const payload = { id };
        jwt.sign(payload, process.env.SECRET, { expiresIn: '1460h' }, (error, token) => {
            if (error) {
                reject('No se pudo generar el token: ', error);
            } else resolve(token);
        });
    });
}

/**
 * Middleware para validar el token JWT en las solicitudes gRPC.
 * @param {Object} call - El objeto de llamada de gRPC.
 * @param {Function} callback - La función de callback de gRPC.
 * @returns {Promise<void>}
 */
const validateJWTGrpc = async (call, callback, next) => {
    try {
        const metadata = call.metadata;
        const token = metadata.get('authorization')[0]; // Extraemos el token del metadata
        
        if (!token) {
            return callback({
                code: grpc.status.UNAUTHENTICATED,
                details: 'No se ha proporcionado un token de autenticación'
            });
        }

        const { id } = jwt.verify(token, process.env.SECRET);
        const user = await Users.findByPk(id);

        if (!user) {
            return callback({
                code: grpc.status.UNAUTHENTICATED,
                details: 'Token inválido, usuario no encontrado'
            });
        }

        call.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return callback({
                code: grpc.status.UNAUTHENTICATED,
                message: 'Token expirado'
            });
        }

        return callback({
            code: grpc.status.UNAUTHENTICATED,
            message: 'Token no válido'
        });
    }
};

module.exports = { validateJWTGrpc, getIdJWT, generateToken };
