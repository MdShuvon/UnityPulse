<script lang="ts">
  import { Leaf, User, Home, Newspaper, Briefcase, CheckSquare, Trophy, Heart, Shield, Menu, X, LogOut, Search } from 'lucide-svelte';
  import { clickOutside } from '$lib/actions/clickOutside';
  
  let searchOpen = $state(false);
  let searchQuery = $state('');
  let searchResults = $state<any>({ causes: [], projects: [], jobs: [] });
  let searchLoading = $state(false);
  let debounceTimer: any;

  async function performSearch() {
    if (searchQuery.trim().length < 2) {
      searchResults = { causes: [], projects: [], jobs: [] };
      return;
    }

    searchLoading = true;
    try {
      const res = await fetch(`http://localhost:3001/search/all?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      if (res.ok) {
        searchResults = await res.json();
      }
    } catch (err) {
      searchResults = { causes: [], projects: [], jobs: [] };
    } finally {
      searchLoading = false;
    }
  }

  function onSearchInput(e: Event) {
    searchQuery = (e.target as HTMLInputElement).value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(performSearch, 300);
  }

  function handleOutsideClick() {
    // শুধু তখনই বন্ধ হবে যখন কিছু লেখা নেই
    if (searchQuery.trim() === '') {
      searchOpen = false;
      searchResults = { causes: [], projects: [], jobs: [] };
    }
  }
  
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
  let isMobile = $state(false);

  $effect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    isMobile = mq.matches;
    const handler = (e: MediaQueryListEvent) => { isMobile = e.matches; };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });

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
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="search-container" class:open={searchOpen} onmouseleave={() => { if (searchQuery.trim() === '') { searchOpen = false; searchResults = { causes: [], projects: [], jobs: [] }; } }}>
      {#if !searchOpen}
        <button
          class="search-trigger"
          onclick={() => searchOpen = true}
          onmouseenter={() => searchOpen = true}
          aria-label="Open search"
        >
          <Search size={18} />
        </button>
      {:else}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="search-expand" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && (searchOpen = false)} role="presentation">
          <Search
            size={16}
            style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #8B9790; pointer-events: none;"
          />
          <input
            type="text"
            placeholder="কি খুঁজছেন?..."
            value={searchQuery}
            oninput={onSearchInput}
            class="search-input-field"
          />
          {#if searchQuery.trim() !== ''}
            <button class="search-close" onclick={() => { searchQuery = ''; searchResults = { causes: [], projects: [], jobs: [] }; }} aria-label="Clear search">
              <X size={14} />
            </button>
          {/if}
        </div>
      {/if}

      {#if searchQuery.trim().length >= 2}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="search-results-dropdown" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="presentation">
          {#if searchLoading}
            <div class="search-loading">খোঁজা হচ্ছে...</div>
          {:else}
            {#if searchResults.causes.length > 0}
              <div class="search-group">
                <div class="search-group-label">Cause</div>
                {#each searchResults.causes as cause}
                  <a href={`/causes/${cause.id}`} class="search-result-item" onclick={() => { searchOpen = false; searchQuery = ''; }}>
                    <Leaf size={14} /> {cause.title}
                  </a>
                {/each}
              </div>
            {/if}

            {#if searchResults.projects.length > 0}
              <div class="search-group">
                <div class="search-group-label">Projects</div>
                {#each searchResults.projects as project}
                  <a href={`/donate/${project.id}`} class="search-result-item" onclick={() => { searchOpen = false; searchQuery = ''; }}>
                    <Heart size={14} /> {project.title}
                  </a>
                {/each}
              </div>
            {/if}

            {#if searchResults.jobs.length > 0}
              <div class="search-group">
                <div class="search-group-label">Jobs</div>
                {#each searchResults.jobs as job}
                  <a href={`/career/${job.id}`} class="search-result-item" onclick={() => { searchOpen = false; searchQuery = ''; }}>
                    <Briefcase size={14} /> {job.title}
                  </a>
                {/each}
              </div>
            {/if}

            {#if searchResults.causes.length === 0 && searchResults.projects.length === 0 && searchResults.jobs.length === 0}
              <div class="search-empty bangla">কিছু পাওয়া যায়নি</div>
            {/if}
          {/if}
        </div>
      {/if}
    </div>
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
      class="search-trigger"
      onclick={() => searchOpen = !searchOpen}
      aria-label="Toggle search"
    >
      <Search size={18} />
    </button>
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

{#if searchOpen && isMobile}
  <div class="mobile-search-bar" use:clickOutside={handleOutsideClick}>
    <div class="mobile-search-bar-inner">
      <Search
        size={16}
        style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #8B9790; pointer-events: none;"
      />
      <input
        type="text"
        placeholder="কি খুঁজছেন?..."
        value={searchQuery}
        oninput={onSearchInput}
        class="search-input-field"
      />
      {#if searchQuery.trim() !== ''}
        <button class="search-close" onclick={() => { searchQuery = ''; searchResults = { causes: [], projects: [], jobs: [] }; }} aria-label="Clear search">
          <X size={14} />
        </button>
      {/if}
    </div>

    {#if searchQuery.trim().length >= 2}
      <div class="mobile-results-inline">
        {#if searchLoading}
          <div class="search-loading">খোঁজা হচ্ছে...</div>
        {:else}
          {#if searchResults.causes.length > 0}
            <div class="search-group">
              <div class="search-group-label">Cause</div>
              {#each searchResults.causes as cause}
                <a href={`/causes/${cause.id}`} class="search-result-item" onclick={() => { searchOpen = false; }}>
                  <Leaf size={14} /> {cause.title}
                </a>
              {/each}
            </div>
          {/if}

          {#if searchResults.projects.length > 0}
            <div class="search-group">
              <div class="search-group-label">Projects</div>
              {#each searchResults.projects as project}
                <a href={`/donate/${project.id}`} class="search-result-item" onclick={() => { searchOpen = false; }}>
                  <Heart size={14} /> {project.title}
                </a>
              {/each}
            </div>
          {/if}

          {#if searchResults.jobs.length > 0}
            <div class="search-group">
              <div class="search-group-label">Jobs</div>
              {#each searchResults.jobs as job}
                <a href={`/career/${job.id}`} class="search-result-item" onclick={() => { searchOpen = false; }}>
                  <Briefcase size={14} /> {job.title}
                </a>
              {/each}
            </div>
          {/if}

          {#if searchResults.causes.length === 0 && searchResults.projects.length === 0 && searchResults.jobs.length === 0}
            <div class="search-empty bangla">কিছু পাওয়া যায়নি</div>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
{/if}

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

  .header-left {
    justify-self: start;
    display: flex;
    align-items: center;
    gap: 4px;
  }
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

  /* ─── Search Styles ─── */
  .search-container {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 8px;
  }
  .search-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #E4EDE9;
    color: #5B675F;
    border: none;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    flex-shrink: 0;
    z-index: 10;
  }
  .search-trigger:hover {
    background: #1F5D50;
    color: white;
    transform: scale(1.08);
  }
  .search-container.open .search-trigger {
    background: #1F5D50;
    color: white;
  }

  .search-expand {
    position: relative;
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 22px;
    padding: 5px 6px 5px 38px;
    animation: searchExpand 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: left center;
    box-shadow: 0 2px 12px rgba(31,93,80,0.12);
    min-width: 240px;
  }
  .search-expand:focus-within {
    border-color: #1F5D50;
    box-shadow: 0 0 0 3px rgba(31,93,80,0.1);
  }
  @keyframes searchExpand {
    from { opacity: 0; width: 0; transform: scaleX(0); }
    to { opacity: 1; width: 220px; transform: scaleX(1); }
  }
  .search-input-field {
    flex: 1;
    border: none;
    outline: none;
    font-size: 13px;
    font-family: 'Hind Siliguri', sans-serif;
    background: transparent;
    min-width: 120px;
    padding: 0;
  }
  .search-close {
    background: none;
    border: none;
    cursor: pointer;
    color: #8B9790;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .search-close:hover {
    color: #B8503F;
    background: #FDF0ED;
  }

  /* FIX: এখন dropdown টা search-container এর সাপেক্ষে absolute — ঠিক নিচে বসবে */
  .search-results-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.2);
    width: 300px;
    max-height: 400px;
    overflow-y: auto;
    z-index: 999;
    animation: searchResultsIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: top left;
  }
  @keyframes searchResultsIn {
    from { opacity: 0; transform: translateY(-6px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .search-loading {
    padding: 14px;
    text-align: center;
    color: #5B675F;
    font-size: 12.5px;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .search-group { padding: 6px 0; }
  .search-group-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #8B9790;
    padding: 4px 14px;
  }
  .search-result-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    font-size: 13px;
    font-weight: 500;
    color: #16231F;
    text-decoration: none;
    font-family: 'Hind Siliguri', sans-serif;
    transition: background 0.15s;
  }
  .search-result-item:hover { background: #F6F4EE; }
  .search-empty {
    padding: 16px;
    text-align: center;
    color: #8B9790;
    font-size: 12.5px;
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

  /* Desktop-এ যাতে duplicate mobile search bar দেখা না যায় এবং clickOutside হ্যান্ডলার
     আসল ডেস্কটপ search input-এর ক্লিককে "বাইরের ক্লিক" ধরে বন্ধ করে না দেয়। */
  .mobile-search-bar {
    display: none;
  }

  /* ─── Responsive Breakpoint ──────────────────── */
  @media (max-width: 768px) {
    .desktop-header { display: none; }
    .mobile-topbar { display: flex; }
    .mobile-bottom-nav { display: flex; }

    .mobile-search-bar {
      display: block;
      position: sticky;
      top: 56px;
      z-index: 99;
      background: #F6F4EE;
      padding: 8px 12px;
      border-bottom: 1px solid #E4EDE9;
      animation: mobileSearchBarIn 0.2s ease;
    }
    @keyframes mobileSearchBarIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .mobile-search-bar-inner {
      position: relative;
      display: flex;
      align-items: center;
      background: white;
      border: 2px solid #1F5D50;
      border-radius: 22px;
      padding: 6px 8px 6px 36px;
    }
    .mobile-search-bar .search-input-field {
      flex: 1;
      font-size: 14px;
      min-width: 0;
    }
    .mobile-results-inline {
      background: white;
      border: 1px solid #E4EDE9;
      border-radius: 12px;
      margin-top: 6px;
      max-height: 40vh;
      overflow-y: auto;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      animation: mobileSearchResultsIn 0.2s ease;
    }
    @keyframes mobileSearchResultsIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  }
</style>