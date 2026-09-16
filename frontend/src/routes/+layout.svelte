<!--- frontend/src/routes/+layout.svelte --->
<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import NotificationToast from '$lib/components/NotificationToast.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { setUserContext } from '$lib/stores/user.svelte';

  let { children } = $props();

  let user = $state<any>(null);
  let showAdminButton = $derived($page.url.pathname.startsWith('/profile'));
  let isAuthChecked = $state(false);

  // Pages যেখানে user info লাগে না (login/register/etc.)
  const PUBLIC_AUTH_PAGES = [
    '/login',
    '/register',
    '/forgot-password',
    '/verify-otp',
    '/reset-password',
    '/verify-reset-otp',
  ];

  // ✅ Context-এ user store set করো — সব component access করতে পারবে
  const userContext = $state({ value: null });
  setUserContext(userContext);

  // user বদলালে context-ও sync হবে
  $effect(() => {
    userContext.value = user;
  });

  async function checkAuth() {
    try {
      const res = await fetch('http://localhost:3001/auth/me', {
        credentials: 'include'
      });
      if (res.ok) {
        user = await res.json();
      } else {
        user = null;
      }
    } catch (err) {
      user = null;
    } finally {
      isAuthChecked = true;
    }
  }

  onMount(() => {
    checkAuth();
  });

  // Navigation-এ auth re-check (login/register/logout এর পর)
  let previousPath = $state('');
  $effect(() => {
    const currentPath = $page.url.pathname;

    // Path সত্যিই বদলেছে কিনা check
    if (currentPath === previousPath) return;

    const wasAuthPage = PUBLIC_AUTH_PAGES.includes(previousPath);
    const isAuthPage = PUBLIC_AUTH_PAGES.includes(currentPath);

    // Auth page থেকে বের হলে (login → home) → user info refresh
    // Auth page এ ঢুকলে (logout → login) → user clear + re-check
    if (wasAuthPage !== isAuthPage) {
      checkAuth();
    }

    // Auth page এ ঢুকলে user clear (login page এ header user দেখানো উচিত না)
    if (isAuthPage && !wasAuthPage) {
      user = null;
    }

    previousPath = currentPath;
  });
</script>

{#if !PUBLIC_AUTH_PAGES.includes($page.url.pathname)}
  {#if isAuthChecked}
    <AppHeader {user} currentPath={$page.url.pathname} showAdminButton={showAdminButton} />
  {:else}
    <div class="header-placeholder"></div>
  {/if}
{/if}

<!-- ✅ Notification Toast — any page-এ show হবে -->
<NotificationToast />

{@render children()}

<!-- ─── Footer ─────────────────────────────────── -->
<footer class="layout-footer">
  <div class="layout-footer-container">
    <span>🌿 UnityPulse © 2026</span>
    <div class="layout-footer-links">
      <a href="/about">About</a><span>|</span>
      <a href="/contact">Contact</a><span>|</span>
      <a href="/privacy">Privacy</a>
    </div>
  </div>
</footer>

<style>
  .layout-footer {
    background: white;
    border-top: 1px solid #E4EDE9;
    padding: 16px 32px;
    margin-top: 2rem;
  }
  .layout-footer-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #5B675F;
  }
  .layout-footer-links {
    display: flex;
    gap: 10px;
  }
  .layout-footer-links a {
    color: #5B675F;
    text-decoration: none;
  }
  .header-placeholder {
    height: 64px;
    background: #FFFFFF;
    border-bottom: 1px solid #E4EDE9;
  }

  /* ─── Global Page Background Themes ─── */
  :global(.about-page) {
    background: linear-gradient(180deg, rgba(31,93,80,0.11) 0%, #F6F4EE 35%, #F6F4EE 75%, rgba(31,93,80,0.08) 100%) !important;
  }
  :global(.press-page) {
    background: linear-gradient(180deg, rgba(31,93,80,0.11) 0%, #F6F4EE 35%, #F6F4EE 75%, rgba(31,93,80,0.08) 100%) !important;
  }
  :global(.career-page) {
    background: linear-gradient(180deg, rgba(46,122,105,0.11) 0%, #F6F4EE 35%, #F6F4EE 75%, rgba(46,122,105,0.08) 100%) !important;
  }
  :global(.tasks-page) {
    background: linear-gradient(180deg, rgba(233,162,59,0.11) 0%, #F6F4EE 35%, #F6F4EE 75%, rgba(233,162,59,0.10) 100%) !important;
  }
  :global(.leaderboard-page) {
    background: linear-gradient(180deg, rgba(22,35,31,0.11) 0%, #F6F4EE 35%, #F6F4EE 75%, rgba(22,35,31,0.08) 100%) !important;
  }
  :global(.donate-page) {
    background: linear-gradient(180deg, rgba(184,80,63,0.11) 0%, #F6F4EE 35%, #F6F4EE 75%, rgba(184,80,63,0.08) 100%) !important;
  }

  /* ─── Global Main Content Width ─── */
  :global(.main-content) {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 2rem;
  }

  /* ─── Global Hero Heights ─── */
  :global(.cause-big),
  :global(.detail-hero) {
    min-height: 50vh !important;
  }

  :global(.skeleton-big) {
    min-height: 50vh !important;
  }

  @media (max-width: 768px) {
    .header-placeholder {
      height: 56px;
    }
    .layout-footer {
      padding: 16px;
    }
    :global(.main-content) {
      max-width: 100%;
      padding: 1rem;
    }
    :global(.cause-big),
    :global(.detail-hero) {
      min-height: 35vh !important;
    }
    :global(.skeleton-big) {
      min-height: 35vh !important;
    }
  }
</style>