# Configurar Supabase

GitHub Pages aloja la web; Supabase aporta autenticación y base de datos.

1. Crea tu proyecto en https://supabase.com/.
2. En SQL Editor, pega y ejecuta el archivo supabase-schema.sql.
3. En Project Settings → API, copia Project URL y la clave publishable/anon.
4. Edita supabase-config.js y coloca esos dos valores en url y anonKey.
5. Nunca uses ni compartas la clave service_role, contraseñas o tokens privados.
6. En Authentication → URL Configuration, configura Site URL y Redirect URLs con https://oscar20071-byte.github.io/crea-labs-media/.
7. Puedes mantener habilitada la confirmación por correo; el registro pedirá confirmar el email.

## Funciones conectadas al configurar el backend
- Registro e inicio de sesión por correo.
- Un canal por cuenta.
- Listado público de canales.
- Políticas RLS para que cada usuario solo gestione su propio canal.

La subida de vídeos aún no está habilitada. Se implementará en otra etapa con almacenamiento y límites de seguridad.
