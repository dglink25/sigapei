FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /code

# Installer les dépendances d'abord (cache Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Puis copier le code
COPY . .

EXPOSE 8000

# Serveur de développement Django
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
