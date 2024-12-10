const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { sequelize, User, Progress } = require('./database/indexDB.js');
const userController = require('../controllers/usersController.js');
const {validateJWTGrpc} = require('../middleware/jwt.js')


class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.Server = require('http').createServer(this.app);
        this.grpcPort = 50051;
        this.paths = {
            users: '/api/users',
        };
        this.PROTO_PATH = './protoBuf/user.proto';

        this.middlewares();
        this.dBConnection();
        this.initGrpcServer();
    }

    async dBConnection() {
        try {
            console.log('Conectando a la base de datos');
            await sequelize.authenticate();
            console.log('Conexión establecida con la BDD');

            const models = [User, Progress];
            for (const model of models) {
                await model.sync({ force: false });
                console.log(model.name, ': Tabla sincronizada');
            }
        } catch (error) {
            console.log('Error de conexión en BDD: ', error);
            throw new Error(error);
        }
    }

    middlewares() {
        this.app.use(logger('dev'));
        this.app.use(cors());
        this.app.use(express.json());
    }

    initGrpcServer() {
        const packageDefinition = protoLoader.loadSync(this.PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
        });

        const proto = grpc.loadPackageDefinition(packageDefinition).usermanagement;

        this.grpcServer = new grpc.Server();

        this.grpcServer.addService(proto.UserService.service, {
            
            Login: this.grpcLogin,
        
            // GetProfile - Aplicando validateJWTGrpc
            GetProfile: (call, callback) => {
                validateJWTGrpc(call, callback, () => {
                    this.grpcGetProfile(call, callback); // Llamamos a la lógica de GetProfile después de la validación
                });
            },
        
            // UpdateProfile - Aplicando validateJWTGrpc
            UpdateProfile: (call, callback) => {
                validateJWTGrpc(call, callback, () => {
                    this.grpcUpdateProfile(call, callback); // Llamamos a la lógica de UpdateProfile después de la validación
                });
            },
        
            // GetProgress - Aplicando validateJWTGrpc
            GetProgress: (call, callback) => {
                validateJWTGrpc(call, callback, () => {
                    this.grpcGetProgress(call, callback); // Llamamos a la lógica de GetProgress después de la validación
                });
            },
        
            // UpdateProgress - Aplicando validateJWTGrpc
            UpdateProgress: (call, callback) => {
                validateJWTGrpc(call, callback, () => {
                    this.grpcUpdateProgress(call, callback); // Llamamos a la lógica de UpdateProgress después de la validación
                });
            },
        
            // CreateUser - Aplicando validateJWTGrpc
            CreateUser: (call, callback) => {
                validateJWTGrpc(call, callback, () => {
                    this.grpcCreateUser(call, callback); // Llamamos a la lógica de CreateUser después de la validación
                });
            }
        });
        this.grpcServer.bindAsync(`0.0.0.0:${this.grpcPort}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
            if (err) {
                console.error('Error iniciando el servidor gRPC:', err);
                return;
            }
            console.log(`Servidor gRPC corriendo en puerto ${port}`);
            this.grpcServer.start();
        });
    }

    grpcLogin = (call, callback) => {
        console.log('gRPC Login - Inicio de sesión:', call.request);
    
        if (!call.request || typeof call.request !== 'object') {
            console.error('gRPC Login - Request inválido:', call.request);
            return callback(null, {
                token: "",
                error: true,
                message: "Solicitud inválida. No se enviaron datos.",
            });
        }
    
        const { email, password } = call.request;
    
        if (!email || !password) {
            console.error('gRPC Login - Faltan campos obligatorios:', call.request);
            return callback(null, {
                token: "",
                error: true,
                message: "Faltan campos obligatorios: email y/o password.",
            });
        }
    
        userController.login(call.request)
            .then((response) => {
                console.log("Respuesta en server.js", response);
                callback(null, {
                    token: String (response.token),
                    error: response.error,
                    message: response.message,
                });
            }).finally(() => {
                console.log('gRPC Login - Fin de la operación');
            })
            .catch((error) => {
                console.error("Error en gRPC Login - SERVER:", error);
                callback({ token:'', error: true, message: "Error interno del servidor." });
            });
    };
        
    grpcGetProfile(call, callback) {
        const { token } = call.request;
        const user = { id: token }; // Simulación de usuario con token
        userController.getUsers({ user }, {
            status: (code) => ({
                json: (response) => callback(null, response),
            }),
        }).catch((err) => {
            callback({ code: grpc.status.INTERNAL, message: err.message });
        });
    }

    grpcUpdateProfile(call, callback) {
        const { token, name, firstLastname, secondLastname } = call.request;
        const user = { id: token }; // Simulación de usuario con token
        userController.updateProfile({ user, body: { name, firstLastname, secondLastname } }, {
            status: (code) => ({
                json: (response) => callback(null, response),
            }),
        }).catch((err) => {
            callback({ code: grpc.status.INTERNAL, message: err.message });
        });
    }

    grpcGetProgress(call, callback) {
        const { token } = call.request;
        const user = { id: token }; // Simulación de usuario con token
        userController.getProgress({ user }, {
            status: (code) => ({
                json: (response) => callback(null, response),
            }),
        }).catch((err) => {
            callback({ code: grpc.status.INTERNAL, message: err.message });
        });
    }

    grpcUpdateProgress(call, callback) {
        const { token, approvedCourses, removedCourses } = call.request;
        const user = { id: token }; // Simulación de usuario con token
        userController.updateProgress({ user, body: { approvedCourses, removedCourses } }, {
            status: (code) => ({
                json: (response) => callback(null, response),
            }),
        }).catch((err) => {
            callback({ code: grpc.status.INTERNAL, message: err.message });
        });
    }

    grpcCreateUser(call, callback) {
        const { name, firstLastname, secondLastname, rut, email, password, idCareer } = call.request;
        if (!name || !firstLastname || !secondLastname || !rut || !email || !password || !idCareer) {
            return callback(null, {
                id: "",
                error: true,
                message: "Todos los campos son obligatorios.",
            });
        }
    
        userController.createUser({ body: { name, firstLastname, secondLastname, rut, email, password, idCareer } }, {
            status: (code) => ({
                json: (response) => callback(null, response),
            }),
        }).catch((err) => {
            console.error("Error en grpcCreateUser:", err);
            callback({ code: grpc.status.INTERNAL, message: "Error interno del servidor." });
        });
    }
    

    listen() {
        this.Server.listen(this.port, () => {
            console.log('Servidor HTTP corriendo en puerto', this.port);
        });
    }
}

module.exports = Server;
