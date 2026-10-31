<?php

namespace App\Integrations;

use RuntimeException;

/** Un champ du contrat d'interface attendu d'un autre microservice manque (=> 503). */
class ContratIncompletException extends RuntimeException {}
