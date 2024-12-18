
# Microservicio de Gestión de Usuarios  




## Taller 2 | Arquitectura de Sistemas ICCI

- Ernes Fuenzalida Tello, 21.176.561-5

## Herramientas
- VS Code [opcional]
- Docker
- NodeJS v18<
- Git


## Instalación

Clonar el repositorio y entrar a la carpeta

```bash
  git clone https://github.com/Taller2RenatoErnes/User-Management-Microservice
  
  cd User-Management-Microservice
```
    
Instalar dependencias

```bash
  npm install
```

## Variables de entorno

De ser necesario, puede cambiar las Variables de entorno dentro del .env (No recomendable, ya que como es un entorno local los puertos establecidos deben ser los mismos ya que conectamos más microservicios, gateway y monolito).

Variables predeterminadas:
- PORT=8080
- SECRET='TOP-SECRET-SECRET-WORKSHOP-ERNES-AND-RENATO'
- GRPC_PORT=50051
- RABBITMQ_URL = amqp://localhost:5672




## Ejecución
- Antes de ejecutar debe asegurarse de que se haya creado el container de Docker desde la [ApiGateway](https://github.com/Taller2RenatoErnes/ApiGateway).

- Una vez se haya creado la imagen "usersManagement-1" y esté en ejecución:
```bash
  nodemon app
```
- Adicionalmente, se ejecutarán y sincronizarán las tablas de Usuarios y Progresos.
## Seeders
Para hacer un buen uso del sistema en la totalidad, es necesario seguir los siguientes pasos:

- Si el proyecto se encuentra en ejecución debe detenerla.

- Para ejecutar los seeders debe ingresar el siguiente comando:
```bash
  npx sequelize db:seed:all
  nodemon app
```