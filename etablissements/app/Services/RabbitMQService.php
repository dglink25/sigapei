<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Throwable;

/**
 * Bus d'evenements inter-microservices (RabbitMQ), cote PHP/Laravel.
 *
 * Publie des messages au format exact attendu par le transport RMQ de
 * NestJS (@nestjs/microservices) : { "pattern": "<nom.evenement>", "data": {...} }.
 * Cela permet a api-identite (et a terme aux autres microservices Nest)
 * de consommer directement ces evenements via un handler @EventPattern,
 * sans middleware de traduction ni file d'attente intermediaire.
 *
 * Usage :
 *   app(RabbitMQService::class)->publier('etablissement.valide', [...]);
 */
class RabbitMQService
{
    private ?AMQPStreamConnection $connexion = null;

    private function connexion(): AMQPStreamConnection
    {
        if ($this->connexion === null || ! $this->connexion->isConnected()) {
            $this->connexion = new AMQPStreamConnection(
                env('RABBITMQ_HOST', '127.0.0.1'),
                (int) env('RABBITMQ_PORT', 5672),
                env('RABBITMQ_USER', 'guest'),
                env('RABBITMQ_PASSWORD', 'guest'),
                env('RABBITMQ_VHOST', '/'),
                connection_timeout: 5,
                read_write_timeout: 5,
            );
        }

        return $this->connexion;
    }

    /**
     * Publie un evenement fire-and-forget vers la queue consommee par
     * api-identite (RABBITMQ_QUEUE_IDENTITE, "identite.rpc" par defaut).
     * D'autres microservices (Communication, Scolarite...) pourront a terme
     * consommer la meme queue ou une queue dediee selon leur besoin.
     */
    public function publier(string $pattern, array $donnees, ?string $queue = null): bool
    {
        $queue ??= env('RABBITMQ_QUEUE_IDENTITE', 'identite.rpc');

        try {
            $canal = $this->connexion()->channel();
            $canal->queue_declare($queue, false, true, false, false);

            $corps = json_encode(['pattern' => $pattern, 'data' => $donnees], JSON_UNESCAPED_UNICODE);
            $message = new AMQPMessage($corps, [
                'content_type' => 'application/json',
                'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
            ]);

            $canal->basic_publish($message, '', $queue);
            $canal->close();

            return true;
        } catch (Throwable $e) {
            Log::warning("Echec publication RabbitMQ [{$pattern}]: ".$e->getMessage());

            return false;
        }
    }

    public function __destruct()
    {
        try {
            $this->connexion?->close();
        } catch (Throwable) {
            // ignore
        }
    }
}
