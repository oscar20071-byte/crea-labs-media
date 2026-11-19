# Crea-Labs Media

Plataforma de vídeos con frontend HTML/CSS/JavaScript y backend Cloudflare Pages Functions.

## Funciones implementadas en esta primera versión
- Registro e inicio de sesión con sesiones seguras mediante cookie HttpOnly.
- Creación automática de un canal por cuenta.
- Subida de vídeos reales a Cloudflare R2 (máximo 90 MB por vídeo en esta versión).
- Catálogo de vídeos guardado en Cloudflare D1.
- Reproducción con soporte de solicitudes HTTP Range.
- Búsqueda y categorías.
- Likes y comentarios.

## Infraestructura
- GitHub: código fuente.
- Cloudflare Pages: web y API.
- Cloudflare Workers/Pages Functions: backend.
- Cloudflare D1: cuentas, canales y metadatos.
- Cloudflare R2: archivos de vídeo.

## Configuración
Sigue [CONFIGURACION.md](CONFIGURACION.md). Debes crear el proyecto Pages, la base de datos D1 y el bucket R2, añadir sus vinculaciones y ejecutar [schema.sql](schema.sql) en D1.

## Límites del plan gratuito
R2 incluye 10 GB-mes de almacenamiento estándar, 1 millón de operaciones Class A y 10 millones Class B al mes. Workers Free tiene 100.000 solicitudes al día y 10 ms de CPU por invocación. El plan gratuito de Cloudflare limita el cuerpo de las solicitudes entrantes a 100 MB; esta versión limita los vídeos a 90 MB. Si se superan cuotas, el servicio puede detener o generar cargos según el producto y la configuración de la cuenta. No es almacenamiento ilimitado.

## Seguridad y moderación
No publiques datos personales ni contenido que no tengas derecho a compartir. Esta versión es una base inicial; antes de abrirla al público hay que añadir moderación, reportes, protección contra abuso y herramientas de administración.
