# Crea-Labs Media

Plataforma de vídeos en desarrollo, con frontend HTML/CSS/JS y backend de Cloudflare Pages Functions + D1.

## Funciones
- Interfaz de inicio, búsqueda y categorías.
- Registro e inicio de sesión.
- Sesiones seguras mediante cookie HttpOnly.
- Crear y descubrir canales.
- Preparado para ampliarse con almacenamiento R2.

## Configurar
Sigue [CONFIGURACION.md](CONFIGURACION.md). Ejecuta [cloudflare/schema.sql](cloudflare/schema.sql) en D1 y enlaza la base de datos al proyecto Pages con la variable `DB`.

La subida de vídeos todavía no está implementada. No se utiliza Supabase.
