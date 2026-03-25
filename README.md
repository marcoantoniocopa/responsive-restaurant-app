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

- Node.js 18+ and npm (for local development)
- Docker and Docker Compose (for containerized deployment)
- Backend API running (see `../responsive-restaurant-api/README.md`)

## Quick Start

You can run the frontend in two ways: **locally** or **with Docker**.

### Option 1: Local Development

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Configure Environment

Create a `.env` file in the root directory:

```bash
VITE_API_URL=http://localhost:3000/api/v1
```

#### 3. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Option 2: Docker

The frontend has its own Docker Compose configuration for standalone deployment.

#### 1. Configure Environment

The frontend uses `.env` file for configuration. Make sure it points to your backend:

```bash
# For backend on host machine
VITE_API_URL=http://localhost:3000/api/v1

# For backend in Docker (same network)
# VITE_API_URL=http://backend:3000/api/v1
```

#### 2. Start Frontend Container

```bash
docker-compose up -d
```

The frontend will be available at **http://localhost:5173**

#### 3. View Logs

```bash
docker-compose logs -f frontend
```

#### 4. Stop Frontend

```bash
docker-compose down
```

#### 5. Rebuild After Changes

```bash
docker-compose up -d --build
```

### Connecting to Backend Docker Network

If your backend is running in Docker, you can connect the frontend to the same network:

**Option A: Use External Network** (recommended if backend is already running)

The `docker-compose.yml` is configured to use the external `restaurant_network`. Make sure the backend network exists first:

```bash
# Start backend stack first
cd ../responsive-restaurant-api
docker-compose up -d

# Then start frontend (will join existing network)
cd ../responsive-restaurant-app
docker-compose up -d
```

Set `VITE_API_URL=http://backend:3000/api/v1` in your `.env` file.

**Option B: Standalone Network**

Edit `docker-compose.yml` and comment out the external network:

```yaml
networks:
  # Use internal network for standalone frontend
  restaurant_network:
    driver: bridge
```

Then use `VITE_API_URL=http://localhost:3000/api/v1` to connect to backend on host.

### Login

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

Built files will be in the `build/` directory and served by Nginx when running in Docker.

## Project Structure

```
responsive-restaurant-app/
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
├── docker-compose.yml    # Standalone Docker Compose config
├── Dockerfile            # Multi-stage Docker build
├── nginx.conf            # Nginx config for production
├── .dockerignore         # Docker build exclusions
├── .env                  # Environment config
├── .env.sample           # Environment template
├── package.json
└── vite.config.ts
```

## Docker Configuration

### Standalone Deployment

The frontend has its own `docker-compose.yml` for independent deployment. It can:
- Run standalone (connecting to backend on host)
- Connect to backend Docker network (joining the `restaurant_network`)

### Docker Compose Setup

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: restaurant_frontend
    ports:
      - "5173:80"
    environment:
      VITE_API_URL: ${VITE_API_URL:-http://localhost:3000/api/v1}
    networks:
      - restaurant_network

networks:
  # Uses external network created by backend stack
  restaurant_network:
    external: true
    name: restaurant_network
```

### Dockerfile

The frontend uses a **multi-stage Docker build**:

1. **Build Stage**: Compiles React/Vite app with Node.js
2. **Production Stage**: Serves static files with Nginx

This results in a lightweight production image (~50MB) with optimized performance.

### Nginx Configuration

Custom `nginx.conf` provides:
- SPA routing (redirects to `index.html` for client-side routes)
- Static asset caching (1 year for JS/CSS/images)
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Gzip compression for text assets

### Environment Variables

Create a `.env` file in the frontend root:

```bash
# For backend on host
VITE_API_URL=http://localhost:3000/api/v1

# For backend in Docker (same network)
# VITE_API_URL=http://backend:3000/api/v1
```

The `VITE_API_URL` is read at **build time** by Vite, so you must rebuild the Docker image after changing it.

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

## 📊 Data Reference: Numeric Values

The frontend uses numeric IDs for orders, statuses, and payment methods to match the backend system.

### Order Status Constants

Located in `src/constants/orderStatus.ts`:

```typescript
export const ORDER_STATUS = {
  RESERVA: 1,       // Customer online reservation
  NUEVO: 2,         // New cashier order
  EN_PROGRESO: 3,   // Being prepared in kitchen
  COMPLETADO: 4,    // Completed and delivered
  CANCELADO: 5,     // Cancelled
} as const;
```

**Usage in Components:**
```typescript
import { ORDER_STATUS } from '../constants/orderStatus';

// Check order status
if (order.status === ORDER_STATUS.EN_PROGRESO) {
  // Show "Mark Complete" button
}

// Update order status
await apiClient.updateOrderStatus(orderId, ORDER_STATUS.COMPLETADO);
```

### Status Transitions

Use the helper functions to validate status changes:

```typescript
import { getAvailableTransitions, canTransitionTo } from '../constants/orderStatus';

// Get valid next statuses
const nextStatuses = getAvailableTransitions(order.currentStatus);
// Returns: [3, 5] for RESERVA (can go to EN_PROGRESO or CANCELADO)

// Check if transition is valid
if (canTransitionTo(order.currentStatus, ORDER_STATUS.COMPLETADO)) {
  // Allow status update
}
```

### Status Display

Use the `StatusBadge` component for consistent status visualization:

```typescript
import { StatusBadge } from './StatusBadge';

<StatusBadge statusId={order.currentStatus} />
```

Colors automatically assigned:
- **1 (Reserva)**: Purple
- **2 (Nuevo)**: Yellow
- **3 (En Progreso)**: Blue
- **4 (Completado)**: Green
- **5 (Cancelado)**: Red

### Payment Methods & Order Types

Access via the `ConfigContext`:

```typescript
import { useConfig } from '../contexts/ConfigContext';

function MyComponent() {
  const { 
    paymentMethods,      // [{ id: 1, name: "Efectivo" }, ...]
    orderTypes,          // [{ id: 1, name: "Llevar" }, ...]
    orderStatuses,       // [{ id: 1, name: "Reserva", code: "reserva" }, ...]
    getPaymentMethodName,
    getOrderTypeName,
    getOrderStatusName
  } = useConfig();

  // Display names
  const paymentName = getPaymentMethodName(order.paymentMethod); // "Efectivo"
  const orderTypeName = getOrderTypeName(order.orderType);       // "En Local"
  const statusName = getOrderStatusName(order.currentStatus);    // "En Progreso"
}
```

### Creating Orders

**Customer Order (Online):**
```typescript
const orderData = {
  customerName: customerName,
  items: orderItems,
  paymentMethod: 1,      // 1 = Efectivo
  orderType: 3,          // 3 = Reserva (online)
  isReservation: true,   // Online orders are reservations
};
await apiClient.createCustomerOrder(orderData);
```

**Cashier Order (Takeaway):**
```typescript
const orderData = {
  customerName: customerName,
  items: orderItems,
  paymentMethod: 1,      // 1 = Efectivo
  orderType: 1,          // 1 = Llevar
  isReservation: false,
};
await apiClient.createOrder(orderData);
```

**Cashier Order (Dine-in):**
```typescript
const orderData = {
  customerName: `Mesa ${tableNumber}`,
  tableNumber: tableNumber.toString(),
  items: orderItems,
  paymentMethod: 1,      // 1 = Efectivo
  orderType: 2,          // 2 = En Local
  isReservation: false,
};
await apiClient.createOrder(orderData);
```

### Complete Value Reference

| **Order Status** | ID | Name | Code |
|------------------|-----|------|------|
| Reserva | 1 | Reserva | `reserva` |
| Nuevo | 2 | Nuevo | `nuevo` |
| En Progreso | 3 | En Progreso | `en_progreso` |
| Completado | 4 | Completado | `completado` |
| Cancelado | 5 | Cancelado | `cancelado` |

| **Payment Method** | ID | Name |
|--------------------|-----|------|
| Cash | 1 | Efectivo |
| QR Code | 2 | QR |

| **Order Type** | ID | Name | Description |
|----------------|-----|------|-------------|
| Takeaway (Cashier) | 1 | Llevar | Cashier takeaway order |
| Dine-in | 2 | En Local | Restaurant table order |
| Takeaway (Online) | 3 | Reserva | Customer online order |

### Currency Formatting

Use the `Currency` component for consistent formatting:

```typescript
import { Currency } from './Currency';

// Regular price
<Currency amount={15.50} />
// Output: "Bs. 15,50"

// Large format (for totals)
<Currency amount={1234.56} large />
// Output: "Bs. 1.234,56"
```

The currency symbol (`Bs.` or `$`) is configured in Settings and applied globally.

---

## Troubleshooting

### "Network Error" when logging in

**Local Development:**
- Ensure backend API is running on `http://localhost:3000`
- Check CORS settings in backend
- Verify `VITE_API_URL` in `.env` file

**Docker:**
- Ensure backend is running and accessible
- Check `VITE_API_URL` in `.env` matches your backend location
- If using Docker network, verify both containers are on `restaurant_network`

### Token expired immediately

- Check backend Keycloak configuration
- Verify token expiration settings in `restaurant-realm.json`

### Components not rendering

- Clear browser localStorage: `localStorage.clear()`
- Restart development server (local) or container (Docker)
- Check browser console for errors

### Docker Issues

**Frontend container not starting:**
```bash
# View logs
docker-compose logs frontend

# Rebuild image
docker-compose up -d --build
```

**Cannot reach backend from frontend:**

If backend is on host:
```bash
# In .env
VITE_API_URL=http://localhost:3000/api/v1

# Rebuild
docker-compose up -d --build
```

If backend is in Docker:
```bash
# Ensure backend network exists
docker network ls | grep restaurant_network

# In .env (use service name, not localhost)
VITE_API_URL=http://backend:3000/api/v1

# Rebuild
docker-compose up -d --build
```

**Port 5173 already in use:**
```bash
# Stop existing containers
docker-compose down

# Change port in docker-compose.yml
ports:
  - "5174:80"  # Map to different host port
```

**Network not found error:**
```bash
# If "network restaurant_network declared as external, but could not be found"
# Start backend first to create the network:
cd ../responsive-restaurant-api
docker-compose up -d

# Then start frontend
cd ../responsive-restaurant-app
docker-compose up -d
```

### API URL Changes

Remember: `VITE_API_URL` is embedded at **build time**, not runtime.

After changing `.env`:
```bash
# Must rebuild the Docker image
docker-compose down
docker-compose up -d --build
```

For local dev, just restart:
```bash
npm run dev
```

## Development

The app uses:
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Radix UI** - Accessible UI components
- **Tailwind CSS** - Styling
- **Axios** - HTTP client with interceptors
- **Sonner** - Toast notifications