// Cargar variables de entorno desde un archivo .env
require('dotenv').config();

/*
 * Importa la clase Server desde el archivo server.js ubicado en la carpeta models.
 * La clase Server contiene la lógica para configurar y ejecutar el servidor.
 */
const Server = require('./models/server');
// Crea una nueva instancia de la clase Server
const server = new Server();

// Llamar al método listen de la instancia server para iniciar el servidor
server.listen();