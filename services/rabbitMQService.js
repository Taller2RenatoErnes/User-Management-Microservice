const amqp = require('amqplib');

class RabbitService {
    static channel = null;

    constructor(queueName) {
        this.queueName = queueName;
    }

    static async setupRabbitMQ(queues = []) {
        if (this.channel) return;

        try {
            const connection = await amqp.connect(process.env.RABBITMQ_URL);
            this.channel = await connection.createChannel();

            for (const queue of queues) {
                await this.channel.assertQueue(queue, { durable: true });
                console.log(`Cola configurada: ${queue}`);
            }
        } catch (error) {
            console.error('Error configurando RabbitMQ:', error);
            throw new Error('RabbitMQ no se pudo inicializar.');
        }
    }

    static async sendToQueue(data, queue) {
        if (!RabbitService.channel) {
            throw new Error('RabbitMQ no está configurado.');
        }
        try {
            RabbitService.channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
            console.log(`Mensaje enviado a la cola ${queue}:`, data);
        } catch (error) {
            console.error(`Error enviando mensaje a la cola ${queue}:`, error);
            throw error;
        }
    }

    async consumeQueue(handlers = {}) {
        if (!RabbitService.channel) {
            throw new Error('RabbitMQ no está configurado.');
        }

        console.log(`Escuchando mensajes en la cola: ${this.queueName}...`);

        RabbitService.channel.consume(
            this.queueName,
            async (msg) => {
                try {
                    const message = JSON.parse(msg.content.toString());
                    const { operation, data } = message;

                    if (handlers[operation]) {
                        const result = await handlers[operation](data);
                        console.log(`Resultado operación ${operation}:`, result);
                    } else {
                        console.error(`Operación no soportada: ${operation}`);
                    }

                    RabbitService.channel.ack(msg);
                } catch (error) {
                    console.error(`Error procesando mensaje:`, error);
                    RabbitService.channel.nack(msg);
                }
            },
            { noAck: false }
        );
    }
}

module.exports = RabbitService;
