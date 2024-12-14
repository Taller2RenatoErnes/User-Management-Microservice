    const amqp = require('amqplib');
    const { token } = require('morgan');
    const REQUEST_QUEUE = 'request_queue';
    const RESPONSE_QUEUE = 'response_queue';



    let channel;

    const handlers = {
    authenticate: async (data) => {
        
    },
    register: async (data) => {
        const { username, password } = data;
        console.log('Registrando usuario:', username);
        return { status: 'success', message: 'Usuario registrado exitosamente' };
    },
    updateUser: async (data) => {
        const { userId, updates } = data;
        console.log('Actualizando usuario:', userId, updates);
        return { status: 'success', message: 'Usuario actualizado correctamente' };
    },
    };

    class RabbitService{
    constructor(){}


    setupRabbitMQ = async () => {
        try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(REQUEST_QUEUE, { durable: true });
        await channel.assertQueue(RESPONSE_QUEUE, { durable: true });
        await channel.assertQueue('login_response', { durable: true });
        this.consumeResponse();
        } catch (error) {
        console.error('Error configurando RabbitMQ:', error);
        }
    };

    sendMessageAndWaitResponse = (message) => {
        return new Promise((resolve, reject) => {
        const correlationId = generateCorrelationId();
    
        // Configurar escucha para la respuesta
        channel.consume(
            RESPONSE_QUEUE,
            (msg) => {
            if (msg.properties.correlationId === correlationId) {
                resolve(JSON.parse(msg.content.toString()));
                channel.ack(msg); // Confirma que el mensaje fue procesado
            }
            },
            { noAck: false }
        );
        console.log('Enviando mensaje:', message);
        // Enviar mensaje a la cola
        channel.sendToQueue('login_response', Buffer.from(JSON.stringify(message)), {
        });
        });
    };

    generateCorrelationId = () => {
        return Math.random().toString() + Date.now().toString();
    };

    consumeResponse = () => {
        console.log('RabbitMQ - Sincronizador de respuestas iniciado');

        channel.consume(
        REQUEST_QUEUE,
        async (msg) => {
            console.log('Mensaje recibido:', msg.content.toString());
            const message = JSON.parse(msg.content.toString());
            const { operation, data, correlationId, replyTo } = message;
            console.log(`Operación ${operation} recibida`);
            // Verificar si existe el manejador para la operación
            if (handlers[operation]) {
    
            try {
                const result = await handlers[operation](data);
                channel.sendToQueue(
                'login_response',
                Buffer.from(JSON.stringify({ correlationId, result })),
                { correlationId }
                );
                console.log(`Operación ${operation} completada`);
            } catch (error) {
                console.error(`Error ejecutando operación ${operation}:`, error);
            }
            } else {
            console.error(`Operación no soportada: ${operation}`);
            }
    
            // Confirmar el mensaje procesado
            channel.ack(msg);
        },
        { noAck: false }
        );
    };
    }

    
    module.exports = RabbitService;