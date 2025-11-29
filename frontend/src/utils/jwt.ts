/**
 * JWT Token Utilities
 * Decode and extract user information from JWT tokens
 */

interface JWTPayload {
  sub: string;              // user_id
  company_id: string | null;
  role: string;
  full_name?: string;       // user's full name
  is_super_admin?: boolean;
  exp: number;              // expiration timestamp
  iat?: number;             // issued at timestamp
}

/**
 * Decode JWT token without verification
 * Note: This is safe for client-side use to extract non-sensitive claims
 * The server still validates the token signature
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT structure: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    // Decode the payload (base64url encoded)
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  // exp is in seconds, Date.now() is in milliseconds
  return payload.exp * 1000 < Date.now();
}

/**
 * Get user ID from JWT token
 */
export function getUserIdFromToken(token: string): string | null {
  const payload = decodeJWT(token);
  return payload?.sub || null;
}

/**
 * Get company ID from JWT token
 */
export function getCompanyIdFromToken(token: string): string | null {
  const payload = decodeJWT(token);
  return payload?.company_id || null;
}

/**
 * Get user role from JWT token
 */
export function getRoleFromToken(token: string): string | null {
  const payload = decodeJWT(token);
  return payload?.role || null;
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(token: string): boolean {
  const payload = decodeJWT(token);
  return payload?.is_super_admin === true;
}

/**
 * Get all user info from token
 */
export function getUserInfoFromToken(token: string): {
  userId: string | null;
  companyId: string | null;
  role: string | null;
  fullName: string | null;
  isSuperAdmin: boolean;
} {
  const payload = decodeJWT(token);

  return {
    userId: payload?.sub || null,
    companyId: payload?.company_id || null,
    role: payload?.role || null,
    fullName: payload?.full_name || null,
    isSuperAdmin: payload?.is_super_admin === true,
  };
}
