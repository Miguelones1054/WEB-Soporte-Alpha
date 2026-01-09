# 🚀 Guía Completa de Despliegue: FastAPI + Uvicorn + VPS

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Preparación del Código](#preparación-del-código)
4. [Configuración del VPS](#configuración-del-vps)
5. [Instalación de Dependencias](#instalación-de-dependencias)
6. [Configuración del Dominio](#configuración-del-dominio)
7. [Configuración de Nginx (Reverse Proxy)](#configuración-de-nginx-reverse-proxy)
8. [SSL con Let's Encrypt](#ssl-con-lets-encrypt)
9. [Configuración del Servicio Systemd](#configuración-del-servicio-systemd)
10. [Despliegue y Pruebas](#despliegue-y-pruebas)
11. [Monitoreo y Logs](#monitoreo-y-logs)
12. [Actualizaciones](#actualizaciones)
13. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Introducción

Esta guía explica el proceso completo de despliegue de una aplicación **FastAPI** con **Uvicorn** en un VPS Ubuntu. El resultado final será una API RESTful segura, escalable y con monitoreo.

### Arquitectura Final:
```
Internet → Cloudflare → Nginx (Puerto 80/443) → Uvicorn (Puerto 8000) → FastAPI App
```

### Tecnologías Utilizadas:
- **FastAPI**: Framework web moderno para APIs Python
- **Uvicorn**: Servidor ASGI de alto rendimiento
- **Nginx**: Servidor web y reverse proxy
- **Systemd**: Gestión de servicios del sistema
- **Let's Encrypt**: Certificados SSL gratuitos
- **Ubuntu**: Sistema operativo del VPS

---

## 📋 Requisitos Previos

### VPS
- Ubuntu 20.04/22.04 LTS
- Mínimo 1GB RAM, 1 vCPU
- Acceso root o sudo
- Puerto 22 abierto (SSH)

### Dominio
- Dominio registrado (ej: `miapi.com`)
- Acceso a configuración DNS

### Conocimientos
- Bash/Linux básico
- Python básico
- Conceptos de APIs REST

---

## 🛠️ Preparación del Código

### 1. Estructura del Proyecto

Crea esta estructura en tu máquina local:

```
mi-api-fastapi/
├── app/
│   ├── __init__.py
│   ├── main.py          # Punto de entrada FastAPI
│   ├── config.py        # Configuraciones
│   ├── models.py        # Modelos de datos
│   ├── routes/
│   │   ├── __init__.py
│   │   └── api.py       # Endpoints de la API
│   └── dependencies.py
├── requirements.txt     # Dependencias Python
├── Dockerfile          # (Opcional) Para contenedorización
├── .env.example        # Variables de entorno ejemplo
└── README.md
```

### 2. Archivo principal FastAPI (`app/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.api import router as api_router

app = FastAPI(
    title="Mi API FastAPI",
    description="API RESTful con FastAPI",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc"  # ReDoc
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rutas
app.add_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "API FastAPI funcionando"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### 3. Archivo de rutas (`app/routes/api.py`)

```python
from fastapi import APIRouter, HTTPException
from typing import List

router = APIRouter()

# Ejemplo de endpoints
@router.get("/items/", response_model=List[dict])
async def get_items():
    """Obtener lista de items"""
    return [
        {"id": 1, "name": "Item 1", "description": "Descripción del item 1"},
        {"id": 2, "name": "Item 2", "description": "Descripción del item 2"}
    ]

@router.get("/items/{item_id}")
async def get_item(item_id: int):
    """Obtener un item específico"""
    if item_id not in [1, 2]:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"id": item_id, "name": f"Item {item_id}"}

@router.post("/items/")
async def create_item(item: dict):
    """Crear un nuevo item"""
    return {"message": "Item created", "item": item}
```

### 4. Archivo `requirements.txt`

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
python-dotenv==1.0.0
```

### 5. Archivo de configuración (`app/config.py`)

```python
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # API
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))

    # Base de datos (ejemplo con PostgreSQL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/db")

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "tu-clave-secreta")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Entorno
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

settings = Settings()
```

### 6. Archivo `.env.example`

```
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql://user:password@localhost/db
SECRET_KEY=tu-clave-secreta-muy-segura
DEBUG=false
```

---

## 🖥️ Configuración del VPS

### 1. Conectar al VPS

```bash
# Conectar por SSH
ssh root@tu-vps-ip

# O si tienes usuario sudo
ssh usuario@tu-vps-ip
sudo -i  # Convertirse en root
```

### 2. Actualizar el sistema

```bash
# Actualizar paquetes
apt update && apt upgrade -y

# Instalar utilidades básicas
apt install -y curl wget git htop nano ufw
```

### 3. Configurar Firewall

```bash
# Configurar UFW
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

# Verificar estado
ufw status
```

### 4. Crear usuario para la aplicación

```bash
# Crear usuario sin shell interactivo
useradd -m -s /bin/bash apiuser

# Crear directorio para la aplicación
mkdir -p /home/apiuser/app
chown -R apiuser:apiuser /home/apiuser/app
```

---

## 📦 Instalación de Dependencias

### 1. Instalar Python y pip

```bash
# Instalar Python 3.11 (o la versión más reciente disponible)
apt install -y python3 python3-pip python3-venv

# Verificar instalación
python3 --version
pip3 --version
```

### 2. Instalar y configurar PostgreSQL (opcional)

```bash
# Instalar PostgreSQL
apt install -y postgresql postgresql-contrib

# Iniciar servicio
systemctl start postgresql
systemctl enable postgresql

# Crear base de datos y usuario
sudo -u postgres psql
CREATE DATABASE miapi;
CREATE USER apiuser WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE miapi TO apiuser;
\q
```

### 3. Instalar Nginx

```bash
# Instalar Nginx
apt install -y nginx

# Verificar estado
systemctl status nginx
```

---

## 🌐 Configuración del Dominio

### 1. Configurar DNS

En el panel de tu proveedor de dominio, configura estos registros:

```
Tipo: A
Nombre: api ó @ (raíz)
Valor: TU_VPS_IP

Tipo: A
Nombre: www
Valor: TU_VPS_IP
```

### 2. Probar resolución DNS

```bash
# Probar desde tu VPS
nslookup apiadm.nequialpha.com

# O usando dig
dig apiadm.nequialpha.com
```

---

## 🔄 Configuración de Nginx (Reverse Proxy)

### 1. Crear configuración de Nginx

```bash
# Crear archivo de configuración
nano /etc/nginx/sites-available/fastapi-api
```

Contenido del archivo:

```nginx
# Upstream para Uvicorn
upstream fastapi_app {
    server 127.0.0.1:8000;
}

# Redirección HTTP a HTTPS
server {
    listen 80;
    server_name apiadm.nequialpha.com www.apiadm.nequialpha.com;
    return 301 https://$server_name$request_uri;
}

# Servidor HTTPS principal
server {
    listen 443 ssl http2;
    server_name apiadm.nequialpha.com www.apiadm.nequialpha.com;

    # SSL (se configurará después con Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/apiadm.nequialpha.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/apiadm.nequialpha.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Logs
    access_log /var/log/nginx/api_access.log;
    error_log /var/log/nginx/api_error.log;

    # Configuración de proxy
    location / {
        proxy_pass http://fastapi_app;

        # Headers importantes
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffers
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Documentación de la API
    location /docs {
        proxy_pass http://fastapi_app/docs;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /redoc {
        proxy_pass http://fastapi_app/redoc;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /openapi.json {
        proxy_pass http://fastapi_app/openapi.json;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Endpoint de health check (sin proxy)
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Archivos estáticos (CSS, JS, imágenes de documentación)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://fastapi_app;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Seguridad
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 2. Habilitar el sitio

```bash
# Crear enlace simbólico
ln -s /etc/nginx/sites-available/fastapi-api /etc/nginx/sites-enabled/

# Deshabilitar sitio por defecto
rm -f /etc/nginx/sites-enabled/default

# Probar configuración
nginx -t

# Recargar Nginx
systemctl reload nginx
```

---

## 🔒 SSL con Let's Encrypt

### 1. Instalar Certbot

```bash
# Instalar snapd si no está instalado
apt install -y snapd
snap install core; snap refresh core

# Instalar certbot
snap install --classic certbot

# Crear enlace simbólico
ln -s /snap/bin/certbot /usr/bin/certbot
```

### 2. Obtener certificado SSL

```bash
# Detener nginx temporalmente (certbot lo necesita)
systemctl stop nginx

# Obtener certificado
certbot certonly --standalone -d apiadm.nequialpha.com -d www.apiadm.nequialpha.com

# Iniciar nginx nuevamente
systemctl start nginx
```

### 3. Configurar renovación automática

```bash
# Probar renovación
certbot renew --dry-run

# Verificar que existe el cron job
crontab -l | grep certbot
```

---

## ⚙️ Configuración del Servicio Systemd

### 1. Crear archivo de servicio

```bash
nano /etc/systemd/system/fastapi.service
```

Contenido del archivo:

```ini
[Unit]
Description=FastAPI Application
After=network.target
Requires=network.target

[Service]
Type=simple
User=apiuser
Group=apiuser
WorkingDirectory=/home/apiuser/app
Environment=PATH=/home/apiuser/app/venv/bin
Environment=PYTHONPATH=/home/apiuser/app
ExecStart=/home/apiuser/app/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=5

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=fastapi

# Security
NoNewPrivileges=yes
PrivateTmp=yes

# Limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

### 2. Crear archivo de configuración de entorno

```bash
# Crear directorio para configuración
mkdir -p /home/apiuser/config
chown apiuser:apiuser /home/apiuser/config

# Archivo de variables de entorno
nano /home/apiuser/config/.env
```

Contenido del archivo `.env`:

```bash
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql://apiuser:tu_password_seguro@localhost/miapi
SECRET_KEY=tu-clave-secreta-muy-muy-segura-generada-aleatoriamente
DEBUG=false
```

### 3. Gestionar el servicio

```bash
# Recargar systemd
systemctl daemon-reload

# Habilitar el servicio
systemctl enable fastapi

# Iniciar el servicio
systemctl start fastapi

# Verificar estado
systemctl status fastapi

# Ver logs
journalctl -u fastapi -f
```

---

## 🚀 Despliegue y Pruebas

### 1. Subir código al VPS

```bash
# En tu máquina local
git add .
git commit -m "Ready for deployment"
git push origin main

# En el VPS (como usuario apiuser)
cd /home/apiuser/app
git clone https://github.com/tu-usuario/tu-repo.git .
```

### 2. Instalar dependencias en el VPS

```bash
# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Verificar instalación
which uvicorn
uvicorn --version
```

### 3. Probar la aplicación localmente

```bash
# Probar que funciona
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000

# En otra terminal probar
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/docs
```

### 4. Reiniciar servicios

```bash
# Reiniciar FastAPI
systemctl restart fastapi

# Reiniciar Nginx
systemctl reload nginx

# Verificar estado
systemctl status fastapi
systemctl status nginx
```

### 5. Probar desde internet

```bash
# Probar endpoints
curl https://apiadm.nequialpha.com/
curl https://apiadm.nequialpha.com/health
curl https://apiadm.nequialpha.com/api/v1/items/

# Probar documentación
# Abrir en navegador: https://apiadm.nequialpha.com/docs
```

---

## 📊 Monitoreo y Logs

### 1. Logs del sistema

```bash
# Logs de FastAPI
journalctl -u fastapi -f

# Logs de Nginx
tail -f /var/log/nginx/api_access.log
tail -f /var/log/nginx/api_error.log

# Logs del sistema
journalctl -f
```

### 2. Monitoreo de recursos

```bash
# Uso de CPU y memoria
htop

# Uso del disco
df -h

# Procesos
ps aux | grep uvicorn
ps aux | grep nginx
```

### 3. Health checks

```bash
# Health check interno
curl http://127.0.0.1:8000/health

# Health check externo
curl https://apiadm.nequialpha.com/health
```

### 4. Configurar logrotate (opcional)

```bash
# Configurar rotación de logs de Nginx
nano /etc/logrotate.d/nginx

# Agregar:
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 www-data adm
    postrotate
        systemctl reload nginx
    endscript
}
```

---

## 🔄 Actualizaciones

### 1. Actualización manual

```bash
# Detener servicios
systemctl stop fastapi

# Actualizar código
cd /home/apiuser/app
git pull origin main

# Actualizar dependencias (si requirements.txt cambió)
source venv/bin/activate
pip install -r requirements.txt

# Ejecutar migraciones de BD (si aplica)
# alembic upgrade head

# Probar que funciona
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
# Probar endpoints...
# Matar el proceso de prueba: kill %1

# Reiniciar servicio
systemctl start fastapi

# Verificar
systemctl status fastapi
curl https://apiadm.nequialpha.com/health
```

### 2. Rollback (volver atrás)

```bash
# Si algo sale mal
cd /home/apiuser/app
git log --oneline -5
git checkout COMMIT_HASH_ANTERIOR

# Reiniciar
systemctl restart fastapi
```

---

## 🐛 Solución de Problemas

### Problema: FastAPI no inicia

```bash
# Ver logs detallados
journalctl -u fastapi -n 50

# Probar manualmente
cd /home/apiuser/app
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Verificar puerto
netstat -tulpn | grep 8000
```

### Problema: Nginx devuelve 502

```bash
# Verificar que FastAPI está corriendo
systemctl status fastapi

# Verificar conectividad
curl http://127.0.0.1:8000/

# Ver logs de Nginx
tail -20 /var/log/nginx/api_error.log
```

### Problema: Error de permisos

```bash
# Verificar permisos
ls -la /home/apiuser/app/
ls -la /home/apiuser/config/

# Corregir permisos
chown -R apiuser:apiuser /home/apiuser/
chmod 600 /home/apiuser/config/.env
```

### Problema: Certificado SSL expirado

```bash
# Renovar certificado
certbot renew

# Recargar Nginx
systemctl reload nginx
```

### Problema: Alta carga del servidor

```bash
# Ver procesos
htop

# Ver conexiones
netstat -antp | grep 8000

# Ajustar workers en systemd (aumentar o disminuir)
# Editar /etc/systemd/system/fastapi.service
# Cambiar --workers 4 por --workers 2 o 8
systemctl daemon-reload
systemctl restart fastapi
```

---

## 📚 Comandos Útiles de Referencia

```bash
# Gestión de servicios
systemctl start fastapi          # Iniciar
systemctl stop fastapi           # Detener
systemctl restart fastapi        # Reiniciar
systemctl status fastapi         # Estado
systemctl enable fastapi         # Auto-inicio
systemctl disable fastapi        # Deshabilitar auto-inicio

# Gestión de Nginx
systemctl reload nginx           # Recargar configuración
systemctl restart nginx          # Reiniciar
nginx -t                         # Probar configuración

# Logs
journalctl -u fastapi -f         # Logs de FastAPI
journalctl -u nginx -f           # Logs de Nginx
tail -f /var/log/nginx/api_access.log  # Logs de acceso

# Monitoreo
htop                             # Monitoreo de sistema
df -h                            # Espacio en disco
free -h                          # Memoria RAM
```

---

## 🎯 Conclusión

Siguiendo esta guía, tendrás una API FastAPI completamente desplegada y configurada para producción con:

- ✅ **Alta disponibilidad** con systemd
- ✅ **Balanceo de carga** con múltiples workers
- ✅ **Seguridad SSL** con Let's Encrypt
- ✅ **Proxy reverso** con Nginx
- ✅ **Monitoreo y logs** completos
- ✅ **Configuración optimizada** para producción

### Próximos pasos recomendados:

1. **Configurar CI/CD** para despliegues automáticos
2. **Agregar monitoreo** con Prometheus/Grafana
3. **Configurar backups** automáticos
4. **Implementar rate limiting** en Nginx
5. **Configurar firewall** avanzado con fail2ban

---

## 📞 Soporte

Si encuentras problemas durante el despliegue:

1. Revisa los logs: `journalctl -u fastapi -n 50`
2. Verifica la conectividad: `curl http://127.0.0.1:8000/health`
3. Confirma permisos: `ls -la /home/apiuser/app/`
4. Revisa la configuración de Nginx: `nginx -t`

**¡Éxito con tu despliegue!** 🚀
