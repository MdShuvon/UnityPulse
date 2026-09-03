<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, Plus, Edit, Lock, Unlock } from 'lucide-svelte';

  let isLoading = $state(true);
  let jobs = $state<any[]>([]);
  let error = $state('');
  let isProcessing = $state(false);

  function isExpired(deadline: string | null): boolean {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }

  function formatDeadline(deadline: string | null): string {
    if (!deadline) return 'No deadline';
    return new Date(deadline).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  async function fetchJobs() {
    try {
      const res = await fetch('http://localhost:3001/admin/career/jobs', {
        credentials: 'include',
      });
      if (res.ok) {
        jobs = await res.json();
      } else {
        error = 'Job লোড করতে সমস্যা হয়েছে';
      }
    } catch (err) {
      error = 'Job লোড করতে সমস্যা হয়েছে';
    } finally {
      isLoading = false;
    }
  }

  async function toggleJobStatus(jobId: string, currentStatus: string) {
    if (isProcessing) return;
    isProcessing = true;
    
    const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    
    try {
      const res = await fetch(`http://localhost:3001/admin/career/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (res.ok) {
        fetchJobs();
      }
    } catch (err) {
      alert('Status পরিবর্তন করতে সমস্যা হয়েছে');
    } finally {
      isProcessing = false;
    }
  }

  function viewApplications(jobId: string) {
    goto(`/admin/career/applications?jobId=${jobId}`);
  }

  function editJob(jobId: string) {
    goto(`/admin/career/create?edit=${jobId}`);
  }

  onMount(() => { fetchJobs(); });
</script>

<div class="job-list-page">
  <div class="page-top">
    <div>
      <h1 class="page-title">Job Postings</h1>
      <p class="page-sub bangla">সব সক্রিয় ও বন্ধ পোস্টিং এখানে ব্যবস্থাপনা করুন</p>
    </div>
    <button class="btn-new" onclick={() => goto('/admin/career/create')}>
      <Plus size={16} /> নতুন Job
    </button>
  </div>

  {#if isLoading}
    <div class="loading-state">
      <Loader2 size={48} class="spin-anim" />
      <p>লোড হচ্ছে...</p>
    </div>
  {:else if error}
    <div class="loading-state"><p>{error}</p></div>
  {:else if jobs.length > 0}
    {#each jobs as job}
      {@const expired = isExpired(job.deadline)}
      {@const isOpen = job.status === 'OPEN' && !expired}
      
      <div class="job-row">
        <div class="job-main">
          <div class="job-title">{job.title}</div>
          <div class="job-tags">
            <span class="tag">{job.jobType || 'N/A'}</span>
            <span class="tag">{job.location || 'N/A'}</span>
            <span class="tag mono">Deadline: {formatDeadline(job.deadline)}</span>
          </div>
        </div>
        
        <span class="status-badge" class:closed={!isOpen}>
          {isOpen ? 'Open' : 'Closed'}
        </span>
        
        <div class="app-count" onclick={() => viewApplications(job.id)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && viewApplications(job.id)}>
          <span class="num">{job._count?.applications || 0}</span>
          <span class="lbl">Applications</span>
        </div>
        
        <div class="row-actions">
          <button class="icon-btn" onclick={() => editJob(job.id)} title="Edit">
            <Edit size={14} />
          </button>
          <button class="icon-btn" onclick={() => toggleJobStatus(job.id, isOpen ? 'OPEN' : 'CLOSED')} title={isOpen ? 'Close' : 'Reopen'}>
            {#if isOpen}
              <Lock size={14} />
            {:else}
              <Unlock size={14} />
            {/if}
          </button>
        </div>
      </div>
    {/each}
  {:else}
    <div class="empty-state">
      <p class="bangla">কোনো job posting নেই। "নতুন Job" button দিয়ে শুরু করুন।</p>
    </div>
  {/if}
</div>

<style>
  .job-list-page { min-height: 100vh; }
  
  .page-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .page-title { font-family: 'Baloo Da 2', sans-serif; font-size: 22px; font-weight: 700; color: #153F36; }
  .page-sub { font-size: 13px; color: #5B675F; margin-top: 4px; }
  .btn-new { display: flex; align-items: center; gap: 6px; background: #1F5D50; color: white; font-size: 13px; font-weight: 500; padding: 10px 18px; border-radius: 9px; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .btn-new:hover { background: #153F36; }
  
  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }
  
  .job-row { background: white; border: 1px solid #E4EDE9; border-radius: 14px; padding: 16px 18px; margin-top: 12px; display: flex; align-items: center; gap: 14px; }
  .job-main { flex: 1; }
  .job-title { font-family: 'Baloo Da 2', sans-serif; font-size: 15px; font-weight: 700; color: #153F36; }
  .job-tags { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
  .tag { font-size: 11px; background: #E4EDE9; color: #153F36; padding: 3px 9px; border-radius: 20px; font-family: 'Hind Siliguri', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }
  
  .status-badge { font-size: 11px; font-weight: 600; background: #FBEBD0; color: #8A5A17; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
  .status-badge.closed { background: #E4EDE9; color: #5B675F; }
  
  .app-count { display: flex; flex-direction: column; align-items: center; justify-content: center; background: #EAF4EE; color: #1F6E45; border-radius: 10px; padding: 6px 14px; cursor: pointer; min-width: 64px; }
  .app-count .num { font-family: 'DM Mono', monospace; font-size: 16px; font-weight: 700; }
  .app-count .lbl { font-size: 9.5px; margin-top: 1px; }
  
  .row-actions { display: flex; gap: 6px; }
  .icon-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #E4EDE9; background: white; color: #1F5D50; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .icon-btn:hover { background: #F6F4EE; border-color: #1F5D50; }
  
  .empty-state { text-align: center; padding: 48px 20px; background: white; border: 1px dashed #E4EDE9; border-radius: 16px; margin-top: 16px; }
  
  @media (max-width: 768px) {
    .job-row { flex-wrap: wrap; }
    .app-count { min-width: 50px; padding: 4px 8px; }
  }
</style>