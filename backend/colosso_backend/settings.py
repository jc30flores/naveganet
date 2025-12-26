from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-key')
DEBUG = os.getenv('DJANGO_DEBUG', 'True') == 'True'
ALLOWED_HOSTS = ["localhost", "127.0.0.1", ".trycloudflare.com", ".ngrok.io", ".ngrok-free.app", ".cheros.dev"]

INSTALLED_APPS = ['django.contrib.admin','django.contrib.auth','django.contrib.contenttypes','django.contrib.sessions','django.contrib.messages','django.contrib.staticfiles','rest_framework','corsheaders','apps.api']

MIDDLEWARE = ['corsheaders.middleware.CorsMiddleware','django.middleware.security.SecurityMiddleware','django.contrib.sessions.middleware.SessionMiddleware','django.middleware.common.CommonMiddleware','django.middleware.csrf.CsrfViewMiddleware','django.contrib.auth.middleware.AuthenticationMiddleware','django.contrib.messages.middleware.MessageMiddleware','django.middleware.clickjacking.XFrameOptionsMiddleware']

ROOT_URLCONF = 'colosso_backend.urls'

TEMPLATES = [{ 'BACKEND':'django.template.backends.django.DjangoTemplates','DIRS':[],'APP_DIRS':True,'OPTIONS':{'context_processors':['django.template.context_processors.debug','django.template.context_processors.request','django.contrib.auth.context_processors.auth','django.contrib.messages.context_processors.messages']}}]

WSGI_APPLICATION = 'colosso_backend.wsgi.application'

DATABASES = {'default': {'ENGINE':'django.db.backends.postgresql','NAME':os.getenv('DB_NAME','coloso'),'USER':os.getenv('DB_USER','jarvis'),'PASSWORD':os.getenv('DB_PASSWORD','diez2030'),'HOST':os.getenv('DB_HOST','localhost'),'PORT':os.getenv('DB_PORT','5432')}}

LANGUAGE_CODE='es'
TIME_ZONE='America/El_Salvador'
USE_I18N=True
USE_TZ=True

STATIC_URL='/static/'
STATIC_ROOT=BASE_DIR/'staticfiles'

# Para desarrollo con túneles, permitir todos los orígenes temporalmente
# En producción, usar CORS_ALLOWED_ORIGINS con dominios específicos
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'True') == 'True'

# Configuración adicional de CORS
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Si prefieres especificar orígenes manualmente, descomenta esto y comenta la línea anterior:
# CORS_ALLOWED_ORIGINS = [
#     "http://localhost:8080",
#     "http://127.0.0.1:8080",
#     "http://localhost:5173",
#     "http://127.0.0.1:5173",
#     "http://localhost:9000",
#     "http://127.0.0.1:9000",
#     # Agregar aquí la URL del túnel cuando la tengas, ej:
#     # "https://xxxxx.trycloudflare.com",
# ]

CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ["Content-Disposition", "X-Filename"]
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:9000",
    "http://127.0.0.1:9000",
    "https://*.trycloudflare.com",
    "https://*.ngrok.io",
    "https://*.ngrok-free.app",
    "https://*.cheros.dev",
]

REST_FRAMEWORK = {
    "COERCE_DECIMAL_TO_STRING": False,
    "URL_FORMAT_OVERRIDE": None,
}

PRICE_OVERRIDE_CODE = os.getenv("PRICE_OVERRIDE_CODE", "123456")
RATE_LIMIT_OVERRIDE_TTL = int(os.getenv("RATE_LIMIT_OVERRIDE_TTL", "180"))
RATE_LIMIT_OVERRIDE_MAX_ATTEMPTS = int(os.getenv("RATE_LIMIT_OVERRIDE_MAX_ATTEMPTS", "3"))

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
        "LOCATION": BASE_DIR / "cache",
    }
}
