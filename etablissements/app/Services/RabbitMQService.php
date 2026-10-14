<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Throwable;

class RabbitMQService{
    private ?AMQPStreamConnection $connexion = null;

    private function connexion(): AMQPStreamConnection    {

        if ($this->connexion === null || ! $this->connexion->isConnected()) {
            $host     = env('RABBITMQ_HOST', '127.0.0.1');
            $port     = (int) env('RABBITMQ_PORT', 5672);
            $user     = env('RABBITMQ_USER', 'guest');
            $password = env('RABBITMQ_PASSWORD', 'guest');
            $vhost    = env('RABBITMQ_VHOST', '/');

            // CloudAMQP et autres brokers cloud utilisent AMQPS (SSL sur port 5671 ou 5672).
            // On détecte automatiquement si le host est un domaine externe (pas localhost/127.0.0.1).
            $ssl = ! in_array($host, ['127.0.0.1', 'localhost', 'rabbitmq'], true);

            if ($ssl) {
                $this->connexion = \PhpAmqpLib\Connection\AMQPSSLConnection::create(
                    $host,
                    $port,
                    $user,
                    $password,
                    $vhost,
                    ['verify_peer' => false],   // tolérant pour les certs auto-signés
                    ['connection_timeout' => 5, 'read_write_timeout' => 5],
                );
            } else {
                $this->connexion = new AMQPStreamConnection(
                    $host, $port, $user, $password, $vhost,
                    connection_timeout: 5,
                    read_write_timeout: 5,
                );
            }
        }

        return $this->connexion;
    }

    public function publier(string $pattern, array $donnees, ?string $queue = null): bool {
        
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

    public function __destruct()    {
        try {
            $this->connexion?->close();
        } catch (Throwable) {
            // ignore
        }
    }
}
