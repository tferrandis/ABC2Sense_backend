
# Proyecto de API con Node.js y MongoDB

Este proyecto es una API construida con Node.js, Express, MongoDB y Passport.js para la autenticación. La API incluye rutas para el registro y login de usuarios, así como la gestión de sensores.

## Requisitos

- Node.js (>= 14.x)
- MongoDB (local o en la nube, como MongoDB Atlas)

## Instalación

1. Clona este repositorio.

```bash
git clone https://github.com/tu-usuario/tu-repositorio.git
```

2. Navega a la carpeta del proyecto.

```bash
cd tu-repositorio
```

3. Instala las dependencias.

```bash
npm install
```

4. Configura las variables de entorno en un archivo `.env`.

```bash
MONGO_URI=tu-URI-de-MongoDB
JWT_SECRET=tu-secreto-para-JWT
PORT=5000
```

## Estructura del Proyecto

El proyecto tiene la siguiente estructura:

```
/controllers
    authController.js        # Lógica para registro y login de usuarios
    sensorController.js      # Lógica para la gestión de sensores
/models
    user.js                  # Definición del esquema del modelo User
    sensor.js                # Definición del esquema del modelo Sensor
/routes
    authRoutes.js            # Rutas para el registro y login de usuarios
    sensorRoutes.js          # Rutas para la gestión de sensores
/validators
    authValidator.js         # Validaciones para las rutas de autenticación
/config
    passportService.js       # Configuración de Passport.js para autenticación local y JWT
.env                         # Variables de entorno (no incluido en el repositorio)
server.js                    # Archivo principal del servidor
```

### Descripción de las carpetas y archivos

- **controllers**: Contiene la lógica de negocio de la API. Aquí están los controladores que gestionan las solicitudes y respuestas.
  - `authController.js`: Controlador para el registro y login de usuarios.
  - `sensorController.js`: Controlador para crear y listar sensores asociados a los usuarios.
  
- **models**: Define los esquemas de MongoDB usando Mongoose.
  - `user.js`: Modelo de usuario, con su esquema, validaciones y cifrado de contraseñas.
  - `sensor.js`: Modelo de sensor, asociado a un usuario y que contiene datos de ubicación y valor.
  
- **routes**: Contiene las rutas que gestionan las diferentes API endpoints.
  - `authRoutes.js`: Define las rutas de autenticación, `/api/register` y `/api/login`.
  - `sensorRoutes.js`: Define las rutas relacionadas con los sensores, protegidas por JWT.

- **validators**: Contiene los validadores de entrada para las rutas.
  - `authValidator.js`: Valida las entradas de registro y login de usuarios, incluyendo verificación de contraseñas, correos electrónicos, etc.
  
- **config**: Contiene la configuración de Passport.js para la autenticación de usuarios.
  - `passportService.js`: Configuración de la estrategia local y la estrategia JWT para la autenticación.

- **server.js**: Archivo principal que inicializa el servidor Express, conecta a MongoDB y configura las rutas.

## Uso

1. Inicia el servidor.

```bash
npm start
```

El servidor debería estar corriendo en `http://localhost:5000` (o en el puerto que hayas definido en tu archivo `.env`).

### Endpoints disponibles

- `POST /api/register`: Registro de un nuevo usuario.
  - **Campos requeridos**: `username`, `email`, `password`
  - El `password` debe tener al menos 8 caracteres, una letra mayúscula y un carácter especial.

- `POST /api/login`: Inicia sesión con un usuario registrado.
  - **Campos requeridos**: `email`, `password`
  - Si la autenticación es exitosa, se devuelve un token JWT que expira en 8 horas.

- `POST /api/sensors`: Crea un nuevo sensor asociado al usuario autenticado (requiere token JWT).
  - **Campos requeridos**: `sensorId`, `value`, `latitude`, `longitude`

- `GET /api/sensors/:userId`: Obtiene los sensores asociados a un usuario (requiere token JWT).

## Seguridad

- La API utiliza `JWT` para la autenticación de usuarios. 
- Los tokens tienen una duración de 8 horas.
- Las rutas relacionadas con sensores están protegidas mediante `passport.authenticate('jwt')`.

## Notas adicionales

- Asegúrate de tener una instancia de MongoDB corriendo localmente o configurada en un servicio en la nube como MongoDB Atlas.
- La autenticación está implementada usando `passport.js` con estrategias `Local` y `JWT`.
```

