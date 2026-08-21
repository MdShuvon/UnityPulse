<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { 
    Loader2, Star, CheckCircle2, DollarSign, Trophy, 
    RefreshCw, Clock, ArrowRight, User, Leaf 
  } from 'lucide-svelte';

  // ─── Types ─────────────────────────────────────
  interface DashboardStats {
    uniqueMemberDonors: number;
    totalDonations: number;
    activeOrgs: number;
    activeProjects: number;
    verifiedMembers: number;
    cachedAt: string;
  }

  interface PressHighlight {
    id: string;
    content: string;
    photos: string[];
    createdAt: string;
    editedAt: string | null;
    user: {
      id: string;
      name: string;
      profilePhoto: string | null;
    };
    _count: {
      likes: number;
      comments: number;
    };
  }

  interface TopTask {
    id: string;
    title: string;
    pointValue: number;
    date: string;
    org: {
      name: string;
    };
  }

  interface CareerSnippet {
    id: string;
    title: string;
    applicationFee: number;
    deadline: string | null;
  }

  interface DashboardHighlights {
    pressHighlights: PressHighlight[];
    topTasks: TopTask[];
    careerSnippet: CareerSnippet[];
  }

  interface LiveTransaction {
    id: string;
    amount: number;
    method: string;
    createdAt: string;
    guestName: string | null;
    user: {
      name: string;
      profilePhoto: string | null;
    } | null;
    project: {
      title: string;
    };
  }

  interface UserData {
    id: string;
    name: string;
    email: string;
    role: string;
    profilePhoto: string | null;
  }

  // ─── State ─────────────────────────────────────
  let isLoading = $state(true);
  let user = $state<UserData | null>(null);
  let stats = $state<DashboardStats | null>(null);
  let highlights = $state<DashboardHighlights | null>(null);
  let liveTransactions = $state<LiveTransaction[]>([]);
  let isRefreshing = $state(false);
  let error = $state('');

  // ─── Bengali Labels ────────────────────────────
  const labels = {
    loading: 'লোড হচ্ছে...',
    error: 'ডেটা লোড করতে সমস্যা হয়েছে',
    retry: 'আবার চেষ্টা করুন',
    points: 'পয়েন্টস',
    tasks: 'টাস্ক',
    donations: 'টাকা',
    rank: 'র‌্যাংক',
    quickActions: 'দ্রুত অ্যাকশন',
    browseTasks: 'টাস্ক দেখুন',
    donateNow: 'ডোনেট করুন',
    leaderboard: 'লিডারবোর্ড',
    recentActivity: 'সাম্প্রতিক কার্যক্রম',
    liveDonations: 'লাইভ ডোনেশন',
    refresh: 'রিফ্রেশ',
    noActivity: 'এখনো কোনো কার্যক্রম নেই',
    noDonations: 'এখনো কোনো ডোনেশন নেই',
    justNow: 'এইমাত্র',
    minAgo: 'মিনিট আগে',
    donated: 'ডোনেট করেছেন',
    to: 'তে',
  };

  // ─── Time-based Greeting ───────────────────────
  function getGreeting(name: string): string {
    const hour = new Date().getHours();
    if (hour < 12) return `শুভ সকাল, ${name}!`;
    if (hour < 17) return `শুভ দুপুর, ${name}!`;
    return `শুভ সন্ধ্যা, ${name}!`;
  }

  // ─── Time Ago Formatter ────────────────────────
  function timeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return labels.justNow;
    if (diffMins < 60) return `${diffMins} ${labels.minAgo}`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} দিন আগে`;
  }

  // ─── Format Number ─────────────────────────────
  function formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  }

  function formatTaka(amount: number): string {
    if (amount >= 1000) {
      return (amount / 1000).toFixed(1).replace(/\.0$/, '') + 'K ৳';
    }
    return amount + ' ৳';
  }

  // ─── Fetch Dashboard Data ──────────────────────
  async function fetchDashboard() {
    try {
      // Fetch all data in parallel
      const [userRes, statsRes, highlightsRes, liveRes] = await Promise.all([
        fetch('http://localhost:3001/auth/me', { credentials: 'include' }),
        fetch('http://localhost:3001/dashboard', { credentials: 'include' }),
        fetch('http://localhost:3001/dashboard/highlights', { credentials: 'include' }),
        fetch('http://localhost:3001/dashboard/live-transactions', { credentials: 'include' }),
      ]);

      if (userRes.ok) {
        user = await userRes.json();
      } else if (userRes.status === 401) {
        goto('/login');
        return;
      }

      if (statsRes.ok) {
        stats = await statsRes.json();
      }

      if (highlightsRes.ok) {
        highlights = await highlightsRes.json();
      }

      if (liveRes.ok) {
        liveTransactions = await liveRes.json();
      }

    } catch (err) {
      console.error('Dashboard fetch error:', err);
      error = labels.error;
    } finally {
      isLoading = false;
    }
  }

  async function refreshLiveDonations() {
    isRefreshing = true;
    try {
      const liveRes = await fetch('http://localhost:3001/dashboard/live-transactions', {
        credentials: 'include'
      });
      if (liveRes.ok) {
        liveTransactions = await liveRes.json();
      }
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      isRefreshing = false;
    }
  }

  // ─── Lifecycle ─────────────────────────────────
  onMount(() => {
    fetchDashboard();

    // Auto-refresh live donations every 30 seconds
    const interval = setInterval(refreshLiveDonations, 30000);
    
    return () => clearInterval(interval);
  });
</script>

<!-- ─── Loading State ──────────────────────────── -->
{#if isLoading}
  <div class="dashboard-loading">
    <Loader2 class="spinner" size={48} />
    <p>{labels.loading}</p>
  </div>
{:else if error}
  <div class="dashboard-error">
    <p>{error}</p>
    <button onclick={fetchDashboard} class="retry-btn">
      {labels.retry}
    </button>
  </div>
{:else}
  <div class="dashboard-page">
    
    <!-- Header -->
    <header class="dashboard-header">
      <div class="header-left">
        <div class="brand">
          <Leaf size={28} class="brand-icon" />
          <span class="brand-name">UNITYPULSE</span>
        </div>
      </div>
      
      <nav class="header-nav">
        <a href="/press" class="nav-link">Press</a>
        <a href="/career" class="nav-link">Career</a>
        <a href="/about" class="nav-link">About us</a>
        <a href="/tasks" class="nav-link">Tasks</a>
        <a href="/donate" class="nav-link">Donate</a>
        <a href="/leaderboard" class="nav-link">Leaderboard</a>
      </nav>
      
      <div class="header-right">
        <a href="/profile" class="profile-link">
          {#if user?.profilePhoto}
            <img src={user.profilePhoto} alt={user.name} class="avatar" />
          {:else}
            <div class="avatar-placeholder">
              <User size={20} />
            </div>
          {/if}
        </a>
      </div>
    </header>

    <!-- Main Content -->
    <main class="dashboard-main">
      
      <!-- Welcome Message -->
      <div class="welcome-section">
        <h1 class="welcome-text">{user ? getGreeting(user.name) : 'স্বাগতম!'}</h1>
        <p class="welcome-subtitle">আপনার UnityPulse ড্যাশবোর্ড</p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card stat-points">
          <div class="stat-icon">
            <Star size={24} />
          </div>
          <div class="stat-info">
            <span class="stat-value">1,250</span>
            <span class="stat-label">{labels.points}</span>
          </div>
        </div>
        
        <div class="stat-card stat-tasks">
          <div class="stat-icon">
            <CheckCircle2 size={24} />
          </div>
          <div class="stat-info">
            <span class="stat-value">45</span>
            <span class="stat-label">{labels.tasks}</span>
          </div>
        </div>
        
        <div class="stat-card stat-donations">
          <div class="stat-icon">
            <DollarSign size={24} />
          </div>
          <div class="stat-info">
            <span class="stat-value">{stats ? formatTaka(stats.totalDonations) : '0 ৳'}</span>
            <span class="stat-label">{labels.donations}</span>
          </div>
        </div>
        
        <div class="stat-card stat-rank">
          <div class="stat-icon">
            <Trophy size={24} />
          </div>
          <div class="stat-info">
            <span class="stat-value">#12</span>
            <span class="stat-label">{labels.rank}</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <section class="quick-actions">
        <h2 class="section-title">🚀 {labels.quickActions}</h2>
        <div class="actions-grid">
          <a href="/tasks" class="action-card action-tasks">
            <CheckCircle2 size={28} />
            <span>{labels.browseTasks}</span>
            <ArrowRight size={16} class="arrow" />
          </a>
          
          <a href="/donate" class="action-card action-donate">
            <DollarSign size={28} />
            <span>{labels.donateNow}</span>
            <ArrowRight size={16} class="arrow" />
          </a>
          
          <a href="/leaderboard" class="action-card action-leaderboard">
            <Trophy size={28} />
            <span>{labels.leaderboard}</span>
            <ArrowRight size={16} class="arrow" />
          </a>
        </div>
      </section>

      <!-- Dashboard Stats (Backend) -->
      {#if stats}
        <section class="backend-stats">
          <div class="backend-stat-item">
            <span class="bs-label">সদস্য</span>
            <span class="bs-value">{stats.verifiedMembers.toLocaleString('bn')}</span>
          </div>
          <div class="backend-stat-item">
            <span class="bs-label">সংগঠন</span>
            <span class="bs-value">{stats.activeOrgs}</span>
          </div>
          <div class="backend-stat-item">
            <span class="bs-label">প্রজেক্ট</span>
            <span class="bs-value">{stats.activeProjects}</span>
          </div>
          <div class="backend-stat-item">
            <span class="bs-label">ডোনার</span>
            <span class="bs-value">{stats.uniqueMemberDonors}</span>
          </div>
        </section>
      {/if}

      <!-- Recent Activity -->
      <section class="recent-activity">
        <h2 class="section-title">📋 {labels.recentActivity}</h2>
        
        {#if highlights?.pressHighlights && highlights.pressHighlights.length > 0}
          <div class="activity-list">
            {#each highlights.pressHighlights as post}
              <div class="activity-item">
                <div class="activity-avatar">
                  {#if post.user.profilePhoto}
                    <img src={post.user.profilePhoto} alt={post.user.name} />
                  {:else}
                    <div class="avatar-placeholder-sm">
                      <User size={14} />
                    </div>
                  {/if}
                </div>
                <div class="activity-content">
                  <p class="activity-text">
                    <strong>{post.user.name}</strong> পোস্ট করেছেন
                  </p>
                  <p class="activity-meta">
                    {post.content ? post.content.slice(0, 80) + '...' : 'ছবি পোস্ট'}
                  </p>
                  <span class="activity-time">
                    <Clock size={12} /> {timeAgo(post.createdAt)}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty-text">{labels.noActivity}</p>
        {/if}
      </section>

      <!-- Available Tasks -->
      {#if highlights?.topTasks && highlights.topTasks.length > 0}
        <section class="tasks-section">
          <h2 class="section-title">📝 উপলব্ধ টাস্ক</h2>
          <div class="tasks-list">
            {#each highlights.topTasks as task}
              <div class="task-item">
                <div class="task-info">
                  <span class="task-title">{task.title}</span>
                  <span class="task-org">{task.org.name}</span>
                </div>
                <span class="task-points">+{task.pointValue} pts</span>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Live Donations -->
      <section class="live-donations">
        <div class="section-header">
          <h2 class="section-title">💚 {labels.liveDonations}</h2>
          <button 
            class="refresh-btn" 
            onclick={refreshLiveDonations}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} class={isRefreshing ? 'spinning' : ''} />
            <span>{labels.refresh}</span>
          </button>
        </div>
        
        {#if liveTransactions.length > 0}
          <div class="donations-list">
            {#each liveTransactions as donation}
              <div class="donation-item">
                <div class="donation-info">
                  <span class="donor-name">
                    {donation.user?.name || donation.guestName || 'Anonymous'}
                  </span>
                  <span class="donation-action">
                    {labels.donated} {formatTaka(donation.amount)} {labels.to} {donation.project.title}
                  </span>
                </div>
                <span class="donation-time">• {timeAgo(donation.createdAt)}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty-text">{labels.noDonations}</p>
        {/if}
      </section>

    </main>

    <!-- Footer -->
    <footer class="dashboard-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <span class="footer-logo">🌿 UnityPulse</span>
          <span class="footer-copy">© 2026</span>
        </div>
        <div class="footer-links">
          <a href="/about">About</a>
          <span>|</span>
          <a href="/contact">Contact</a>
          <span>|</span>
          <a href="/privacy">Privacy</a>
        </div>
      </div>
    </footer>

  </div>
{/if}

<style>
  /* ─── Google Fonts ───────────────────────────── */
  @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  /* ─── Variables ──────────────────────────────── */
  :root {
    --primary: #2ecc71;
    --primary-dark: #27ae60;
    --bg-main: #f8faf9;
    --bg-white: #ffffff;
    --text-dark: #1a2e23;
    --text-muted: #5a7d6a;
    --text-light: #8ba89a;
    --border: #d4ede0;
    --border-light: #e8f5ee;
  }

  /* ─── Loading & Error ────────────────────────── */
  .dashboard-loading,
  .dashboard-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 1rem;
    font-family: 'Hind Siliguri', sans-serif;
    background: var(--bg-main);
  }

  /* .spinner {
    animation: spin 1s linear infinite;
    color: var(--primary);
  } */

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* .spinning {
    animation: spin 1s linear infinite;
  } */

  .retry-btn {
    padding: 0.75rem 2rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-family: 'Hind Siliguri', sans-serif;
    font-weight: 600;
    cursor: pointer;
  }

  /* ─── Dashboard Page ─────────────────────────── */
  .dashboard-page {
    min-height: 100vh;
    background: var(--bg-main);
    font-family: 'Hind Siliguri', sans-serif;
  }

  /* ─── Header ─────────────────────────────────── */
  .dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.5rem;
    background: var(--bg-white);
    border-bottom: 1px solid var(--border-light);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* .brand-icon {
    color: var(--primary);
  } */

  .brand-name {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 800;
    font-size: 1.25rem;
    color: var(--text-dark);
    letter-spacing: -0.5px;
  }

  .header-nav {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .nav-link {
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: color 0.2s;
    padding: 0.375rem 0;
    border-bottom: 2px solid transparent;
  }

  .nav-link:hover {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }

  .profile-link {
    display: flex;
    align-items: center;
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--border);
  }

  .avatar-placeholder {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--border-light);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  /* ─── Main Content ───────────────────────────── */
  .dashboard-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  /* ─── Welcome ────────────────────────────────── */
  .welcome-section {
    margin-bottom: 1.5rem;
  }

  .welcome-text {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-dark);
    margin: 0;
  }

  .welcome-subtitle {
    color: var(--text-muted);
    margin: 0.25rem 0 0 0;
    font-size: 0.9375rem;
  }

  /* ─── Stats Grid ─────────────────────────────── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: 12px;
    background: var(--bg-white);
    border: 1px solid var(--border-light);
    transition: transform 0.2s, box-shadow 0.2s;
    cursor: default;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(46, 204, 113, 0.08);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-points .stat-icon {
    background: #e8f8f0;
    color: #2ecc71;
  }

  .stat-tasks .stat-icon {
    background: #e8f4fd;
    color: #3498db;
  }

  .stat-donations .stat-icon {
    background: #fef9e7;
    color: #f39c12;
  }

  .stat-rank .stat-icon {
    background: #f3e8ff;
    color: #8e44ad;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-dark);
    line-height: 1;
  }

  .stat-label {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  /* ─── Quick Actions ──────────────────────────── */
  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-dark);
    margin: 0 0 1rem 0;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .action-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-radius: 12px;
    text-decoration: none;
    color: white;
    font-weight: 600;
    font-size: 0.9375rem;
    transition: transform 0.2s, box-shadow 0.2s;
    position: relative;
    overflow: hidden;
  }

  .action-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  }

  .action-tasks {
    background: linear-gradient(135deg, #2ecc71, #27ae60);
  }

  .action-donate {
    background: linear-gradient(135deg, #f39c12, #e67e22);
  }

  .action-leaderboard {
    background: linear-gradient(135deg, #8e44ad, #6c3483);
  }

  /* .arrow {
    position: absolute;
    right: 1rem;
    opacity: 0.7;
    transition: transform 0.2s;
  }

  .action-card:hover .arrow {
    transform: translateX(4px);
  } */

  /* ─── Backend Stats ──────────────────────────── */
  .backend-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--bg-white);
    border-radius: 12px;
    border: 1px solid var(--border-light);
  }

  .backend-stat-item {
    text-align: center;
    padding: 0.5rem;
  }

  .bs-label {
    display: block;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
  }

  .bs-value {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-dark);
  }

  /* ─── Recent Activity ────────────────────────── */
  .recent-activity {
    margin-bottom: 1.5rem;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .activity-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--bg-white);
    border-radius: 10px;
    border: 1px solid var(--border-light);
  }

  .activity-avatar img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-placeholder-sm {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--border-light);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  .activity-content {
    flex: 1;
  }

  .activity-text {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-dark);
  }

  .activity-text strong {
    font-weight: 600;
  }

  .activity-meta {
    margin: 0.25rem 0;
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  .activity-time {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--text-light);
  }

  /* ─── Tasks Section ──────────────────────────── */
  .tasks-section {
    margin-bottom: 1.5rem;
  }

  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .task-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem;
    background: var(--bg-white);
    border-radius: 8px;
    border: 1px solid var(--border-light);
  }

  .task-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .task-title {
    font-weight: 500;
    color: var(--text-dark);
  }

  .task-org {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .task-points {
    font-weight: 600;
    color: var(--primary);
    font-size: 0.875rem;
    white-space: nowrap;
  }

  /* ─── Live Donations ─────────────────────────── */
  .live-donations {
    margin-bottom: 1.5rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .section-header .section-title {
    margin-bottom: 0;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    background: var(--bg-white);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 0.8125rem;
    color: var(--text-muted);
    transition: all 0.2s;
  }

  .refresh-btn:hover:not(:disabled) {
    border-color: var(--primary);
    color: var(--primary);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .donations-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .donation-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: var(--bg-white);
    border-radius: 8px;
    border: 1px solid var(--border-light);
    animation: fadeInUp 0.3s ease;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .donation-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .donor-name {
    font-weight: 600;
    color: var(--text-dark);
    font-size: 0.875rem;
  }

  .donation-action {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .donation-time {
    font-size: 0.75rem;
    color: var(--text-light);
    white-space: nowrap;
  }

  /* ─── Empty State ────────────────────────────── */
  .empty-text {
    text-align: center;
    color: var(--text-light);
    padding: 2rem;
    font-size: 0.9375rem;
  }

  /* ─── Footer ─────────────────────────────────── */
  .dashboard-footer {
    background: var(--bg-white);
    border-top: 1px solid var(--border-light);
    padding: 1.25rem 1.5rem;
    margin-top: 2rem;
  }

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .footer-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .footer-logo {
    font-weight: 600;
    color: var(--text-dark);
  }

  .footer-links {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8125rem;
    color: var(--text-light);
  }

  .footer-links a {
    color: var(--text-muted);
    text-decoration: none;
  }

  .footer-links a:hover {
    color: var(--primary);
  }

  /* ─── Responsive Design ──────────────────────── */
  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .actions-grid {
      grid-template-columns: 1fr;
    }

    .backend-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .header-nav {
      display: none;
    }

    .welcome-text {
      font-size: 1.25rem;
    }

    .footer-content {
      flex-direction: column;
      gap: 0.75rem;
      text-align: center;
    }
  }

  @media (max-width: 480px) {
    .stats-grid {
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .stat-card {
      padding: 0.875rem;
      gap: 0.5rem;
    }

    .stat-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
    }

    /* .stat-icon svg {
      width: 18px;
      height: 18px;
    } */

    .stat-value {
      font-size: 1.125rem;
    }

    .dashboard-main {
      padding: 1rem;
    }
  }
</style>