const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const userController = require('./controllers/userController.js');

const PROTO_PATH = './user.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const userProto = grpc.loadPackageDefinition(packageDefinition).usermanagement;

function login(call, callback) {
    if ( !call.request.email || !call.request.password) {
        return callback(null, {
            token: "",
            error: true,
            message: "Campos requeridos faltantes: email y/o password.",
        });
    }

    userController.login(call , {
        status: (code) => ({
            json: (response) => callback(null, response),
        }),
    }).catch((err) => {
        console.error("Error en login:", err);
        callback({ code: grpc.status.INTERNAL, message: "Error interno del servidor." });
    });
}


function getProfile(call, callback) {
    const { token } = call.request;

    // Aquí deberías validar el token y buscar el usuario correspondiente
    const user = { id: token }; // Ejemplo simplificado

    userController.getUsers({ user }, {
        status: (code) => ({
            json: (response) => callback(null, response),
        }),
    }).catch((err) => {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    });
}

// Define más funciones similares para UpdateProfile, GetProgress, UpdateProgress y CreateUser...

const server = new grpc.Server();

server.addService(userProto.UserService.service, {
    Login: login,
    GetProfile: getProfile,
    // Añade las otras funciones aquí...
});

const PORT = '50051';
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error('Error iniciando el servidor gRPC:', err);
        return;
    }
    console.log(`Servidor gRPC corriendo en puerto ${port}`);
    server.start();
});
