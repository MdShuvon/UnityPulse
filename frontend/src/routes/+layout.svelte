<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  let { children } = $props();

  let user = $state<any>(null);
  let showAdminButton = $derived($page.url.pathname.startsWith('/profile'));
  let isAuthChecked = $state(false);

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
</script>

{#if !['/login', '/register', '/forgot-password', '/verify-otp', '/reset-password', '/verify-reset-otp'].includes($page.url.pathname)}
  {#if isAuthChecked}
    <AppHeader {user} currentPath={$page.url.pathname} showAdminButton={showAdminButton} />
  {:else}
    <div class="header-placeholder"></div>
  {/if}
{/if}

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