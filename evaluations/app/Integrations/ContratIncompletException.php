<?php

namespace App\Integrations;

use RuntimeException;

/** Un champ du contrat d'interface demandé à un autre microservice n'est pas encore fourni (=> 503). */
class ContratIncompletException extends RuntimeException {}
