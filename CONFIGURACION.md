# Configuración de Crea-Labs Media en Cloudflare (sin Firebase ni Supabase)

Esta guía usa los servicios de Cloudflare con sus cuotas gratuitas. No se puede prometer gratuidad ilimitada: hay límites de almacenamiento, solicitudes y operaciones.

## 1. Crear el proyecto de Pages
1. Inicia sesión en https://dash.cloudflare.com/.
2. Abre **Workers & Pages → Create application → Pages → Connect to Git**.
3. Conecta GitHub y selecciona `oscar20071-byte/crea-labs-media`.
4. Deja el comando de compilación vacío y establece el directorio de salida como `/` o `.` según lo que acepte el panel.
5. Crea el proyecto. La carpeta `functions/api` publica la API junto con la página.

## 2. Crear la base de datos D1
1. En Cloudflare abre **Storage & databases → D1 SQL Database**.
2. Crea una base de datos llamada `crea-labs-db`.
3. Abre la consola SQL de esa base y ejecuta todo el contenido de `schema.sql`.
4. En el proyecto Pages entra en **Settings → Functions → D1 database bindings**.
5. Añade una vinculación con variable `DB` y selecciona `crea-labs-db`.
6. Guarda y vuelve a desplegar Pages.

## 3. Crear el almacenamiento R2
1. Abre **R2 Object Storage** y crea un bucket llamado `crea-labs-videos`.
2. En tu proyecto Pages abre **Settings → Functions → R2 bucket bindings**.
3. Añade una vinculación con variable `VIDEOS` y selecciona `crea-labs-videos`.
4. Guarda y vuelve a desplegar Pages.

No hace falta hacer público el bucket: los vídeos se entregan mediante la API y la función comprueba que el vídeo exista en la base de datos.

## 4. Probar la plataforma
1. Abre la dirección `*.pages.dev` que Cloudflare asigne.
2. Registra una cuenta con un correo tuyo y una contraseña única de al menos 10 caracteres.
3. Pulsa **Subir vídeo**, completa título/categoría y elige un archivo de vídeo menor de 90 MB.
4. Al terminar, el vídeo aparecerá en el inicio. Ábrelo para reproducir, dar like y comentar.

## Límites importantes del plan gratuito
- R2 Standard: 10 GB-mes de almacenamiento, 1 millón de operaciones Class A y 10 millones Class B al mes.
- Workers Free: 100.000 solicitudes por día y 10 ms de CPU por invocación.
- Las solicitudes entrantes a Workers/Pages Functions en el plan Free tienen un máximo de cuerpo de 100 MB; la app limita cada vídeo a 90 MB.
- D1 Free: hasta 500 MB por base de datos y 5 GB de almacenamiento total por cuenta, además de límites de lecturas/escrituras.

Comprueba siempre los límites actuales en el panel de Cloudflare. No actives un plan de pago ni agregues un método de pago si quieres mantener el proyecto en el nivel gratuito.

## Lo que aún falta para una plataforma pública
Esta versión es un MVP funcional, no un clon completo de YouTube. Antes de invitar a muchas personas hay que añadir moderación y reportes, recuperación de cuenta, límites anti-spam, administración, eliminación de vídeos/cuentas, miniaturas, transcodificación y carga reanudable para archivos grandes.
