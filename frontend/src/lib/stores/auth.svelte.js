/**
 * auth.svelte.js
 * Svelte 5 $state() Runes দিয়ে auth state manage করা
 * Class-based singleton — app এর যেকোনো জায়গা থেকে import করা যাবে
 */

/**
 * @typedef {'MEMBER' | 'LOCAL_ADMIN' | 'SUPER_ADMIN'} UserRole
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {UserRole} role
 * @property {string} [profilePhoto]
 */

class AuthStore {
  /** @type {User|null} */
  user = $state(null);

  /** /auth/me call হয়েছে কিনা — initial load এর জন্য */
  checked = $state(false);

  /** Login/logout loading indicator */
  loading = $state(false);

  // ── Setters ──────────────────────────────────
  /** @param {User} user */
  setUser(user)  { this.user    = user;  }
  setChecked()   { this.checked = true;  }
  /** @param {boolean} v */
  setLoading(v)  { this.loading = v;     }

  clearUser() {
    this.user    = null;
    this.loading = false;
  }

  // ── Derived getters ───────────────────────────
  get isLoggedIn()   { return this.user !== null; }
  get isMember()     { return this.user?.role === 'MEMBER'; }
  get isLocalAdmin() { return this.user?.role === 'LOCAL_ADMIN'; }
  get isSuperAdmin() { return this.user?.role === 'SUPER_ADMIN'; }
  get isAdmin() { return ['LOCAL_ADMIN', 'SUPER_ADMIN'].includes(this.user?.role ?? ''); }

  get userName()  { return this.user?.name ?? ''; }
  get userEmail() { return this.user?.email ?? ''; }
  get userId()    { return this.user?.id ?? null; }
  get userPhoto() { return this.user?.profilePhoto ?? null; }
}

// Singleton — একটাই instance সারা app এ share হবে
export const auth = new AuthStore();