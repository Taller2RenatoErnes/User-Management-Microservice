const { User, Progress } = require('../models/database/indexDB.js');
const bcrypt = require('bcrypt');
const grpc = require('@grpc/grpc-js');
const { generateToken, getIdJWT } = require('../middleware/jwt.js');
const { createProgress, getProgressesUsers } = require('./progressController.js');


const login = async (request) => {
    console.log('Inicio de sesión', request);

    if (!request || !request.email || !request.password) {
        return Promise.resolve({
            token: "",
            error: true,
            message: "Campos faltantes: email y/o password.",
        });
    }

    try {
        const { email, password } = request;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return Promise.resolve({ token: "", error: true, message: 'Credenciales inválidas' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return Promise.resolve({ token: "", error: true, message: 'Credenciales inválidas' });
        }

        const token = await generateToken(user.id);

        return Promise.resolve({
            token,
            error: false,
            message: 'Inicio de sesión exitoso'
        });

    } catch (error) {
        console.error('Error en gRPC Login:', error);
        return Promise.reject({ code: grpc.status.INTERNAL, message: 'Error al iniciar sesión.' });
    }
};


const getUser = async (request) => {
    try {
        const token = request;

        const id = getIdJWT(token);

        if (!id) {
            return Promise.resolve({ error: true, message: 'Faltan campos obligatorios: id' });
        }

        const user = await User.findByPk(id);

        return Promise.resolve({
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
        return Promise.reject({ code: grpc.status.INTERNAL, message: 'Error al obtener el perfil.' });
    }
}

const getProgress = async (request) => {
    try {
        const token = request;
        const id = getIdJWT(token);

        if (!id) {
            return Promise.resolve({ error: true, message: 'Usuario no autorizado' });
        }

        const progresses = await Progress.findAll({
            where: { idUser: id },
        });


        const progressesMap = progresses.map((item) => (
            {
                asignatureCode: item.asignatureCode.toString(),
                state: item.state,
                lastTimeUpdated: item.lastTimeUpdated,
            }));

        return Promise.resolve({ progress: progressesMap });
    } catch (error) {
        console.log('Error en /my-progress:', error);
        return Promise.reject({ code: grpc.status.INTERNAL, message: 'Error al obtener el progreso.' });
    }
};

const updateProgress = async (request) => {
    try {
        const { token, approvedCourses, removedCourses } = request;

        if (!token) {
            return Promise.reject({ code: grpc.status.UNAUTHENTICATED, message: 'Token inválido.' });
        }

        const id = getIdJWT(token);
        if (!id) {
            return Promise.reject({ code: grpc.status.UNAUTHENTICATED, message: 'Token inválido.' });
        }

        if (
            (!approvedCourses || approvedCourses.length === 0) &&
            (!removedCourses || removedCourses.length === 0)
        ) {
            return Promise.reject({ code: grpc.status.INVALID_ARGUMENT, message: 'No se proporcionaron cursos para actualizar.' });
        }

        // Obtener todas las asignaturas inscritas por el usuario
        const totalCourses = await Progress.findAll({
            where: { idUser: id },
            attributes: ['asignatureCode', 'state'],
        });

        // Normalizar códigos como strings para la validación
        const totalCourseCodes = totalCourses.map((course) => course.asignatureCode.toString());

        // Verificar que todos los cursos proporcionados existan en los inscritos
        const allProvidedCourses = [...approvedCourses, ...removedCourses];
        const invalidCourses = allProvidedCourses.filter((course) => !totalCourseCodes.includes(course));

        if (invalidCourses.length > 0) {
            return Promise.reject({
                code: grpc.status.INVALID_ARGUMENT,
                message: `Los siguientes cursos no están inscritos: ${invalidCourses.join(', ')}`,
            });
        }

        // Validar cursos a aprobar (estado debe ser distinto a 'approved')
        const coursesToApprove = totalCourses.filter((course) =>
            approvedCourses.includes(course.asignatureCode.toString())
        );
        const alreadyApproved = coursesToApprove.filter((course) => course.state === 'approved');

        if (alreadyApproved.length > 0) {
            return Promise.reject({
                code: grpc.status.INVALID_ARGUMENT,
                message: `Los siguientes cursos ya están aprobados: ${alreadyApproved
                    .map((course) => course.asignatureCode)
                    .join(', ')}`,
            });
        }

        // Validar cursos a remover (estado debe ser 'approved')
        const coursesToRemove = totalCourses.filter((course) =>
            removedCourses.includes(course.asignatureCode.toString())
        );
        const notApproved = coursesToRemove.filter((course) => course.state !== 'approved');

        if (notApproved.length > 0) {
            return Promise.reject({
                code: grpc.status.INVALID_ARGUMENT,
                message: `Los siguientes cursos no se encuentran aprobados: ${notApproved
                    .map((course) => course.asignatureCode)
                    .join(', ')}`,
            });
        }

        // Actualizar los cursos a aprobados
        if (approvedCourses && approvedCourses.length > 0) {
            for (const courseCode of approvedCourses) {
                await Progress.update(
                    { state: 'approved', lastTimeUpdated: new Date() },
                    { where: { idUser: id, asignatureCode: parseInt(courseCode) } } // Convertir a entero
                );
            }
        }

        // Actualizar los cursos a estado fallido
        if (removedCourses && removedCourses.length > 0) {
            await Progress.update(
                { state: 'failed', lastTimeUpdated: new Date() },
                {
                    where: {
                        idUser: id,
                        asignatureCode: removedCourses.map((course) => parseInt(course)), // Convertir a entero
                        state: 'approved',
                    },
                }
            );
        }

        return Promise.resolve({ message: 'Progreso actualizado exitosamente.' });
    } catch (error) {
        console.error('Error en /update-progress:', error);
        return Promise.reject({ code: grpc.status.INTERNAL, message: 'Error al actualizar el progreso.' });
    }
};


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
    getUser,
    getProgress,
    updateProfile,
    updateProgress,
    login,
    createUser
};


