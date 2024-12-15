const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const usuarios = [];
    const progresos = [];
    const saltRounds = 10;
    const idCareersList = [0, 1, 2, 3, 4, 5, 6, 7]

    const jsonFile = path.resolve(__dirname, '../USERS_DATA.json');
    const usersData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

    const jsonFileCareers = path.resolve(__dirname, '../CAREERS_DATA.json');
    const careersData = JSON.parse(fs.readFileSync(jsonFileCareers, 'utf8'));

    let counterList = 0;
    const generatedIds = new Set();
    const generatedIds2 = new Set();
    for (let i = 0; i <= usersData.length - 1; i++) {
      let assignCodes = [];
      if (counterList === 8) {
        counterList = 0;
      }
      const user = usersData[i];
      const hashedPassword = await bcrypt.hash(user.password, saltRounds);
      let newId;
      do {
        newId = uuidv4();
      } while (generatedIds.has(newId));
      generatedIds.add(newId);
      usuarios.push({
        id: newId,
        name: user.name,
        firstLastname: user.firstLastname,
        secondLastname: user.secondLastname,
        rut: user.rut,
        email: user.email,
        password: hashedPassword,
        idCareer: idCareersList[counterList],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      assignCodes = careersData.filter((career) => career.career_id === idCareersList[counterList]);

      for (let j = 0; j <= assignCodes.length - 1; j++) {
        let newId2;
        do {
          newId2 = uuidv4();
        } while (generatedIds2.has(newId2));
        generatedIds2.add(newId2);
        progresos.push({
          id: newId2,
          idUser: usuarios[i].id,
          asignatureCode: assignCodes[j].code,
          state: faker.helpers.arrayElement(['approved', 'pending', 'failed']),
          lastTimeUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      counterList++;
    }


    await queryInterface.bulkInsert('Users', usuarios);
    await queryInterface.bulkInsert('Progresses', progresos);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Progresses', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  },
};
