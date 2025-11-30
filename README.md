# ABC2Sense Backend

Backend API para la plataforma de gestión de sensores IoT ABC2Sense, construida con Node.js, Express, MongoDB y Passport.js.

## Requisitos

- Node.js (>= 14.x)
- MongoDB (local o en la nube, como MongoDB Atlas)

## Instalación

1. Clona este repositorio:
```bash
git clone https://github.com/tu-usuario/ABC2Sense_Backend.git
cd ABC2Sense_Backend
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno en un archivo `.env`:
```bash
MONGO_URI=tu-URI-de-MongoDB
JWT_SECRET=tu-secreto-para-JWT
PORT=5000
```

## Uso

### Iniciar el servidor

Modo desarrollo (con auto-reload):
```bash
npm run dev
```

Modo producción:
```bash
npm start
```

El servidor estará corriendo en `http://localhost:5000` (o en el puerto configurado en `.env`).

## Documentación de la API

### Acceder a la documentación

Una vez que el servidor esté corriendo, puedes acceder a la documentación completa de la API en:

**Desarrollo local:**
```
http://localhost:5000/api-docs
http://localhost:5000/api/docs
```

**Producción:**
```
http://167.86.91.53/api/docs
```

> **Nota:** En producción, primero debes configurar Nginx. Ver sección "Configurar Nginx" más abajo.

### Regenerar la documentación

Si realizas cambios en los controladores, puedes regenerar la documentación ejecutando:

```bash
npm run apidoc
```

La documentación se genera automáticamente a partir de las anotaciones en los controladores usando [apiDoc](https://apidocjs.com/).

### Configurar Nginx (Producción)

Para que la documentación sea accesible en producción a través de `http://167.86.91.53/api/docs`:

**Opción A: Script automático (Recomendado)**
```bash
cd /root/sensor/ABC2Sense_backend
sudo ./scripts/update-nginx.sh
```

**Opción B: Manual**
```bash
# 1. Hacer backup de la configuración actual
sudo cp /etc/nginx/sites-available/catabo_front /etc/nginx/sites-available/catabo_front.backup

# 2. Copiar la nueva configuración
sudo cp nginx-catabo_front-updated.conf /etc/nginx/sites-available/catabo_front

# 3. Verificar sintaxis
sudo nginx -t

# 4. Si todo está bien, recargar Nginx
sudo systemctl reload nginx
```

El script hace backup automático de tu configuración actual antes de aplicar cambios.

## Estructura del Proyecto

```
/src
  /controllers          # Lógica de negocio
    authController.js       # Autenticación de usuarios
    adminController.js      # Gestión de administradores
    userController.js       # Gestión de usuarios
    sensorController.js     # Gestión de sensores y mediciones
    measurementsController.js # Gestión de mediciones
    firmwareController.js   # Gestión de firmware OTA
  /models              # Modelos de MongoDB
    user.js                # Usuario
    admin.js               # Administrador
    sensor.js              # Sensor
    sensorDefinition.js    # Definición de tipos de sensores
    measurement.js         # Mediciones
    firmware.js            # Firmware
  /routes              # Definición de rutas
    authRoutes.js          # Rutas de autenticación
    adminRoutes.js         # Rutas de administración
    userRoutes.js          # Rutas de usuarios
    sensorRoutes.js        # Rutas de sensores
    measurements.js        # Rutas de mediciones
    firmwareRoutes.js      # Rutas de firmware
  /validators          # Validadores de entrada
  /config              # Configuración
    passportService.js     # Configuración de Passport.js
  /middleware          # Middlewares personalizados
  server.js            # Punto de entrada del servidor
/docs                  # Documentación generada de la API
```

## Principales Características

### Autenticación y Autorización
- Sistema de autenticación basado en JWT
- Roles de usuario y administrador
- Tokens con expiración de 8 horas

### Gestión de Sensores
- Creación y definición de tipos de sensores
- Registro de mediciones con coordenadas GPS
- Filtrado por rango de fechas y ubicación (radio)
- Paginación de resultados

### Panel de Administración
- Gestión de usuarios
- Estadísticas del sistema
- Control de acceso basado en roles (admin/superadmin)

### Gestión de Firmware OTA
- Subida de archivos de firmware
- Versionamiento de firmware
- Distribución a dispositivos IoT
- Control de versiones activas

### Mediciones
- Almacenamiento de múltiples sensores simultáneamente
- Agrupación por timestamp y ubicación
- Consultas con filtros geoespaciales

## Endpoints Principales

### Autenticación
- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Login de usuarios
- `POST /api/auth` - Login de administradores

### Sensor Definitions
- `GET /api/sensor/definitions` - Obtener definiciones de sensores
- `POST /api/sensor/definitions` - Crear definición de sensor

### Measurements
- `POST /api/measurements` - Crear medición con múltiples sensores
- `GET /api/measurements` - Obtener mediciones (con filtros de fecha, ubicación y paginación)
- `DELETE /api/measurements/:id` - Eliminar una medición

### Administración
- `GET /api/auth/users` - Listar usuarios
- `GET /api/auth/stats` - Estadísticas del sistema
- `DELETE /api/auth/users/:id` - Eliminar usuario

### Firmware
- `POST /api/firmware/upload` - Subir firmware (admin)
- `GET /api/firmware/latest` - Obtener firmware activo
- `GET /api/firmware/download/:id` - Descargar firmware

Para ver la documentación completa de todos los endpoints, visita `/api-docs` cuando el servidor esté corriendo.

## Seguridad

- Autenticación JWT para protección de endpoints
- Bcrypt para hash de contraseñas
- Validación de entrada con express-validator
- Control de acceso basado en roles
- Tokens con expiración configurable

## Scripts Disponibles

- `npm start` - Iniciar servidor en modo producción
- `npm run dev` - Iniciar servidor en modo desarrollo con auto-reload
- `npm run apidoc` - Generar documentación de la API

## Tecnologías Utilizadas

- **Express.js** - Framework web
- **MongoDB & Mongoose** - Base de datos y ODM
- **Passport.js** - Autenticación (Local & JWT)
- **bcryptjs** - Hash de contraseñas
- **express-validator** - Validación de entrada
- **Multer** - Upload de archivos (firmware)
- **apiDoc** - Generación de documentación

## Licencia

ISC
