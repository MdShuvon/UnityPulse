<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, Leaf, CheckCircle2, Trophy, Heart, ArrowRight } from 'lucide-svelte';

  let isLoading = $state(true);
  let user = $state<any>(null);
  let stats = $state<any>(null);
  let topTasks = $state<any[]>([]);
  let careerSnippet = $state<any[]>([]);
  let error = $state('');

  async function fetchHome() {
    try {
      const [userRes, dashboardRes, highlightsRes] = await Promise.all([
        fetch('http://localhost:3001/auth/me', { credentials: 'include' }),
        fetch('http://localhost:3001/dashboard', { credentials: 'include' }),
        fetch('http://localhost:3001/dashboard/highlights', { credentials: 'include' }),
      ]);

      if (userRes.ok) user = await userRes.json();
      if (dashboardRes.ok) stats = await dashboardRes.json();
      if (highlightsRes.ok) {
        const data = await highlightsRes.json();
        topTasks = data.topTasks || [];
        careerSnippet = data.careerSnippet || [];
      }
    } catch (err) {
      console.error(err);
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchHome();
  });
</script>

<div class="home-page">
  <main class="main-content">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-icon">
        <Leaf size={48} />
      </div>
      <h1 class="hero-title">UnityPulse</h1>
      <p class="hero-sub bangla">কমিউনিটি-চালিত সমাজসেবা প্ল্যাটফর্ম</p>
      <p class="hero-desc bangla">কাজ করুন, পয়েন্ট অর্জন করুন, ডোনেট করুন — একসাথে সমাজকে বদলে দিন।</p>
      <div class="hero-actions">
        <a href="/tasks" class="btn btn-primary">কাজ দেখুন</a>
        <a href="/donate" class="btn btn-secondary">ডোনেট করুন</a>
      </div>
    </section>

    <!-- Stats -->
    {#if stats}
      <section class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{stats.verifiedMembers || 0}</span>
          <span class="stat-label bangla">সদস্য</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{stats.activeOrgs || 0}</span>
          <span class="stat-label bangla">সংগঠন</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{stats.totalDonations || 0}</span>
          <span class="stat-label bangla">ডোনেশন</span>
        </div>
      </section>
    {/if}

    <!-- Top Tasks -->
    {#if topTasks.length > 0}
      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title">উপলব্ধ কাজ</h2>
          <a href="/tasks" class="see-all">সব দেখুন →</a>
        </div>
        <div class="tasks-list">
          {#each topTasks as task}
            <div class="task-item" onclick={() => goto(`/tasks/${task.id}`)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && goto(`/tasks/${task.id}`)}>
              <div class="task-info">
                <span class="task-title">{task.title}</span>
                <span class="task-org">{task.org?.name || 'সবার জন্য'}</span>
              </div>
              <span class="task-points">+{task.pointValue} pts</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Career Snippet -->
    {#if careerSnippet.length > 0}
      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title">ক্যারিয়ার সুযোগ</h2>
          <a href="/career" class="see-all">সব দেখুন →</a>
        </div>
        <div class="tasks-list">
          {#each careerSnippet as job}
            <div class="task-item" onclick={() => goto(`/career/${job.id}`)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && goto(`/career/${job.id}`)}>
              <div class="task-info">
                <span class="task-title">{job.title}</span>
                <span class="task-org">{job.department || 'UnityPulse'}</span>
              </div>
              <span class="task-points">{job.applicationFee === 0 ? 'ফ্রি' : `৳${job.applicationFee}`}</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- CTA -->
    <section class="cta-section">
      <h2 class="cta-title">আজই শুরু করুন</h2>
      <p class="cta-text bangla">UnityPulse-এ যোগ দিন এবং আপনার কমিউনিটিতে পরিবর্তন আনুন।</p>
      <div class="cta-actions">
        {#if user}
          <a href="/profile" class="btn btn-primary">প্রোফাইল দেখুন</a>
        {:else}
          <a href="/register" class="btn btn-primary">ফ্রি রেজিস্টার করুন</a>
          <a href="/login" class="btn btn-secondary">লগইন করুন</a>
        {/if}
      </div>
    </section>
  </main>
</div>

<style>
  .home-page {
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    background: #F6F4EE;
    color: #16231F;
  }
  .bangla { font-family: 'Hind Siliguri', sans-serif; }

  .main-content {
    max-width: 640px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  .hero {
    text-align: center;
    padding: 2rem 0;
  }
  .hero-icon {
    color: #1F5D50;
    margin-bottom: 0.5rem;
  }
  .hero-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 2.5rem;
    font-weight: 800;
    color: #153F36;
  }
  .hero-sub {
    font-size: 1rem;
    color: #5B675F;
    margin-top: 0.25rem;
  }
  .hero-desc {
    font-size: 0.9375rem;
    color: #5B675F;
    margin-top: 0.75rem;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.7;
  }
  .hero-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 24px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-primary {
    background: #1F5D50;
    color: white;
  }
  .btn-primary:hover {
    background: #153F36;
  }
  .btn-secondary {
    background: white;
    color: #1F5D50;
    border: 1px solid #1F5D50;
  }
  .btn-secondary:hover {
    background: #F6F4EE;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 1.5rem;
  }
  .stat-card {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 12px;
    padding: 1rem;
    text-align: center;
  }
  .stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: #153F36;
  }
  .stat-label {
    font-size: 0.8125rem;
    color: #5B675F;
  }

  .section-block {
    margin-top: 2rem;
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  .section-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #153F36;
  }
  .see-all {
    font-size: 0.875rem;
    color: #1F5D50;
    text-decoration: none;
  }
  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .task-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem;
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .task-item:hover {
    border-color: #1F5D50;
  }
  .task-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .task-title {
    font-weight: 600;
    color: #16231F;
    font-size: 0.9375rem;
  }
  .task-org {
    font-size: 0.75rem;
    color: #8B9790;
  }
  .task-points {
    font-weight: 700;
    color: #1F5D50;
    font-size: 0.875rem;
  }

  .cta-section {
    text-align: center;
    margin-top: 2rem;
    padding: 2rem 1rem;
    background: white;
    border-radius: 16px;
    border: 1px solid #E4EDE9;
  }
  .cta-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #153F36;
  }
  .cta-text {
    font-size: 0.9375rem;
    color: #5B675F;
    margin-top: 0.5rem;
  }
  .cta-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 1.25rem;
    flex-wrap: wrap;
  }
</style>