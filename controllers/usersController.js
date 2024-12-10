const { User, Progress } = require('../models/database/indexDB.js');
const bcrypt = require('bcrypt');

const login = async (call, callback) => {
    console.log('Inicio de sesión',  call.request);

    if (!call.request || !call.request.email || !call.request.password) {
        return callback(null, {
            token: "",
            error: true,
            message: "Campos faltantes: email y/o password.",
        });
    }

    try {
        const { email, password } = call.request;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return callback(null, { token: "", error: true, message: 'Credenciales inválidas' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return callback(null, { token: "", error: true, message: 'Credenciales inválidas' });
        }

        return callback(null, { token: user.id, error: false, message: 'Inicio de sesión exitoso' });

    } catch (error) {
        console.error('Error en gRPC Login:', error);
        return callback({ code: grpc.status.INTERNAL, message: 'Error al iniciar sesión.' });
    }
};



const getUsers = async (req, res) => {
    try {
        const user = req.user;
        return res.status(200).json({
            id: user.id,
            name: user.name,
            firstLastname: user.firstLastname,
            secondLastname: user.secondLastname,
            rut: user.rut,
            email: user.email,
            idCareer: user.idCareer,
        });
    } catch (error) {
        console.log('Error en /profile:', error);
        return res.status(500).json({ message: 'Error al obtener el perfil.' });
    }
}

const updateProfile = async (req, res) => {
    try {
        const { name, firstLastname, secondLastname } = req.body;

        if (name) req.user.name = name;
        if (firstLastname) req.user.firstLastname = firstLastname;
        if (secondLastname) req.user.secondLastname = secondLastname;

        await req.user.save();
        return res.status(200).json({ message: 'Perfil actualizado exitosamente.' });
    } catch (error) {
        console.log('Error en /update-profile:', error);
        return res.status(500).json({ message: 'Error al actualizar el perfil.' });
    }
}

const getProgress = async (req, res) => {
    try {
        const progress = await Progress.findAll({
            where: { userId: req.user.id },  // Relacionamos el progreso con el usuario
        });

        return res.status(200).json(progress);
    } catch (error) {
        console.log('Error en /my-progress:', error);
        return res.status(500).json({ message: 'Error al obtener el progreso.' });
    }
}

const updateProgress = async (req, res) => {
    try {
        const { approvedCourses, removedCourses } = req.body;  // Se espera un objeto con los cursos aprobados y eliminados

        // Actualizar cursos aprobados
        if (approvedCourses && Array.isArray(approvedCourses)) {
            for (let courseCode of approvedCourses) {
                await Progress.create({
                    userId: req.user.id,
                    courseCode,
                    status: 'approved',
                });
            }
        }

        if (removedCourses && Array.isArray(removedCourses)) {
            for (let courseCode of removedCourses) {
                await Progress.destroy({
                    where: {
                        userId: req.user.id,
                        courseCode,
                    },
                });
            }
        }

        return res.status(200).json({ message: 'Progreso actualizado exitosamente.' });
    } catch (error) {
        console.log('Error en /my-progress (PATCH):', error);
        return res.status(500).json({ message: 'Error al actualizar el progreso.' });
    }

}

const createUser = async (req, res) => {
    try {
        const { name, firstLastname, secondLastname, rut, email, password, idCareer } = req.body;
        const newUser = await User.create({ name, firstLastname, secondLastname, rut, email, password, idCareer });

        return res.status(201).json(newUser);
    } catch (error) {
        console.log('Error en /users:', error);
        return res.status(500).json({ message: 'Error al crear el usuario.' });
    }
}

module.exports = {
    getUsers,
    getProgress,
    updateProfile,
    updateProgress,
    login,
    createUser
};


