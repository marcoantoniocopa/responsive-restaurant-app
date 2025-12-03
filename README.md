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
  orderType: 3,          // 3 = Llevar Web (online)
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
| Takeaway (Online) | 3 | Llevar Web | Customer online order |

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