# Configuración de Crea-Labs Media (Netlify + Firebase)

Esta versión usa **Netlify** para publicar la web y **Firebase Authentication + Cloud Firestore** para las cuentas y los canales. No usa Supabase ni Cloudflare.

## 1. Crear el proyecto Firebase
1. Abre https://console.firebase.google.com/ e inicia un proyecto.
2. En **Authentication → Get started → Sign-in method**, activa **Email/Password**.
3. En **Firestore Database**, crea una base de datos. Para comenzar, elige el modo de producción.
4. En **Project settings → General → Your apps**, añade una aplicación web y copia la configuración que Firebase muestra.

## 2. Poner la configuración web
Abre `firebase-config.js` en GitHub y sustituye:
- `REEMPLAZAR_API_KEY` por `apiKey`.
- `REEMPLAZAR_PROJECT_ID` por el ID de tu proyecto (en los dos lugares).
- `REEMPLAZAR_APP_ID` por `appId`.

La configuración web de Firebase identifica el proyecto y no es una contraseña. Nunca publiques contraseñas, claves privadas ni archivos de cuenta de servicio.

## 3. Publicar las reglas de Firestore
En Firebase Console → Firestore Database → Rules, pega el contenido de `firestore.rules` y pulsa **Publish**. Estas reglas permiten leer canales públicos y que cada cuenta gestione únicamente su propio canal.

## 4. Publicar en Netlify
1. Abre https://app.netlify.com/ y elige **Add new project → Import an existing project**.
2. Conecta GitHub y selecciona `oscar20071-byte/crea-labs-media`.
3. Deja el comando de build vacío y el directorio de publicación como `.` (punto).
4. Pulsa **Deploy**. Netlify volverá a publicar automáticamente cuando actualices el repositorio.

## Qué funciona y qué falta
- La página, la búsqueda y las categorías.
- Registro e inicio de sesión por correo.
- Crear y descubrir canales con Firestore.
- La subida y reproducción real de vídeos todavía no está implementada. No uses Firebase Storage para esta primera versión sin revisar antes la facturación: los nuevos buckets requieren el plan Blaze, aunque exista una cuota sin coste. No añadas un método de pago para seguir esta guía.

## Coste
Netlify ofrece un plan gratuito con límites mensuales. Firebase ofrece Authentication y cuotas gratuitas de Firestore. Si la web supera las cuotas, puede dejar de funcionar o requerir otro plan; revisa los límites antes de abrirla al público.
