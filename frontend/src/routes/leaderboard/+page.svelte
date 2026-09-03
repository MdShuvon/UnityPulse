<!-- src/routes/leaderboard/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Loader2, Trophy, Star, User } from 'lucide-svelte';

  let isLoading = $state(true);
  let leaders = $state<any[]>([]);
  let error = $state('');

  function getInitials(name: string): string {
    return name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  }

  function formatPoints(points: number): string {
    if (points >= 1000) {
      return (points / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return points.toString();
  }

  async function fetchLeaderboard() {
    try {
      const res = await fetch('http://localhost:3001/leaderboard', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        leaders = data.data || [];
      } else {
        error = 'লিডারবোর্ড লোড করতে সমস্যা হয়েছে';
      }
    } catch (err) {
      error = 'লিডারবোর্ড লোড করতে সমস্যা হয়েছে';
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
    <div class="leaderboard-header">
      <div class="header-icon">
        <Trophy size={32} />
      </div>
      <h1 class="leaderboard-title">লিডারবোর্ড</h1>
      <p class="leaderboard-sub bangla">সেরা পারফর্মারদের তালিকা</p>
    </div>

    {#if isLoading}
      <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>লোড হচ্ছে...</p></div>
    {:else if error}
      <div class="loading-state"><p>{error}</p></div>
    {:else if leaders.length > 0}
      <div class="podium">
        {#each leaders.slice(0, 3) as leader, i}
          <div class="podium-card" class:first={i === 0} class:second={i === 1} class:third={i === 2}>
            <div class="podium-rank">#{i + 1}</div>
            <div class="podium-avatar">
              {#if leader.user?.profilePhoto}
                <img src={leader.user.profilePhoto} alt={leader.user.name} />
              {:else}
                {getInitials(leader.user?.name || '?')}
              {/if}
            </div>
            <span class="podium-name">{leader.user?.name || 'Unknown'}</span>
            <span class="podium-points mono">
              <Star size={12} /> {formatPoints(leader.totalPoints || 0)} pts
            </span>
          </div>
        {/each}
      </div>

      <div class="leader-list">
        {#each leaders.slice(3) as leader, i}
          <div class="leader-item">
            <span class="rank-number mono">#{i + 4}</span>
            <div class="leader-avatar">
              {#if leader.user?.profilePhoto}
                <img src={leader.user.profilePhoto} alt={leader.user.name} />
              {:else}
                {getInitials(leader.user?.name || '?')}
              {/if}
            </div>
            <div class="leader-info">
              <span class="leader-name">{leader.user?.name || 'Unknown'}</span>
              <span class="leader-org bangla">{leader.user?.occupation || 'সদস্য'}</span>
            </div>
            <span class="leader-points mono">{formatPoints(leader.totalPoints || 0)} pts</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <div class="empty-icon">🏆</div>
        <h3 class="empty-title">এখনো কোনো র‌্যাংক নেই</h3>
        <p class="empty-body bangla">কাজ সম্পন্ন করে পয়েন্ট অর্জন করুন!</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .leaderboard-page {
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    background: #F6F4EE;
    color: #16231F;
  }
  .bangla { font-family: 'Hind Siliguri', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }

  .main-content {
    max-width: 640px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }
  .leaderboard-header {
    text-align: center;
    padding: 6px 0 4px;
  }
  .header-icon { color: #E9A23B; margin-bottom: 0.25rem; }
  .leaderboard-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #153F36;
  }
  .leaderboard-sub {
    font-size: 13px;
    color: #5B675F;
    margin-top: 4px;
  }

  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }

  .podium {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 24px;
  }
  .podium-card {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 16px;
    padding: 1.5rem 1rem;
    text-align: center;
    position: relative;
  }
  .podium-card.first {
    border-color: #E9A23B;
    box-shadow: 0 4px 16px rgba(233, 162, 59, 0.2);
  }
  .podium-card.second {
    border-color: #B0BEC5;
  }
  .podium-card.third {
    border-color: #D4A574;
  }
  .podium-rank {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: #E9A23B;
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 10px;
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
  .podium-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .podium-name {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #16231F;
  }
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

  .leader-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }
  .leader-item {
    display: flex;
    align-items: center;
    gap: 12px;
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 12px;
    padding: 12px 16px;
  }
  .rank-number {
    font-size: 14px;
    font-weight: 700;
    color: #8B9790;
    min-width: 32px;
  }
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
  .leader-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .leader-info {
    flex: 1;
  }
  .leader-name {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #16231F;
  }
  .leader-org {
    font-size: 11.5px;
    color: #8B9790;
  }
  .leader-points {
    font-size: 13px;
    font-weight: 700;
    color: #1F5D50;
  }

  .empty-state {
    text-align: center;
    padding: 48px 20px;
    background: white;
    border: 1px dashed #E4EDE9;
    border-radius: 16px;
    margin-top: 16px;
  }
  .empty-icon { font-size: 32px; margin-bottom: 10px; }
  .empty-title { font-family: 'Baloo Da 2', sans-serif; font-size: 17px; font-weight: 700; color: #153F36; }
  .empty-body { font-size: 13.5px; color: #5B675F; margin-top: 6px; }
</style>