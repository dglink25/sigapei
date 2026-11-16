<?php

namespace App\Integrations;

use RuntimeException;

/** Un microservice amont ne répond pas : l'action est refusée (503), jamais autorisée par défaut. */
class ServiceIndisponibleException extends RuntimeException {}
