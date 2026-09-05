<script lang="ts">
  import { Leaf, User, Home, Newspaper, Briefcase, CheckSquare, Trophy, Heart, Shield, Menu, X, LogOut } from 'lucide-svelte';
  import { clickOutside } from '$lib/actions/clickOutside';
  
  let { 
    user = null, 
    currentPath = '',
    showAdminButton = false
  }: { 
    user: any; 
    currentPath?: string;
    showAdminButton?: boolean;
  } = $props();

  let showMoreMenu = $state(false);
  let showDesktopProfileMenu = $state(false);
  let showMobileProfileMenu = $state(false);

  async function handleLogout() {
    try {
      await fetch('http://localhost:3001/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      showDesktopProfileMenu = false;
      showMobileProfileMenu = false;
      showMoreMenu = false;
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
      alert('Logout-এ সমস্যা হয়েছে');
    }
  }
</script>

<!-- ─── Desktop Header ─────────────────────────── -->
<header class="desktop-header">
  <div class="header-left">
    <a href="/" class="brand">
      <Leaf size={28} class="brand-icon" />
      <span class="brand-name">UNITYPULSE</span>
    </a>
  </div>

  <nav class="header-nav">
    <a href="/" class="nav-link" class:active={currentPath === '/' || currentPath === '/dashboard'}>Home</a>
    <a href="/about" class="nav-link" class:active={currentPath === '/about'}>About us</a>
    <a href="/press" class="nav-link" class:active={currentPath === '/press'}>Press</a>
    <a href="/career" class="nav-link" class:active={currentPath.startsWith('/career')}>Career</a>
    <a href="/tasks" class="nav-link" class:active={currentPath.startsWith('/tasks')}>Task</a>
    <a href="/leaderboard" class="nav-link" class:active={currentPath === '/leaderboard'}>Leaderboard</a>
    <a href="/donate" class="nav-link" class:active={currentPath.startsWith('/donate')}>Donation</a>
  </nav>

  <div class="header-right">
    {#if showAdminButton === true && (user?.role === 'SUPER_ADMIN' || user?.role === 'LOCAL_ADMIN')}
      <a href="/admin" class="admin-panel-btn">
        <Shield size={14} />
        <span>Admin Panel</span>
      </a>
    {/if}
    
    {#if user}
      <div class="profile-menu">
        <button class="profile-trigger" onclick={() => showDesktopProfileMenu = !showDesktopProfileMenu}>
          {#if user.profilePhoto}
            <img src={user.profilePhoto} alt="Profile" class="nav-profile-photo" />
          {:else}
            <User size={20} />
          {/if}
        </button>
        
        {#if showDesktopProfileMenu}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="profile-dropdown" role="menu" tabindex="-1" use:clickOutside={() => showDesktopProfileMenu = false}>
            <div class="dropdown-header">
              <span class="dropdown-name">{user.name}</span>
              <span class="dropdown-email">{user.email}</span>
            </div>
            <a href="/profile" class="dropdown-item" onclick={(e) => { e.preventDefault(); showDesktopProfileMenu = false; window.location.href = '/profile'; }}>
              <User size={16} />
              <span>My Profile</span>
            </a>
            <a href="/tasks/mine" class="dropdown-item" onclick={(e) => { e.preventDefault(); showDesktopProfileMenu = false; window.location.href = '/tasks/mine'; }}>
              <CheckSquare size={16} />
              <span>My Tasks</span>
            </a>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item logout-item" onclick={handleLogout}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        {/if}
      </div>
    {:else}
      <a href="/login" class="btn-login">Login</a>
    {/if}
  </div>
</header>

<!-- ─── Mobile Top Bar ─────────────────────────── -->
<header class="mobile-topbar">
  <div class="header-left">
    <a href="/" class="brand">
      <Leaf size={24} class="brand-icon" />
      <span class="brand-name">UNITYPULSE</span>
    </a>
  </div>
  
  <div class="mobile-actions">
    <button 
    onclick={() => showMoreMenu = !showMoreMenu} 
    class="menu-btn" 
    class:active={showMoreMenu}
    aria-label="More menu"
  >
    {#if showMoreMenu}
      <X size={22} />
    {:else}
      <Menu size={22} />
    {/if}
  </button>
    
    {#if user}
      <div class="profile-menu mobile">
        <button class="profile-trigger" onclick={() => showMobileProfileMenu = !showMobileProfileMenu}>
          {#if user.profilePhoto}
            <img src={user.profilePhoto} alt="Profile" class="nav-profile-photo" />
          {:else}
            <User size={20} />
          {/if}
        </button>
        
        {#if showMobileProfileMenu}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="profile-dropdown" role="menu" tabindex="-1" use:clickOutside={() => showMobileProfileMenu = false}>
            <div class="dropdown-header">
              <span class="dropdown-name">{user.name}</span>
              <span class="dropdown-email">{user.email}</span>
            </div>
            <a href="/profile" class="dropdown-item" onclick={(e) => { e.preventDefault(); showMobileProfileMenu = false; window.location.href = '/profile'; }}>
              <User size={16} />
              <span>My Profile</span>
            </a>
            <a href="/tasks/mine" class="dropdown-item" onclick={(e) => { e.preventDefault(); showMobileProfileMenu = false; window.location.href = '/tasks/mine'; }}>
              <CheckSquare size={16} />
              <span>My Tasks</span>
            </a>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item logout-item" onclick={handleLogout}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        {/if}
      </div>
    {:else}
      <a href="/login" class="btn-login">Login</a>
    {/if}
  </div>
</header>

{#if showMoreMenu}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="dropdown-overlay" onclick={() => showMoreMenu = false} onkeydown={(e) => e.key === 'Escape' && (showMoreMenu = false)} role="dialog" tabindex="-1">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="dropdown-menu" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <a href="/career" class="dropdown-item">
        <Briefcase size={18} />
        <span>Career</span>
      </a>
      <a href="/leaderboard" class="dropdown-item">
        <Trophy size={18} />
        <span>Leaderboard</span>
      </a>
      <a href="/about" class="dropdown-item">
        <Leaf size={18} />
        <span>About Us</span>
      </a>
    </div>
  </div>
{/if}



<!-- ─── Mobile Bottom Nav ──────────────────────── -->
<nav class="mobile-bottom-nav">
  <a href="/" class="bottom-nav-item" class:active={currentPath === '/' || currentPath === '/dashboard'}>
    <Home size={20} class="nav-icon" />
    <span>Home</span>
  </a>
  <a href="/press" class="bottom-nav-item" class:active={currentPath === '/press'}>
    <Newspaper size={20} class="nav-icon" />
    <span>Press</span>
  </a>
  <a href="/tasks" class="bottom-nav-item" class:active={currentPath.startsWith('/tasks')}>
    <CheckSquare size={20} class="nav-icon" />
    <span>Task</span>
  </a>
  <a href="/donate" class="bottom-nav-item" class:active={currentPath.startsWith('/donate')}>
    <Heart size={20} class="nav-icon" />
    <span>Donate</span>
  </a>
  <a href="/profile" class="bottom-nav-item" class:active={currentPath === '/profile'}>
    <User size={20} class="nav-icon" />
    <span>Profile</span>
  </a>
</nav>

<style>
  :global(*) { box-sizing: border-box; }

  /* ─── Desktop Header ─────────────────────────── */
  .desktop-header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0.875rem 1.5rem;
    background: #FFFFFF;
    border-bottom: 1px solid #E4EDE9;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-left { justify-self: start; }
  .header-nav { justify-self: center; display: flex; gap: 24px; }
  .header-right { justify-self: end; display: flex; gap: 10px; align-items: center; flex-shrink: 0; }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    cursor: pointer;
  }
  .brand:hover { opacity: 0.8; }
  .brand-name {
    font-family: 'Hind Siliguri', sans-serif;
    font-weight: 700;
    font-size: 1.25rem;
    color: #16231F;
    letter-spacing: -0.5px;
  }

  .nav-link {
    font-family: 'Hind Siliguri', sans-serif;
    color: #5B675F;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.375rem 0;
    position: relative;
    transition: color 0.25s ease;
    white-space: nowrap;
  }

  .nav-link::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 50%;
    width: 0;
    height: 2px;
    background: #1F5D50;
    transition: all 0.3s ease;
    transform: translateX(-50%);
    border-radius: 2px;
  }

  .nav-link:hover { color: #1F5D50; }
  .nav-link:hover::after { width: 100%; }
  .nav-link.active { color: #1F5D50; }
  .nav-link.active::after { width: 100%; }

  .profile-menu {
    position: relative;
  }

  .profile-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    overflow: hidden;
    background: #E4EDE9;
    color: #5B675F;
    border: none;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
  }

  .profile-trigger:hover {
    box-shadow: 0 0 0 3px rgba(31, 93, 80, 0.15);
  }

  .profile-dropdown {
    position: absolute;
    top: 48px;
    right: 0;
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    min-width: 220px;
    padding: 6px;
    z-index: 1000;
    animation: dropdownIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: top right;
  }

  .dropdown-header {
    padding: 10px 12px;
    border-bottom: 1px solid #E4EDE9;
    margin-bottom: 4px;
  }

  .dropdown-name {
    display: block;
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #16231F;
  }

  .dropdown-email {
    display: block;
    font-size: 11.5px;
    color: #8B9790;
    margin-top: 1px;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 13.5px;
    font-weight: 500;
    color: #16231F;
    text-decoration: none;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .dropdown-item:hover {
    background: #F6F4EE;
    color: #1F5D50;
  }

  .dropdown-divider {
    height: 1px;
    background: #E4EDE9;
    margin: 4px 0;
  }

  .logout-item {
    color: #B8503F;
  }

  .logout-item:hover {
    background: #FDF0ED;
    color: #B8503F;
  }

  .profile-menu.mobile .profile-dropdown {
    position: fixed;
    top: 56px;
    right: 12px;
  }

  .nav-profile-photo {
    width: 38px;
    height: 38px;
    min-width: 38px;
    min-height: 38px;
    flex-shrink: 0;
    border-radius: 50%;
    object-fit: cover;
    display: block;
  }

  .btn-login {
    font-family: 'Hind Siliguri', sans-serif;
    background: #1F5D50;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 18px;
    border-radius: 9px;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
  }

  .admin-panel-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: #153F36;
    color: white;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    font-family: 'Hind Siliguri', sans-serif;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .admin-panel-btn:hover {
    background: #1F5D50;
    transform: translateY(-1px);
  }

  @keyframes adminBtnPop {
    0% { opacity: 0; transform: scale(0.5); }
    100% { opacity: 1; transform: scale(1); }
  }

  /* ─── Mobile Top Bar ─────────────────────────── */
  .mobile-topbar {
    display: none;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: #FFFFFF;
    border-bottom: 1px solid #E4EDE9;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .mobile-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .menu-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #5B675F;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 8px;
    transition: background 0.2s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .menu-btn:hover {
    background: #F6F4EE;
    transform: scale(1.08);
  }

  .menu-btn.active {
    background: #F6F4EE;
    color: #1F5D50;
    transform: rotate(90deg) scale(1.08);
  }

  .dropdown-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 200;
  }

  .dropdown-menu {
    position: absolute;
    top: 56px;
    right: 12px;
    background: #FFFFFF;
    border: 1px solid #E4EDE9;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    padding: 6px;
    min-width: 160px;
    animation: dropdownIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: top right;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: #16231F;
    text-decoration: none;
    border-radius: 8px;
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .dropdown-item:hover {
    background: #F6F4EE;
    color: #1F5D50;
    transform: translateX(4px);
  }

  @keyframes dropdownIn {
    0% { opacity: 0; transform: scale(0.8); }
    100% { opacity: 1; transform: scale(1); }
  }

  /* ─── Mobile Bottom Nav ─────────────────────── */
  .mobile-bottom-nav {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #FFFFFF;
    border-top: 1px solid #E4EDE9;
    z-index: 100;
    justify-content: space-around;
    align-items: center;
    padding: 8px 4px;
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }

  .bottom-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 48px;
    text-decoration: none;
    color: #8B9790;
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 10px;
    font-weight: 500;
    transition: color 0.25s ease;
    position: relative;
    padding-top: 4px;
  }

  .bottom-nav-item :global(.nav-icon) {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .bottom-nav-item:hover { color: #1F5D50; }
  .bottom-nav-item:hover :global(.nav-icon) { transform: translateY(-3px) scale(1.15); }
  .bottom-nav-item::after {
    content: '';
    position: absolute;
    top: -4px;
    left: 50%;
    width: 0;
    height: 3px;
    background: #1F5D50;
    border-radius: 2px;
    transition: all 0.3s ease;
    transform: translateX(-50%);
  }
  .bottom-nav-item:hover::after { width: 24px; }
  .bottom-nav-item.active { color: #1F5D50; }
  .bottom-nav-item.active::after { width: 24px; }
  .bottom-nav-item.active :global(.nav-icon) { transform: translateY(-3px) scale(1.15); }

  /* ─── Responsive Breakpoint ──────────────────── */
  @media (max-width: 768px) {
    .desktop-header { display: none; }
    .mobile-topbar { display: flex; }
    .mobile-bottom-nav { display: flex; }
  }
</style>