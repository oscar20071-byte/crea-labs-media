# Configuración de Crea-Labs Community

La aplicación fue convertida de una plataforma de vídeos a una plataforma de comunidades y chat inspirada en Discord. Esta versión utiliza Cloudflare Pages Functions y D1. **No necesita R2 ni almacenamiento de vídeos.**

## 1. Despliegue
El proyecto está conectado a GitHub y Cloudflare Pages. Los cambios de la rama principal se despliegan automáticamente. Configuración de Pages:
- Build command: vacío.
- Build output directory: `.`.
- Functions: carpeta `functions/api`.

## 2. Mantener la base de datos D1
La base existente `crea-labs-db` y la vinculación `DB` se conservan. No borres la base de datos ni ejecutes instrucciones DROP.

Para añadir las tablas de comunidades:
1. En Cloudflare abre **Storage & databases → D1 SQL Database → crea-labs-db**.
2. Abre **Console**.
3. En GitHub abre el archivo `migration_community.sql`.
4. Copia todo su contenido y pégalo en la consola SQL de D1.
5. Pulsa **Execute**. Deben crearse las tablas `guilds`, `guild_members`, `chat_channels` y `messages`.

Esta migración es aditiva: no elimina las tablas ni los usuarios existentes.

## 3. Vinculación D1
En el proyecto Pages comprueba **Settings → Functions → D1 database bindings**:
- Variable: `DB`
- Base de datos: `crea-labs-db`

No configures un bucket R2 para esta versión.

## 4. Primer uso
1. Abre https://crea-labs-media.pages.dev/.
2. Inicia sesión con tu cuenta existente o registra una nueva.
3. La primera vez se crea automáticamente una comunidad inicial con el canal `#general`.
4. Usa el botón **＋** de la barra izquierda para crear otros servidores.
5. Usa el **＋** junto a CANALES DE TEXTO para añadir canales.
6. Escribe en el cuadro inferior y pulsa Enter para enviar. Shift + Enter añade una nueva línea.

## Funciones incluidas en esta primera versión
- Registro e inicio/cierre de sesión.
- Creación de servidores/comunidades.
- Canales de texto.
- Envío y lectura de mensajes.
- Actualización automática de mensajes cada 4 segundos.
- Interfaz adaptable a escritorio y móvil.

## Funciones que todavía faltan
Los mensajes directos, invitaciones para unirse a servidores, roles configurables, permisos detallados, subida de archivos, llamadas de voz/vídeo, notificaciones y moderación avanzada todavía no están implementados. La actualización automática usa consultas periódicas a D1; no es todavía una conexión WebSocket.
