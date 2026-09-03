<script lang="ts">
  import { onMount } from 'svelte';

  let user = $state<any>(null);

  async function checkAuth() {
    try {
      const res = await fetch('http://localhost:3001/auth/me', {
        credentials: 'include'
      });
      if (res.ok) user = await res.json();
    } catch (err) {}
  }

  onMount(() => { checkAuth(); });
</script>

<div class="about-page">
  <main class="main-content">
    <div class="about-card">
      <h1 class="about-title">UnityPulse সম্পর্কে</h1>
      <p class="about-text bangla">
        UnityPulse কমিউনিটির মানুষদের একসাথে কাজ করার প্ল্যাটফর্ম।
      </p>
    </div>
  </main>
</div>

<style>
  .about-page { min-height: 100vh; background: #F6F4EE; font-family: 'Hind Siliguri', sans-serif; }
  .main-content { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem; }
  .about-card { background: white; border: 1px solid #E4EDE9; border-radius: 16px; padding: 24px; }
  .about-title { font-size: 22px; font-weight: 700; color: #153F36; margin-bottom: 12px; }
  .about-text { font-size: 14px; color: #5B675F; line-height: 1.7; }
</style>