<?php

namespace App\Integrations;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Throwable;

/**
 * Seul point de publication vers RabbitMQ (CDC §14.2). Échange topic `sigapei.events`,
 * format {"pattern": ..., "data": ...} (compatible @nestjs/microservices, README plateforme).
 * Les messages ne transportent que des déclencheurs (uuid), jamais de donnée métier.
 *
 * Publication APRÈS validation de la transaction : un événement n'annonce jamais une écriture
 * annulée. Une panne de RabbitMQ n'annule pas l'action métier : l'échec est journalisé (niveau
 * error) pour relance ; la donnée reste la source de vérité.
 */
class RabbitMqPublisher
{
    public const EXCHANGE = 'sigapei.events';

    public function publier(string $routingKey, array $data): void
    {
        DB::afterCommit(fn () => $this->envoyer($routingKey, $data));
    }

    private function envoyer(string $routingKey, array $data): void
    {
        if (config('queue.connections.rabbitmq.publication_active', true) === false) {
            return;
        }

        try {
            $connexion = new AMQPStreamConnection(
                (string) config('queue.connections.rabbitmq.host'),
                (int) config('queue.connections.rabbitmq.port', 5672),
                (string) config('queue.connections.rabbitmq.login'),
                (string) config('queue.connections.rabbitmq.password'),
                (string) config('queue.connections.rabbitmq.vhost', '/'),
                connection_timeout: 3.0,
                read_write_timeout: 3.0,
            );

            try {
                $canal = $connexion->channel();
                $canal->exchange_declare(self::EXCHANGE, 'topic', false, true, false);
                $canal->basic_publish(new AMQPMessage(
                    json_encode(['pattern' => $routingKey, 'data' => $data], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                    ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT, 'content_type' => 'application/json'],
                ), self::EXCHANGE, $routingKey);
                $canal->close();
            } finally {
                $connexion->close();
            }
        } catch (Throwable $e) {
            Log::error('[RABBITMQ_PUBLICATION_ECHOUEE] '.$routingKey, ['data' => $data, 'erreur' => $e->getMessage()]);
        }
    }
}
