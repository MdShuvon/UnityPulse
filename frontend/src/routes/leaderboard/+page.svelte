<!-- src/routes/leaderboard/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { Loader2, Trophy, Star, Medal, Award, Crown, TrendingUp, Heart, CheckCircle2, Building2 } from "lucide-svelte";

  let isLoading = $state(true);
  let activeTab = $state<'donation' | 'task' | 'organization'>('donation');
  let donationLeaders = $state<any[]>([]);
  let taskLeaders = $state<any[]>([]);
  let orgLeaders = $state<any[]>([]);
  let myRank = $state<any>(null);
  let error = $state("");

  function getInitials(name: string): string {
    return name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  }

  function formatPoints(points: number): string {
    if (points >= 1000) return (points / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return points.toString();
  }

  function getRankIcon(rank: number) {
    if (rank === 1) return Crown;
    if (rank === 2) return Medal;
    if (rank === 3) return Award;
    return null;
  }

  async function fetchLeaderboard() {
    try {
      const [donRes, taskRes, orgRes, myRankRes] = await Promise.all([
        fetch("http://localhost:3001/leaderboard/donation?limit=20&page=1", { credentials: "include" }),
        fetch("http://localhost:3001/leaderboard/task?limit=20&page=1", { credentials: "include" }),
        fetch("http://localhost:3001/leaderboard/organization?limit=20", { credentials: "include" }),
        fetch("http://localhost:3001/leaderboard/my-rank", { credentials: "include" }),
      ]);

      if (donRes.ok) {
        const data = await donRes.json();
        donationLeaders = data.data || [];
      }
      if (taskRes.ok) {
        const data = await taskRes.json();
        taskLeaders = data.data || [];
      }
      if (orgRes.ok) {
        orgLeaders = await orgRes.json();
      }
      if (myRankRes.ok) {
        myRank = await myRankRes.json();
      }
    } catch (err) {
      error = "লিডারবোর্ড লোড করতে সমস্যা হয়েছে";
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchLeaderboard();
  });
</script>

<div class="leaderboard-page">
  <main class="main-content">
    <!-- Hero -->
    <div class="page-hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <Trophy size={36} class="hero-icon" />
        <h1 class="hero-title">লিডারবোর্ড</h1>
        <p class="hero-sub bangla">সেরা পারফর্মারদের তালিকা — Donation, Task, Organization</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tab-bar">
      <button class="tab-btn" class:active={activeTab === 'donation'} onclick={() => activeTab = 'donation'}>
        <Heart size={14} /> Donation
      </button>
      <button class="tab-btn" class:active={activeTab === 'task'} onclick={() => activeTab = 'task'}>
        <CheckCircle2 size={14} /> Task
      </button>
      <button class="tab-btn" class:active={activeTab === 'organization'} onclick={() => activeTab = 'organization'}>
        <Building2 size={14} /> Organization
      </button>
    </div>

    {#if isLoading}
      <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>লোড হচ্ছে...</p></div>
    {:else if error}
      <div class="loading-state"><p>{error}</p></div>
    {:else if activeTab === 'donation' && donationLeaders.length > 0}
      <!-- Top 3 -->
      <div class="podium">
        {#each donationLeaders.slice(0, 3) as leader, i}
          {@const RankIcon = getRankIcon(i + 1)}
          <div class="podium-card" class:first={i === 0} class:second={i === 1} class:third={i === 2}>
            <div class="podium-rank">
              {#if RankIcon}<RankIcon size={12} />{/if}
              #{i + 1}
            </div>
            <div class="podium-avatar">
              {#if leader.user?.profilePhoto}
                <img src={leader.user.profilePhoto} alt={leader.user.name} width="64" height="64" />
              {:else}
                {getInitials(leader.user?.name || "?")}
              {/if}
            </div>
            <span class="podium-name">{leader.user?.name || "Unknown"}</span>
            <span class="podium-points mono">
              <Star size={12} fill="#E9A23B" color="#E9A23B" />
              {formatPoints(leader.totalPoints || 0)} pts
            </span>
          </div>
        {/each}
      </div>

      <!-- Rest -->
      <div class="leader-list">
        {#each donationLeaders.slice(3) as leader, i}
          <div class="leader-item">
            <span class="rank-number mono">#{i + 4}</span>
            <div class="leader-avatar">
              {#if leader.user?.profilePhoto}
                <img src={leader.user.profilePhoto} alt={leader.user.name} width="40" height="40" />
              {:else}
                {getInitials(leader.user?.name || "?")}
              {/if}
            </div>
            <div class="leader-info">
              <span class="leader-name">{leader.user?.name || "Unknown"}</span>
              <span class="leader-badge bangla">{leader.badge}</span>
            </div>
            <span class="leader-points mono">{formatPoints(leader.totalPoints || 0)} pts</span>
          </div>
        {/each}
      </div>

    {:else if activeTab === 'task' && taskLeaders.length > 0}
      <!-- Top 3 -->
      <div class="podium">
        {#each taskLeaders.slice(0, 3) as leader, i}
          {@const RankIcon = getRankIcon(i + 1)}
          <div class="podium-card" class:first={i === 0} class:second={i === 1} class:third={i === 2}>
            <div class="podium-rank">
              {#if RankIcon}<RankIcon size={12} />{/if}
              #{i + 1}
            </div>
            <div class="podium-avatar">
              {#if leader.user?.profilePhoto}
                <img src={leader.user.profilePhoto} alt={leader.user.name} width="64" height="64" />
              {:else}
                {getInitials(leader.user?.name || "?")}
              {/if}
            </div>
            <span class="podium-name">{leader.user?.name || "Unknown"}</span>
            <span class="podium-points mono">
              <Star size={12} fill="#E9A23B" color="#E9A23B" />
              {formatPoints(leader.totalPoints || 0)} pts · {leader.taskCount || 0} tasks
            </span>
          </div>
        {/each}
      </div>

      <!-- Rest -->
      <div class="leader-list">
        {#each taskLeaders.slice(3) as leader, i}
          <div class="leader-item">
            <span class="rank-number mono">#{i + 4}</span>
            <div class="leader-avatar">
              {#if leader.user?.profilePhoto}
                <img src={leader.user.profilePhoto} alt={leader.user.name} width="40" height="40" />
              {:else}
                {getInitials(leader.user?.name || "?")}
              {/if}
            </div>
            <div class="leader-info">
              <span class="leader-name">{leader.user?.name || "Unknown"}</span>
              <span class="leader-badge bangla">{leader.badge}</span>
            </div>
            <span class="leader-points mono">{formatPoints(leader.totalPoints || 0)} pts</span>
          </div>
        {/each}
      </div>

    {:else if activeTab === 'organization' && orgLeaders.length > 0}
      <div class="leader-list">
        {#each orgLeaders as org}
          <div class="leader-item org-item">
            <span class="rank-number mono">#{org.rank}</span>
            <div class="leader-avatar org-avatar">
              <Building2 size={20} />
            </div>
            <div class="leader-info">
              <span class="leader-name">{org.org?.name || "Unknown Org"}</span>
              <span class="leader-badge bangla">{org.org?.area?.name || ''} · {org.org?.memberCount || 0} members</span>
            </div>
            <span class="leader-points mono">{formatPoints(org.score || 0)} score</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <div class="empty-icon"><Trophy size={40} /></div>
        <h3 class="empty-title">এখনো কোনো র‌্যাংক নেই</h3>
        <p class="empty-body bangla">কাজ সম্পন্ন করে পয়েন্ট অর্জন করুন!</p>
      </div>
    {/if}

    <!-- My Rank — ফুটারের আগে সবার শেষে -->
    {#if myRank && !isLoading}
      <div class="my-rank-card">
        <div class="my-rank-left">
          <TrendingUp size={20} />
          <span class="bangla">আমার র‌্যাংক</span>
        </div>
        <div class="my-rank-details">
          {#if activeTab === 'donation' && myRank.global?.donation?.rank}
            <span class="my-rank-number">#{myRank.global.donation.rank}</span>
            <span class="my-rank-points mono">{formatPoints(myRank.global.donation.points)} pts · {myRank.global.donation.badge}</span>
          {:else if activeTab === 'task' && myRank.global?.task?.rank}
            <span class="my-rank-number">#{myRank.global.task.rank}</span>
            <span class="my-rank-points mono">{formatPoints(myRank.global.task.points)} pts · {myRank.global.task.badge}</span>
          {:else if activeTab === 'organization'}
            <span class="my-rank-points bangla">Organization rank আসছে</span>
          {:else}
            <span class="my-rank-points bangla">এখনো র‌্যাংক নেই</span>
          {/if}
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .leaderboard-page {
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    color: #16231F;
  }
  .bangla { font-family: 'Hind Siliguri', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }

  .main-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 2rem;
  }

  .page-hero {
    position: relative;
    border-radius: 30px 46px 30px 30px;
    overflow: hidden;
    min-height: 30vh;
    background: linear-gradient(135deg, #16231F, #E9A23B);
    display: flex;
    align-items: flex-end;
    margin-bottom: 20px;
  }
  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(10,16,13,0.8) 0%, rgba(10,16,13,0.1) 100%);
  }
  .hero-content { position: relative; z-index: 1; padding: 28px; }
  /* .hero-icon { color: #E9A23B; margin-bottom: 8px; } */
  .hero-title { font-family: 'Baloo Da 2', sans-serif; font-size: 32px; font-weight: 800; color: white; }
  .hero-sub { font-size: 14px; color: rgba(255,255,255,0.85); margin-top: 6px; }

  .tab-bar {
    display: flex;
    gap: 4px;
    background: #E4EDE9;
    border-radius: 16px;
    padding: 4px;
    margin-bottom: 16px;
  }
  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    font-size: 12.5px;
    font-weight: 600;
    color: #5B675F;
    background: none;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-family: 'Hind Siliguri', sans-serif;
    transition: all 0.15s;
  }
  .tab-btn.active {
    background: white;
    color: #153F36;
    box-shadow: 0 1px 3px rgba(21,63,54,0.12);
  }

  .my-rank-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    border: 2px solid #E9A23B;
    border-radius: 16px;
    padding: 14px 18px;
    margin-bottom: 16px;
  }
  .my-rank-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 700;
    color: #153F36;
  }
  .my-rank-details { text-align: right; }
  .my-rank-number {
    display: block;
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 22px;
    font-weight: 800;
    color: #E9A23B;
  }
  .my-rank-points { font-size: 11px; color: #5B675F; }

  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }

  .podium {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .podium-card {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 16px;
    padding: 1.5rem 1rem;
    text-align: center;
    position: relative;
  }
  .podium-card.first { border-color: #E9A23B; box-shadow: 0 4px 16px rgba(233,162,59,0.2); }
  .podium-card.second { border-color: #B0BEC5; }
  .podium-card.third { border-color: #D4A574; }
  .podium-rank {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: #E9A23B;
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .podium-avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    margin: 0 auto 8px;
    background: #1F5D50;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 20px;
    font-weight: 700;
    overflow: hidden;
  }
  .podium-avatar img { width: 64px; height: 64px; object-fit: cover; }
  .podium-name { display: block; font-size: 13px; font-weight: 600; }
  .podium-points {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 12px;
    color: #1F5D50;
    font-weight: 600;
    margin-top: 4px;
  }

  .leader-list { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
  .leader-item {
    display: flex;
    align-items: center;
    gap: 12px;
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 12px;
    padding: 12px 16px;
  }
  .rank-number { font-size: 14px; font-weight: 700; color: #8B9790; min-width: 32px; }
  .leader-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #1F5D50;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 14px;
    font-weight: 700;
    overflow: hidden;
    flex-shrink: 0;
  }
  .leader-avatar img { width: 40px; height: 40px; object-fit: cover; }
  .org-avatar { background: #153F36; }
  .leader-info { flex: 1; }
  .leader-name { display: block; font-size: 14px; font-weight: 600; }
  .leader-badge { font-size: 11.5px; color: #8B9790; }
  .leader-points { font-size: 13px; font-weight: 700; color: #1F5D50; }

  .empty-state { text-align: center; padding: 48px 20px; background: white; border: 1px dashed #E4EDE9; border-radius: 16px; }
  .empty-icon { margin-bottom: 10px; color: #8B9790; }
  .empty-title { font-family: 'Baloo Da 2', sans-serif; font-size: 17px; font-weight: 700; color: #153F36; }
  .empty-body { font-size: 13.5px; color: #5B675F; margin-top: 6px; }

  @media (max-width: 768px) {
    .main-content { max-width: 100%; padding: 1rem; }
    .page-hero { min-height: 20vh; }
    .hero-title { font-size: 24px; }
    .podium { grid-template-columns: 1fr; }
  }
</style>