const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { sequelize, User, Progress } = require('./database/indexDB.js');
const userController = require('../controllers/usersController.js');
const { validateJWTGrpc, getTokenAuth } = require('../middleware/jwt.js')
const RabbitMQ = require('../services/rabbitMQService.js');

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.Server = require('http').createServer(this.app);
        this.grpcPort = process.env.GRPC_PORT || 50051;
        this.paths = {
            users: '/api/users',
        };
        this.PROTO_PATH = './protoBuf/user.proto';
        this.queues = {
            register: 'register_queue',
            password: 'update_pw_queue',
        };
        this.middlewares();
        this.dBConnection();
        this.initGrpcServer();
        this.rabbitMQ();
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

    async rabbitMQ() {
        try {
            await RabbitMQ.setupRabbitMQ(Object.values(this.queues));
    
            this.rabbitPasswordQueue = new RabbitMQ(this.queues.password);
            this.rabbitRegisterQueue = new RabbitMQ(this.queues.register);
    
            console.log('RabbitMQ configurado correctamente');
        } catch (err) {
            console.error('Error inicializando RabbitMQ:', err);
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

            GetProfile: (call, callback) => {
                validateJWTGrpc(call, callback, () => {
                    this.grpcGetProfile(call, callback);
                });
            },

            GetProgress: (call, callback) => {
                validateJWTGrpc(call, callback, () => {
                    this.grpcGetProgress(call, callback);
                });
            },

            UpdateProfile: (call, callback) => {
                validateJWTGrpc(call, callback, () => {
                    this.grpcUpdateProfile(call, callback);
                });
            },

            UpdateProgress: (call, callback) => {
                validateJWTGrpc(call, callback, () => {
                    this.grpcUpdateProgress(call, callback);
                });
            },

            CreateUser: this.grpcCreateUser,

            UpdatePassword: (call, callback) => {
                validateJWTGrpc(call, callback, () => {
                    this.grpcUpdatePassword(call, callback);
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
            return callback(null, {
                token: "",
                error: true,
                message: "Faltan campos obligatorios: email y/o password.",
            });
        }
        userController.login(call.request)
            .then((response) => {
                callback(null, {
                    token: String(response.token),
                    error: response.error,
                    message: response.message,
                });
            }).finally(() => {
                console.log('gRPC Login - Fin de la operación');
            })
            .catch((error) => {
                console.error("Error en gRPC Login - SERVER:", error);
                callback({ token: '', error: true, message: "Error interno del servidor." });
            });
    };

    grpcGetProfile(call, callback) {

        const token = getTokenAuth(call);
        userController.getUser(token).then((response) => {
            callback(null, response);
        }).finally(() => {
            console.log('gRPC GetProfile - Fin de la operación');
        }).catch((err) => {
            console.error("Error en grpcGetProfile:", err);
            callback({ code: grpc.status.INTERNAL, message: err.message });
        });
    }

    grpcGetProgress(call, callback) {
        const token = getTokenAuth(call);
        userController.getProgress(token).then((response) => {
            callback(null, response);
        }).finally(() => {
            console.log('gRPC GetProgress - Fin de la operación');
        }).catch((err) => {
            console.error("Error en grpcGetProgress:", err);
            callback({ code: grpc.status.INTERNAL, message: err.message });
        });
    }


    grpcUpdateProgress(call, callback) {
        const { approvedCourses, removedCourses } = call.request;
        const token = getTokenAuth(call);

        userController.updateProgress({ token, approvedCourses, removedCourses }).then((response) => {
            callback(null, response);
        }).finally(() => {
            console.log('gRPC UpdateProgress - Fin de la operación');
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


    grpcCreateUser(call, callback) {
        const { name, firstLastname, secondLastname, rut, email, password, idCareer } = call.request;
        if (!name || !firstLastname || !secondLastname || !rut || !email || !password || !idCareer) {
            return callback(null, {
                error: true,
                message: "Todos los campos son obligatorios.",
            });
        }

        userController.createUser(call.request).then((response) => {
            callback(null, response);
        }).finally(() => {
            console.log('gRPC CreateUser - Fin de la operación');
        }).catch((err) => {
            callback({ code: grpc.status.INTERNAL, message: err.message });
        });
    }

    grpcUpdatePassword(call, callback) {
        const token = getTokenAuth(call);
        userController.updatePassword(call.request, token)
            .then((response) => {
                callback(null, response);
            })
            .catch((err) => {
                callback({ code: grpc.status.INTERNAL, message: err.message });
            });
    }

    listen() {
        this.Server.listen(this.port, () => {
            console.log('Servidor HTTP corriendo en puerto', this.port);
        });
    }
}

module.exports = Server;
