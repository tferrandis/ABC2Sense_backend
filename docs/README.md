# ABC2Sense API Documentation

Esta documentación fue generada automáticamente usando [apiDoc](https://apidocjs.com/).

## Cómo ver la documentación

### Opción 1: A través del servidor de la aplicación (Recomendado)
Simplemente inicia el servidor y accede a:
```
http://localhost:5000/api-docs
```

El servidor automáticamente sirve la documentación en la ruta `/api-docs`.

### Opción 2: Abrir el archivo HTML directamente
Simplemente abre el archivo `index.html` en tu navegador web favorito.

### Opción 3: Servir con un servidor local
Si prefieres usar un servidor dedicado:

```bash
# Usando Python 3
cd docs
python -m http.server 8080

# Usando Python 2
cd docs
python -m SimpleHTTPServer 8080

# Usando Node.js (necesitas instalar http-server globalmente)
npm install -g http-server
cd docs
http-server -p 8080
```

Luego abre tu navegador en `http://localhost:8080`

## Regenerar la documentación

Si se realizan cambios en los controladores, puedes regenerar la documentación ejecutando:

```bash
npm run apidoc
```

## Estructura de endpoints documentados

La documentación incluye los siguientes grupos de endpoints:

- **Authentication**: Registro y login de usuarios
- **Admin**: Gestión de administradores y usuarios
- **Users**: Operaciones de usuarios
- **Sensors**: Gestión de sensores y mediciones
- **Sensor Definitions**: Definiciones de tipos de sensores
- **Measurements**: Gestión de mediciones
- **Firmware**: Gestión de firmware para dispositivos IoT

## Autenticación

La mayoría de los endpoints requieren autenticación JWT. Para autenticarte:

1. Obtén un token mediante el endpoint de login
2. Incluye el token en el header Authorization de tus requests:
   ```
   Authorization: Bearer <tu-token>
   ```

## Base URL

Todos los requests de la API deben realizarse a: `http://localhost:5000/api`
