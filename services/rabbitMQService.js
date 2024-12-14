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

    constructor(queues) {
        this.queues = Array.isArray(queues) ? queues : [queues];
        this.channel = null;
    }

    static async sendToQueue(queue, message) {
        if (!this.channel) {
            throw new Error('El canal no está inicializado. Llama a setupRabbitMQ primero.');
        }

        try {
            this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
            console.log(`Mensaje enviado a ${queue}:`, message);
        } catch (error) {
            console.error(`Error enviando mensaje a la cola ${queue}:`, error);
        }
    }

    async setupRabbitMQ() {
        try {
            const connection = await amqp.connect(process.env.RABBITMQ_URL);
            this.channel = await connection.createChannel();

            for (const queue of this.queues) {
                await this.channel.assertQueue(queue, { durable: true });
                console.log(`Cola configurada: ${queue}`);
            }
        } catch (error) {
            console.error('Error configurando RabbitMQ:', error);
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
