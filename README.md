# 🏋️ La Nave Strength Center - App de Reservas

App de reserva de clases grupales para **La Nave Strength Center** (Colmenar Viejo).

## Funcionalidades
- Reserva de clases: CrossFit, Halterofilia, Powerlifting, Open Box, Movilidad, Strongman
- Control de plazas disponibles en tiempo real
- Cancelación con restricción de 2 horas
- Vista semanal con selector de día
- Gestión de reservas personales
- Perfil con estadísticas y plan activo
- Diseño mobile-first instalable como PWA

## Deploy en Vercel (2 minutos)

### Opción 1: Deploy directo desde GitHub
1. Sube este proyecto a un repo de GitHub
2. Ve a [vercel.com](https://vercel.com) y haz login con GitHub
3. Click en **"Add New Project"**
4. Importa el repositorio
5. Click en **Deploy** (no necesita configurar nada)

### Opción 2: Deploy con Vercel CLI
```bash
npm i -g vercel
vercel
```

## Desarrollo local
```bash
npm install
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000)

## Stack
- Next.js 14 (App Router)
- React 18
- PWA-ready (manifest + icons)

## Instalar como app en el móvil
Una vez desplegada, abre la URL en Safari/Chrome y:
- **iOS**: Compartir → "Añadir a pantalla de inicio"
- **Android**: Menú → "Instalar aplicación" o "Añadir a pantalla de inicio"
