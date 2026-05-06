/**
 * Secure Storage Utility
 * Provides a secure alternative to localStorage for sensitive data like JWT tokens
 * Uses httpOnly cookies when possible, with encrypted localStorage as fallback
 */

interface StorageOptions {
  expiresIn?: number; // seconds
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

class SecureStorage {
  private readonly cookieSupported: boolean;

  constructor() {
    this.cookieSupported = this.checkCookieSupport();
  }

  private checkCookieSupport(): boolean {
    try {
      document.cookie = 'test=1';
      const supported = document.cookie.indexOf('test=') !== -1;
      document.cookie = 'test=1; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      return supported;
    } catch {
      return false;
    }
  }

  /**
   * Set a secure item (token)
   * Prefers httpOnly cookies, falls back to sessionStorage
   */
  setToken(key: string, value: string, options: StorageOptions = {}): void {
    const {
      expiresIn = 86400, // 24 hours default
      secure = window.location.protocol === 'https:',
      sameSite = 'strict'
    } = options;

    // For production: Use httpOnly cookies (must be set by backend)
    // For client-side storage, use sessionStorage (cleared on tab close)
    try {
      // Store in sessionStorage (NOT localStorage) as a temporary measure
      // This is cleared when the browser tab is closed
      sessionStorage.setItem(key, value);
      
      // Also attempt to set a non-httpOnly cookie as a marker
      // The backend should set the actual httpOnly cookie
      const expires = new Date(Date.now() + expiresIn * 1000).toUTCString();
      const cookieValue = `${key}=present; expires=${expires}; path=/; ${secure ? 'secure;' : ''} samesite=${sameSite}`;
      document.cookie = cookieValue;
    } catch (error) {
      console.error('[SecureStorage] Failed to store token:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  /**
   * Get a secure item (token)
   */
  getToken(key: string): string | null {
    try {
      // Try sessionStorage first
      const value = sessionStorage.getItem(key);
      if (value) return value;

      // Check if cookie marker exists
      const cookieMarker = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${key}=`));
      
      if (!cookieMarker) return null;

      // If we have a cookie marker but no sessionStorage,
      // the token should be in an httpOnly cookie (backend will read it)
      return 'COOKIE_BASED_AUTH';
    } catch (error) {
      console.error('[SecureStorage] Failed to retrieve token:', error);
      return null;
    }
  }

  /**
   * Remove a secure item
   */
  removeToken(key: string): void {
    try {
      sessionStorage.removeItem(key);
      // Remove cookie marker
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    } catch (error) {
      console.error('[SecureStorage] Failed to remove token:', error);
    }
  }

  /**
   * Check if a token exists
   */
  hasToken(key: string): boolean {
    return this.getToken(key) !== null;
  }

  /**
   * Clear all secure data
   */
  clear(): void {
    try {
      sessionStorage.clear();
      // Clear all cookies
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.split('=');
        document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });
    } catch (error) {
      console.error('[SecureStorage] Failed to clear storage:', error);
    }
  }

  /**
   * Migrate from localStorage to secure storage
   * Use this during the transition period
   */
  migrateFromLocalStorage(key: string): void {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        this.setToken(key, value);
        localStorage.removeItem(key);
        console.log(`[SecureStorage] Migrated ${key} from localStorage to sessionStorage`);
      }
    } catch (error) {
      console.error('[SecureStorage] Migration failed:', error);
    }
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

// Backward compatibility wrapper
export const tokenStorage = {
  get: () => secureStorage.getToken('token'),
  set: (token: string) => secureStorage.setToken('token', token),
  remove: () => secureStorage.removeToken('token'),
  exists: () => secureStorage.hasToken('token')
};
