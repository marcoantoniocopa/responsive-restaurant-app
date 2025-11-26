# Restaurant Manager Frontend

Modern React-based frontend for restaurant order management system with Keycloak authentication, role-based routing, and real-time operations.

## Features

- 🔐 **Keycloak Authentication** - Enterprise-grade SSO with JWT tokens
- 🎭 **Role-Based Access Control** - Automatic routing based on user roles
- 🔄 **Auto Token Refresh** - Tokens automatically refresh before expiry (8-hour sessions)
- 🧭 **Smart Navigation** - Tab-based navigation with role visibility
- 🍽️ **Order Management** - Create and track orders from multiple sources
- 👨‍🍳 **Kitchen View** - Real-time kitchen order display (for kitchen staff)
- 💰 **Cashier View** - Point of sale and order processing (for cashiers)
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices

## Prerequisites

- Node.js 18+ and npm
- Backend API running (see `../restaurant-app-api/README.md`)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```bash
VITE_API_URL=http://localhost:3000/api/v1
```

### 3. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### 4. Login

Use one of these default accounts:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Cashier | `cashier` | `cashier123` |
| Kitchen | `kitchen` | `kitchen123` |

## Build for Production

```bash
npm run build
```

Built files will be in the `dist/` directory.

## Project Structure

```
frontend/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # Reusable UI components
│   │   ├── LoginPage.tsx # Authentication page
│   │   └── ...
│   ├── contexts/         # React contexts
│   │   └── AuthContext.tsx
│   ├── lib/              # Utilities and API client
│   │   └── api.ts        # API client with auto-refresh
│   ├── App.tsx           # Main app component
│   └── main.tsx          # App entry point
├── package.json
└── vite.config.ts
```

## Keycloak Integration

### Token Management
- **JWT Tokens** - Uses Keycloak-issued JWT tokens with full claims
- **Role Extraction** - Automatically extracts realm and client roles from token
- **Token Validation** - Checks token expiration and refreshes proactively
- **No Extra API Calls** - User info extracted directly from JWT payload

### Role-Based Routing
The app automatically routes users to the appropriate view based on their Keycloak roles:

| Role | Default Route | Access |
|------|---------------|--------|
| `kitchen` / `chef` | `/cocina` | Kitchen view only |
| `cashier` / `caja` | `/caja` | Cashier and order views |
| `admin` | `/caja` | All views (full access) |

### Authentication Flow

1. User logs in with username/password
2. Backend validates credentials via Keycloak
3. **JWT token decoded** - User info and roles extracted from token
4. Access token (8 hours) and refresh token stored in localStorage
5. **Auto-routing** - User redirected to role-appropriate page
6. API client automatically includes token in requests
7. If token expires (401), automatically refreshes using refresh token
8. If refresh fails, redirects to login page

## Troubleshooting

### "Network Error" when logging in

- Ensure backend API is running on `http://localhost:3000`
- Check CORS settings in backend
- Verify `VITE_API_URL` in `.env` file

### Token expired immediately

- Check backend Keycloak configuration
- Verify token expiration settings in `restaurant-realm.json`

### Components not rendering

- Clear browser localStorage: `localStorage.clear()`
- Restart development server
- Check browser console for errors

## Development

The app uses:
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Radix UI** - Accessible UI components
- **Tailwind CSS** - Styling
- **Axios** - HTTP client with interceptors
- **Sonner** - Toast notifications