const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { sequelize, User, Progress } = require('./database/indexDB.js');
const userController = require('../controllers/usersController.js');


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
        this.routes();
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

    routes() {
        // Define las rutas HTTP aquí si es necesario
    }

    initGrpcServer() {
        const packageDefinition = protoLoader.loadSync(this.PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
        });
        const proto = grpc.loadPackageDefinition(packageDefinition).usermanagement;

        this.grpcServer = new grpc.Server();

        // Registro de servicios gRPC
        this.grpcServer.addService(proto.UserService.service, {
            Login: this.grpcLogin.bind(this),
            GetProfile: this.grpcGetProfile.bind(this),
            UpdateProfile: this.grpcUpdateProfile.bind(this),
            GetProgress: this.grpcGetProgress.bind(this),
            UpdateProgress: this.grpcUpdateProgress.bind(this),
            CreateUser: this.grpcCreateUser.bind(this),
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

    grpcLogin(call, callback) {
        const { email, password } = call.request;
        userController.login({ body: { email, password } }, {
            status: (code) => ({
                json: (response) => callback(null, response),
            }),
        }).catch((err) => {
            callback({ code: grpc.status.INTERNAL, message: err.message });
        });
    }

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
        userController.createUser({ body: { name, firstLastname, secondLastname, rut, email, password, idCareer } }, {
            status: (code) => ({
                json: (response) => callback(null, response),
            }),
        }).catch((err) => {
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
