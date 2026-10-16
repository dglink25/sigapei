"""Services d'upload délégué au client (règle : le fichier ne transite
jamais par le backend E-learning).

- Cloudinary : signature d'upload direct calculée en local (sha1 des
  paramètres triés + secret d'API) - aucun SDK requis.
- S3/MinIO : URL temporaire pré-signée via boto3 (import paresseux afin de
  ne pas pénaliser l'environnements sans S3).
"""
import hashlib
import time
from datetime import timedelta

from django.conf import settings

from apps.core.services import ServiceExterneNonConfigure


def generer_signature_upload_cloudinary(dossier='elearning'):
    """Paramètres + signature pour un upload direct vers Cloudinary.

    Le client poste ensuite son fichier avec ces paramètres sur
    https://api.cloudinary.com/v1_1/<cloud>/<type>/upload.
    """
    api_key = getattr(settings, 'CLOUDINARY_API_KEY', None)
    api_secret = getattr(settings, 'CLOUDINARY_API_SECRET', None)
    cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', None)
    if not (api_key and api_secret and cloud_name):
        raise ServiceExterneNonConfigure(
            'Cloudinary non configuré : renseigner CLOUDINARY_API_KEY, '
            'CLOUDINARY_API_SECRET et CLOUDINARY_CLOUD_NAME.'
        )

    params = {
        'folder': dossier,
        'timestamp': int(time.time()),
    }
    # Signature Cloudinary : sha1 des "clé=valeur" triées, + secret d'API.
    a_signer = '&'.join(
        f'{cle}={valeur}' for cle, valeur in sorted(params.items())
    )
    signature = hashlib.sha1(
        f'{a_signer}{api_secret}'.encode('utf-8')
    ).hexdigest()

    return {
        'cloud_name': cloud_name,
        'api_key': api_key,
        'timestamp': params['timestamp'],
        'folder': params['folder'],
        'signature': signature,
        'url_upload': f'https://api.cloudinary.com/v1_1/{cloud_name}/auto/upload',
    }


def generer_url_signee_s3(media, duree_secondes=3600):
    """URL temporaire pré-signée pour un média stocké sur S3/MinIO."""
    endpoint = getattr(settings, 'S3_ENDPOINT_URL', None)
    bucket = getattr(settings, 'S3_BUCKET', None)
    cle_acces = getattr(settings, 'S3_ACCESS_KEY_ID', None)
    cle_secrete = getattr(settings, 'S3_SECRET_ACCESS_KEY', None)
    if not (endpoint and bucket and cle_acces and cle_secrete):
        raise ServiceExterneNonConfigure(
            'S3/MinIO non configuré : renseigner S3_ENDPOINT_URL, S3_BUCKET, '
            'S3_ACCESS_KEY_ID et S3_SECRET_ACCESS_KEY.'
        )
    if not media.chemin_stockage:
        raise ServiceExterneNonConfigure(
            'Ce média ne possède pas de chemin S3/MinIO '
            '(chemin_stockage vide) : il est probablement hébergé sur '
            'Cloudinary.'
        )

    # Import paresseux : boto3 n'est nécessaire qu'avec un stockage S3.
    import boto3  # noqa: PLC0415

    client = boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=cle_acces,
        aws_secret_access_key=cle_secrete,
        region_name=getattr(settings, 'S3_REGION', 'us-east-1'),
    )
    return client.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': media.chemin_stockage},
        ExpiresIn=int(timedelta(seconds=duree_secondes).total_seconds()),
    )
