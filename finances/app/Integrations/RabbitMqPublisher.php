<?php

namespace App\Integrations;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Throwable;

/**
 * Seul point de publication vers RabbitMQ : échange topic `sigapei.events`, format {"pattern", "data"}
 * (compatible @nestjs/microservices). Messages minimaux (uuid et montants utiles à la notification), jamais de donnée personnelle superflue.
 * Publication APRÈS validation de la transaction ; une panne de RabbitMQ n'annule pas l'action (journalisée).
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
        $hote = (string) config('services.rabbitmq.host', '');
        if ($hote === '') {
            return;
        }

        try {
            $connexion = new AMQPStreamConnection(
                $hote,
                (int) config('services.rabbitmq.port', 5672),
                (string) config('services.rabbitmq.user'),
                (string) config('services.rabbitmq.password'),
                (string) config('services.rabbitmq.vhost', '/'),
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
