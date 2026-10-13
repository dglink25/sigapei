<?php

namespace App\Integrations;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

/**
 * Seul point de publication d'événements vers RabbitMQ.
 * Guide suprême §02 §4 + design §2.6 :
 * - Échange de type topic.
 * - Messages = événements de déclenchement uniquement (aucune donnée métier).
 * - Routing keys connues : evaluations.bulletin.publie, evaluations.composition.anomalie
 *   Autres : TODO(DECISION-19)
 */
class RabbitMqPublisher
{
    /**
     * Publie un événement sur l'échange topic de la plateforme.
     *
     * @param string $routingKey  ex : 'evaluations.bulletin.publie'
     * @param array  $data        payload de l'événement
     */
    public function publier(string $routingKey, array $data): void
    {
        $connection = new AMQPStreamConnection(
            config('queue.connections.rabbitmq.host', env('RABBITMQ_HOST', 'rabbitmq')),
            config('queue.connections.rabbitmq.port', 5672),
            config('queue.connections.rabbitmq.login', env('RABBITMQ_USER', 'sigapei')),
            config('queue.connections.rabbitmq.password', env('RABBITMQ_PASSWORD', '')),
            config('queue.connections.rabbitmq.vhost', '/')
        );

        $channel  = $connection->channel();
        $exchange = 'sigapei.events';

        $channel->exchange_declare($exchange, 'topic', false, true, false);

        $msg = new AMQPMessage(
            json_encode(['pattern' => $routingKey, 'data' => $data]),
            ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT]
        );

        $channel->basic_publish($msg, $exchange, $routingKey);
        $channel->close();
        $connection->close();
    }
}
