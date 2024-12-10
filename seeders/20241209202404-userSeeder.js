const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const usuarios = [];
    const progresos = [];
    const saltRounds = 10;

    const uniqueLastnames = new Set(); // Usamos un Set para garantizar unicidad

    for (let i = 1; i <= 51; i++) {
      const hashedPassword = await bcrypt.hash('123', saltRounds);

      let firstLastname;
      do {
        firstLastname = faker.person.lastName().slice(0, 100); // Generamos un apellido único
      } while (uniqueLastnames.has(firstLastname));
      uniqueLastnames.add(firstLastname);

      usuarios.push({
        id: i,
        name: faker.person.firstName().slice(0, 15),
        firstLastname,
        secondLastname: faker.person.lastName().slice(0, 100),
        rut: faker.string.alphanumeric(8) + '-' + faker.number.int({ min: 0, max: 9 }),
        email: faker.internet.email(),
        password: hashedPassword,
        idCareer: faker.number.int({ min: 1, max: 10 }),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const progressCount = faker.number.int({ min: 1, max: 5 });
      for (let j = 1; j <= progressCount; j++) {
        progresos.push({
          id: i * 100 + j, // Generamos un ID único numérico
          idUser: i,
          asignatureCode: i * j,
          state: faker.helpers.arrayElement(['approved', 'pending', 'failed']),
          lastTimeUpdated: faker.date.recent(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    await queryInterface.bulkInsert('Users', usuarios);
    await queryInterface.bulkInsert('Progresses', progresos);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Progresses', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  },
};
