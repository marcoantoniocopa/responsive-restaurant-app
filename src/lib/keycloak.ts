// Keycloak JWT Token utilities

interface KeycloakTokenPayload {
  exp: number;
  iat: number;
  jti: string;
  iss: string;
  sub: string;
  typ: string;
  azp: string;
  session_state: string;
  scope?: string;
  sid: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [client: string]: {
      roles: string[];
    };
  };
}

export interface KeycloakUser {
  id: string;
  username: string;
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  emailVerified?: boolean;
  roles: string[];
  realmRoles: string[];
  clientRoles: { [client: string]: string[] };
}

/**
 * Decode JWT token without verification (verification happens on backend)
 */
export function decodeJWT(token: string): KeycloakTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Extract user information from Keycloak JWT token
 */
export function extractUserFromToken(token: string): KeycloakUser | null {
  const payload = decodeJWT(token);
  if (!payload) {
    return null;
  }

  // Extract realm roles
  const realmRoles = payload.realm_access?.roles || [];
  
  // Extract client roles (for all clients)
  const clientRoles: { [client: string]: string[] } = {};
  if (payload.resource_access) {
    Object.entries(payload.resource_access).forEach(([client, access]) => {
      if (access.roles) {
        clientRoles[client] = access.roles;
      }
    });
  }

  // Combine all roles
  const allRoles = [
    ...realmRoles,
    ...Object.values(clientRoles).flat(),
  ];

  return {
    id: payload.sub,
    username: payload.preferred_username || payload.given_name || payload.name || payload.sub || '',
    email: payload.email,
    name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || payload.preferred_username,
    givenName: payload.given_name,
    familyName: payload.family_name,
    emailVerified: payload.email_verified,
    roles: allRoles,
    realmRoles,
    clientRoles,
  };
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  // exp is in seconds, Date.now() is in milliseconds
  return Date.now() >= payload.exp * 1000;
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }

  return new Date(payload.exp * 1000);
}

/**
 * Check if user has a specific role (case-insensitive)
 */
export function hasRole(user: KeycloakUser | null, role: string): boolean {
  if (!user) return false;
  
  const roleLower = role.toLowerCase();
  return user.roles.some(r => r.toLowerCase() === roleLower || r.toLowerCase().includes(roleLower));
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: KeycloakUser | null, roles: string[]): boolean {
  if (!user) return false;
  
  return roles.some(role => hasRole(user, role));
}

/**
 * Check if user has all of the specified roles
 */
export function hasAllRoles(user: KeycloakUser | null, roles: string[]): boolean {
  if (!user) return false;
  
  return roles.every(role => hasRole(user, role));
}

