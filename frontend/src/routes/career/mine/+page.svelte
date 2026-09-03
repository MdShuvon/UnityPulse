<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, Leaf, User, ArrowLeft, CheckCircle2, Clock } from 'lucide-svelte';

  let isLoading = $state(true);
  let applications = $state<any[]>([]);
  let error = $state('');
  let user = $state<any>(null);

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function getStatusBadge(status: string): { label: string; class: string } {
    switch (status) {
      case 'SUBMITTED':
        return { label: 'Under Review', class: 'badge-review' };
      case 'ACCEPTED':
        return { label: 'Accepted', class: 'badge-accepted' };
      case 'REJECTED':
        return { label: 'Rejected', class: 'badge-rejected' };
      case 'SHORTLISTED':
        return { label: 'Shortlisted', class: 'badge-shortlisted' };
      case 'SELECTED':
        return { label: 'Selected', class: 'badge-selected' };
      default:
        return { label: status, class: 'badge-review' };
    }
  }

    function getProgressSteps(status: string): number {
    switch (status) {
      case 'SUBMITTED': return 1;
      case 'ACCEPTED': return 3;
      case 'REJECTED': return 3;
      default: return 1;
    }
  }

  async function checkAuth() {
    try {
      const res = await fetch('http://localhost:3001/auth/me', { credentials: 'include' });
      if (res.ok) user = await res.json();
      else { goto('/login'); return; }
    } catch (err) { console.error(err); }
  }

  async function fetchApplications() {
    try {
      const res = await fetch('http://localhost:3001/career/my-applications', {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        applications = data;
      } else {
        error = 'Ã Â¦â€ Ã Â¦Â¬Ã Â§â€¡Ã Â¦Â¦Ã Â¦Â¨ Ã Â¦Â²Ã Â§â€¹Ã Â¦Â¡ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦Â¸Ã Â¦Â®Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾ Ã Â¦Â¹Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡';
      }
    } catch (err) {
      error = 'Ã Â¦â€ Ã Â¦Â¬Ã Â§â€¡Ã Â¦Â¦Ã Â¦Â¨ Ã Â¦Â²Ã Â§â€¹Ã Â¦Â¡ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦Â¸Ã Â¦Â®Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾ Ã Â¦Â¹Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡';
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    checkAuth();
    fetchApplications();
  });
</script>

<div class="mine-page">

  <main class="main-content">
    <button class="back-btn" onclick={() => goto('/career')}>
      <ArrowLeft size={16} /> Career-Ã Â¦Â Ã Â¦Â«Ã Â¦Â¿Ã Â¦Â°Ã Â§â€¡ Ã Â¦Â¯Ã Â¦Â¾Ã Â¦Â¨
    </button>

    <h1 class="page-title">Ã Â¦â€ Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â° Ã Â¦â€ Ã Â¦Â¬Ã Â§â€¡Ã Â¦Â¦Ã Â¦Â¨Ã Â¦Â¸Ã Â¦Â®Ã Â§â€šÃ Â¦Â¹</h1>
    <p class="page-sub bangla">Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¸Ã Â¦Â¬ Ã Â¦Å“Ã Â¦Â¬ application-Ã Â¦ÂÃ Â¦Â° status</p>

    {#if isLoading}
      <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>Ã Â¦Â²Ã Â§â€¹Ã Â¦Â¡ Ã Â¦Â¹Ã Â¦Å¡Ã Â§ÂÃ Â¦â€ºÃ Â§â€¡...</p></div>
    {:else if error}
      <div class="loading-state"><p>{error}</p></div>
    {:else if applications.length > 0}
      {#each applications as app}
        {@const badge = getStatusBadge(app.status)}
        {@const steps = getProgressSteps(app.status)}
        
        <div class="app-card">
          <div class="app-top">
            <div>
              <h2 class="app-title">{app.job?.title || 'Unknown Job'}</h2>
              <p class="app-sub mono">Applied: {formatDate(app.createdAt)}</p>
            </div>
            <span class="badge {badge.class}">{badge.label}</span>
          </div>

          <!-- Progress Tracker -->
          <div class="mini-track">
            <div class="mini-step done"></div>
            <div class="mini-step" class:done={steps >= 2}></div>
            <div class="mini-step" class:done={steps >= 3}></div>
          </div>
          <div class="track-labels">
            <span>Applied</span>
            <span>Review</span>
            <span>Decision</span>
          </div>

          <!-- Fee Status -->
          <div class="fee-status">
            {#if app.feeStatus === 'free'}
              <span class="fee-badge free">Ã°Å¸â€ â€œ Ã Â¦Â«Ã Â§ÂÃ Â¦Â°Ã Â¦Â¿ Ã Â¦â€ Ã Â¦Â¬Ã Â§â€¡Ã Â¦Â¦Ã Â¦Â¨</span>
            {:else if app.feeStatus === 'PENDING'}
              <span class="fee-badge pending"><Clock size={12} /> Payment Pending</span>
            {:else}
              <span class="fee-badge paid">Ã¢Å“â€¦ Payment Verified</span>
            {/if}
          </div>

          {#if app.reviewNote}
            <p class="review-note bangla">Ã°Å¸â€œÂ {app.reviewNote}</p>
          {/if}
        </div>
      {/each}
    {:else}
      <div class="empty-state">
        <div class="empty-icon">Ã°Å¸â€œâ€¹</div>
        <h3 class="empty-title">Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¨Ã Â§â€¹ Ã Â¦â€ Ã Â¦Â¬Ã Â§â€¡Ã Â¦Â¦Ã Â¦Â¨ Ã Â¦Â¨Ã Â§â€¡Ã Â¦â€¡</h3>
        <p class="empty-body bangla">Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¿ Ã Â¦ÂÃ Â¦â€“Ã Â¦Â¨Ã Â§â€¹ Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¨Ã Â§â€¹ Ã Â¦Å“Ã Â¦Â¬Ã Â§â€¡ Ã Â¦â€ Ã Â¦Â¬Ã Â§â€¡Ã Â¦Â¦Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â§â€¡Ã Â¦Â¨Ã Â¦Â¨Ã Â¦Â¿Ã Â¥Â¤</p>
        <button class="btn btn-primary" onclick={() => goto('/career')}>Ã Â¦Å“Ã Â¦Â¬ Ã Â¦Â¦Ã Â§â€¡Ã Â¦â€“Ã Â§ÂÃ Â¦Â¨</button>
      </div>
    {/if}
  </main>
</div>

<style>
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  .mine-page { min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #F6F4EE; color: #16231F; }
  .bangla { font-family: 'Hind Siliguri', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }
  

  .main-content { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem; }
  .back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: #5B675F; font-size: 14px; cursor: pointer; padding: 8px 0; }
  .back-btn:hover { color: #1F5D50; }
  .page-title { font-family: 'Baloo Da 2', sans-serif; font-size: 24px; font-weight: 800; color: #153F36; margin-top: 8px; }
  .page-sub { font-size: 13px; color: #5B675F; margin-top: 4px; }
  
  .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }
  
  .app-card { background: white; border: 1px solid #E4EDE9; border-radius: 16px; padding: 16px 18px; margin-top: 12px; }
  .app-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .app-title { font-family: 'Baloo Da 2', sans-serif; font-size: 15.5px; font-weight: 700; color: #153F36; }
  .app-sub { font-size: 12px; color: #5B675F; margin-top: 2px; }
  
  .badge { font-size: 10.5px; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
  .badge-review { background: #FBEBD0; color: #8A5A17; }
  .badge-accepted { background: #EAF4EE; color: #1F6E45; }
  .badge-rejected { background: #F6E4E1; color: #B8503F; }
  .badge-shortlisted { background: #EAF4EE; color: #1F6E45; }
  .badge-selected { background: #1F5D50; color: white; }
  
  .mini-track { display: flex; gap: 4px; margin-top: 12px; }
  .mini-step { flex: 1; height: 4px; border-radius: 3px; background: #E4EDE9; }
  .mini-step.done { background: #1F5D50; }
  .track-labels { display: flex; justify-content: space-between; margin-top: 4px; font-size: 9px; color: #8B9790; }
  
  .fee-status { margin-top: 12px; }
  .fee-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; padding: 5px 12px; border-radius: 20px; }
  .fee-badge.free { background: #EAF4EE; color: #1F6E45; }
  .fee-badge.pending { background: #FBEBD0; color: #8A5A17; }
  .fee-badge.paid { background: #EAF4EE; color: #1F6E45; }
  
  .review-note { font-size: 12.5px; color: #5B675F; margin-top: 10px; background: #F6F4EE; padding: 8px 12px; border-radius: 8px; }
  
  .empty-state { text-align: center; padding: 48px 20px; background: white; border: 1px dashed #E4EDE9; border-radius: 16px; margin-top: 16px; }
  .empty-icon { font-size: 32px; margin-bottom: 10px; }
  .empty-title { font-family: 'Baloo Da 2', sans-serif; font-size: 17px; font-weight: 700; color: #153F36; }
  .empty-body { font-size: 13.5px; color: #5B675F; margin-top: 6px; }
  .btn { font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 500; padding: 9px 20px; border-radius: 10px; border: none; cursor: pointer; margin-top: 12px; }
  .btn-primary { background: #1F5D50; color: white; }
  
</style>