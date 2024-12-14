const amqp = require('amqplib');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const QUEUES = {
    auth: 'auth_queue',
    careers: 'careers_queue',
    users: 'users_queue',
};

const PROTO_PATH = './protobuf/user.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH);

let channel;

class RabbitService {

    constructor(queueName) {

        this.queueName = queueName;    
    }

    static async sendToQueue(queueName, data) {
        try {
            await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
            console.log('Mensaje enviado a la cola:', this.queueName);
            console.log('Mensaje:', data);

        } catch (error) {
            throw new Error(`Error enviando mensaje a la cola ${this.queueName}: ${error}`);
        }
    }

    async setupRabbitMQ() {
        try {
            const connection = await amqp.connect(process.env.RABBITMQ_URL);
            channel = await connection.createChannel();
            await channel.assertQueue(this.queueName, { durable: true });
            console.log(`RabbitMQ configurado para la cola: ${this.queueName}`);

        } catch (error) {
            console.error(`Error configurando RabbitMQ para ${this.queueName}:`, error);
        }
    }

    consumeQueue() {
        console.log(`Escuchando mensajes en la cola: ${this.queueName}...`);
        channel.consume(
            this.queueName,
            async (msg) => {
                try {
                    const message = JSON.parse(msg.content.toString());
    
                    const { operation, data, correlationId, replyTo } = message;

                    if (this.handlers[operation]) {
                        const result = await this.handlers[operation](data);
                        console.log('Resultado: ', result);
                        console.log(`Operación ${operation} completada con éxito.`);
                    } else {
                        console.error(`Operación no soportada: ${operation}`);
                    }
    
                    channel.ack(msg);
                } catch (error) {
                    console.error(`Error procesando mensaje en ${this.queueName}:`, error);
                    channel.nack(msg);
                }
            },
            { noAck: false }
        );
    }
}

module.exports = RabbitService;
