# Global Connect

Plataforma comunitaria para estudiantes de intercambio. Descubrí restaurantes, bares, fiestas y más con promociones exclusivas.

## Stack

- **Next.js 15** — App Router, Server Components, Server Actions
- **React 19** — UI framework
- **Supabase** — Base de datos PostgreSQL, autenticación y storage
- **Vercel** — Deploy y hosting

## Getting Started

### 1. Clonar el repositorio

```bash
git clone https://github.com/LautaroRissoB/global-connect.git
cd global-connect
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiá el archivo de ejemplo y completá tus credenciales:

```bash
cp .env.local.example .env.local
```

Ver la sección [Environment Variables](#environment-variables) para más detalle.

### 4. Correr en desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.

## Environment Variables

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key de tu proyecto Supabase |

Encontrás estos valores en **Supabase Dashboard → Project Settings → API**.

## Project Structure

```
global-connect/
├── src/
│   ├── app/
│   │   ├── (user)/               # Rutas del estudiante
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── explore/          # Explorar establecimientos
│   │   │   ├── establishment/
│   │   │   │   └── [id]/         # Detalle de establecimiento
│   │   │   └── compare/          # Comparar establecimientos
│   │   └── (admin)/              # Rutas del panel admin
│   │       ├── dashboard/
│   │       ├── establishments/
│   │       │   ├── new/
│   │       │   └── [id]/
│   │       └── promotions/
│   ├── components/
│   │   ├── ui/                   # Componentes base reutilizables
│   │   ├── user/                 # Componentes de la app del estudiante
│   │   └── admin/                # Componentes del panel admin
│   ├── lib/
│   │   └── supabase/             # Clientes y helpers de Supabase
│   └── types/                    # TypeScript types compartidos
├── supabase/
│   └── migrations/               # Migraciones SQL de la base de datos
└── public/                       # Assets estáticos
```

## Deploy

El proyecto se despliega automáticamente en [Vercel](https://vercel.com) con cada push a `main`.

Configurá las variables de entorno en **Vercel Dashboard → Project → Settings → Environment Variables**.
