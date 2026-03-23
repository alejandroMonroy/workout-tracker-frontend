# Workout Tracker — Frontend

Aplicación web para el registro y seguimiento de entrenamientos, construida con **React 19**, **TypeScript**, **Vite** y **Tailwind CSS 4**.

## Requisitos

- Node.js 22+
- npm 10+

## Inicio rápido

### Desarrollo local

```bash
# Instala dependencias
npm install

# Copia y configura las variables de entorno
cp .env.example .env

# Inicia el servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

> El proxy de Vite redirige las peticiones `/api/*` a `http://localhost:8000` (backend).

### Con Docker

```bash
# Construye y levanta el contenedor
docker compose up -d
```

La aplicación estará disponible en `http://localhost:3000`.

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Compila TypeScript y genera build de producción |
| `npm run preview` | Previsualiza el build de producción |
| `npm run lint` | Ejecuta ESLint |

## Estructura del proyecto

```
├── public/               # Archivos estáticos
├── src/
│   ├── assets/           # Imágenes, íconos, etc.
│   ├── components/       # Componentes reutilizables
│   │   └── ui/           # Componentes de UI base
│   ├── hooks/            # Hooks personalizados
│   ├── lib/              # Utilidades
│   ├── pages/            # Páginas / vistas
│   ├── services/         # Comunicación con la API
│   └── types/            # Tipos TypeScript
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── package.json
└── vite.config.ts
```

## Variables de entorno

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `VITE_API_URL` | URL base de la API backend | `http://localhost:8000` |
