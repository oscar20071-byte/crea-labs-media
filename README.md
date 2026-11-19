# Crea-Labs Media

Interfaz inicial de una plataforma de vídeos, con registro, inicio de sesión y creación de canales preparados para Supabase.

## Probar
Abre el sitio publicado o ejecuta un servidor local estático. Para probar autenticación y canales debes configurar Supabase siguiendo CONFIGURACION.md.

## Estado actual
- Página de inicio, búsqueda y filtros de demostración.
- Registro e inicio de sesión mediante Supabase Auth.
- Creación y listado de canales mediante Supabase Database.
- La subida de vídeos todavía no está habilitada; requiere almacenamiento, límites de tamaño y moderación.
- Sin configuración de Supabase, la interfaz avisa y no simula cuentas reales.

## Seguridad
La clave anon/publishable de Supabase está diseñada para el cliente y debe protegerse con políticas RLS. Nunca coloques una clave service_role, contraseñas o tokens privados en el frontend ni en GitHub.
