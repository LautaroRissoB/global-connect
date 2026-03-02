# Global Connect — Deploy en 5 minutos

## Opción 1: Vercel (recomendado, gratis)

1. Crear cuenta en vercel.com (gratis)
2. Instalar Vercel CLI: `npm i -g vercel`
3. Desde esta carpeta: `vercel deploy --prod`
4. Seguir los pasos en la terminal

URLs resultado:
- `tu-proyecto.vercel.app` → landing page
- `tu-proyecto.vercel.app/app` → app estudiantes
- `tu-proyecto.vercel.app/admin` → panel admin

## Opción 2: Netlify (drag & drop, más fácil)

1. Ir a netlify.com → "Add new site" → "Deploy manually"
2. Arrastrar esta carpeta al área de drop
3. Listo — te da una URL en segundos

## Opción 3: GitHub Pages (gratis, persistente)

1. Crear repo en github.com
2. Subir estos archivos
3. Settings → Pages → Source: main / root
4. URL: `tu-usuario.github.io/tu-repo`

---

## Archivos incluidos

| Archivo | Descripción |
|---|---|
| `index.html` | Landing page para negocios (principal) |
| `global-connect-demo.html` | App de estudiantes (demo) |
| `global-connect-admin.html` | Panel de administración |
| `vercel.json` | Configuración para Vercel |

## Email de contacto

Cambiar `hola@globalconnect.app` por el email real en `index.html` línea ~310.

---

## Próximos pasos (cuando tengas los primeros clientes)

1. **Dominio propio** (€10/año): globalconnect.app en Namecheap/Cloudflare
2. **Base de datos real**: Conectar Supabase (ya está configurado en /global-connect/)
3. **Auth estudiantes**: Email universitario o Google OAuth
4. **Auth admin**: Login seguro por negocio

El proyecto React+TypeScript+Supabase en `/global-connect/` ya tiene las credenciales configuradas
y está listo para ser la versión de producción cuando escales.
