# Configuración de Crea-Labs Media con Cloudflare (sin Supabase)

La aplicación usa Cloudflare Pages Functions como API y Cloudflare D1 como base de datos. No utiliza Supabase.

## 1. Crear la base de datos D1
1. Abre https://dash.cloudflare.com/ y entra en **Workers & Pages → D1 SQL Database**.
2. Crea una base de datos llamada `crea-labs-db`.
3. Abre la base de datos y ejecuta el SQL del archivo `cloudflare/schema.sql`.

## 2. Conectar D1 con Pages
1. En Cloudflare, abre **Workers & Pages** y selecciona tu proyecto Pages.
2. Ve a **Settings → Bindings → Add → D1 database**.
3. En **Variable name** escribe exactamente `DB`.
4. Selecciona la base `crea-labs-db`, guarda y vuelve a desplegar el proyecto.

La función de servidor está en `functions/api/[[path]].js`. Pages Functions usa rutas basadas en archivos; la carpeta functions debe estar en la raíz del proyecto.

## 3. Publicar en Cloudflare Pages
1. Entra a **Workers & Pages → Create → Pages → Connect to Git**.
2. Conecta GitHub y selecciona `oscar20071-byte/crea-labs-media`.
3. Para este sitio HTML estático, deja el comando de compilación vacío y usa `/` como directorio de salida.
4. Despliega. Después configura el binding D1 descrito arriba y vuelve a desplegar.

## Funciones preparadas
- Registro e inicio de sesión con contraseñas derivadas con PBKDF2.
- Sesiones con cookies HttpOnly, Secure y SameSite.
- Crear un canal por cuenta y listar canales públicos.
- Consultas SQL parametrizadas.

## Importante
- No hay claves de Supabase ni servicios externos de autenticación.
- La subida de vídeos todavía no está implementada; R2 será la opción de almacenamiento de objetos para esa etapa.
- El proyecto de Pages debe tener D1 enlazado con el nombre de variable `DB`. Sin ese binding, la API responde con un aviso de configuración.
