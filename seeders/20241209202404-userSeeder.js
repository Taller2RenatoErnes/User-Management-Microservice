  const bcrypt = require('bcrypt');
  const { faker } = require('@faker-js/faker');

  module.exports = {
    up: async (queryInterface, Sequelize) => {
      const usuarios = [];
      const progresos = [];
      const saltRounds = 10;

      for (let i = 1; i <= 51; i++) {
        const hashedPassword = await bcrypt.hash('123', saltRounds);
        usuarios.push({
          id: i,
          name: faker.person.firstName().slice(0, 15),  // Updated to faker.person.firstName()
          firstLastname: faker.internet.email(), 
          secondLastname: faker.person.lastName().slice(0, 100),  // Updated to faker.person.lastName()
          rut: faker.string.alphanumeric(8) + '-' + faker.number.int({ min: 0, max: 9 }),  // Updated to faker.number.int
          email: faker.internet.email(), 
          password: hashedPassword,
          idCareer: faker.number.int({ min: 1, max: 10 }),  // Updated to faker.number.int
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const progressCount = faker.number.int({ min: 1, max: 5 });  
        for (let j = 1; j <= progressCount; j++) {
          progresos.push({
            id: `${i}-${j}`, 
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
