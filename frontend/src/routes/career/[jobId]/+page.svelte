<!-- src/routes/career/[jobId]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { 
    Loader2, Leaf, User, MapPin, Briefcase, 
    Clock, ArrowLeft, CheckCircle2
  } from 'lucide-svelte';

  let isLoading = $state(true);
  let job = $state<any>(null);
  let error = $state('');
  let user = $state<any>(null);
  let jobId = '';

  function decodeHtml(html: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  }

  function formatDeadline(dateString: string): string {
    if (!dateString) return 'কোনো deadline নেই';
    const date = new Date(dateString);
    return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function isExpired(deadline: string): boolean {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }

  function formatFee(amount: number): string {
    if (!amount || amount === 0) return 'ফ্রি';
    return `৳${amount}`;
  }

  async function fetchJobDetail() {
    try {
      const res = await fetch(`http://localhost:3001/career/jobs/${jobId}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        job = await res.json();
      } else {
        error = 'জব পাওয়া যায়নি';
      }
    } catch (err) {
      error = 'জব লোড করতে সমস্যা হয়েছে';
    } finally {
      isLoading = false;
    }
  }

  async function checkAuth() {
    try {
      const res = await fetch('http://localhost:3001/auth/me', { credentials: 'include' });
      if (res.ok) user = await res.json();
    } catch (err) { console.error(err); }
  }

  function handleApply() {
    if (!user) {
      goto('/login');
      return;
    }
    goto(`/career/${jobId}/apply`);
  }

  onMount(() => {
    jobId = window.location.pathname.split('/').pop() || '';
    checkAuth();
    fetchJobDetail();
  });
</script>

<div class="job-detail-page">

  <main class="main-content">
    <button class="back-btn" onclick={() => goto('/career')}>
      <ArrowLeft size={16} /> ফিরে যান
    </button>

    {#if isLoading}
      <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>লোড হচ্ছে...</p></div>
    {:else if error}
      <div class="loading-state">
        <p>{error}</p>
        <button class="btn btn-primary" onclick={() => goto('/career')}>Career পেজে ফিরে যান</button>
      </div>
    {:else if job}
      <div class="job-detail-card">
        <div class="job-header">
          <h1 class="job-title">{job.title}</h1>
          <p class="job-department">{job.department || 'UnityPulse Foundation'}</p>
          
          <div class="job-meta-row">
            <span class="meta-item"><MapPin size={14} /> {job.location || 'Bangladesh'}</span>
            <span class="meta-item"><Briefcase size={14} /> {job.jobType || 'Full-time'}</span>
            {#if job.experience}
              <span class="meta-item"><Clock size={14} /> {job.experience}</span>
            {/if}
          </div>
        </div>

        <div class="job-section">
          <h2 class="section-title">বিবরণ</h2>
          <p class="section-content bangla" style="white-space: pre-line;">{decodeHtml(job.description || '')}</p>
        </div>

        <div class="job-section">
          <h2 class="section-title">প্রয়োজনীয়তা</h2>
          <p class="section-content bangla" style="white-space: pre-line;">{decodeHtml(job.requirements || '')}</p>
        </div>

        <div class="job-section">
          <h2 class="section-title">তথ্য</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">আবেদন ফি</span>
              <span class="info-value mono">{formatFee(job.applicationFee)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Deadline</span>
              <span class="info-value mono">{formatDeadline(job.deadline)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">অবস্থা</span>
              <span class="info-value">
                {job.status === 'CLOSED' || isExpired(job.deadline) ? 'বন্ধ' : 'খোলা আছে'}
              </span>
            </div>
          </div>
        </div>

        {#if job.applicationFee > 0}
          <div class="fee-notice">
            <span class="fee-note bangla">⚠️ আবেদন ফি <strong>অ-ফেরতযোগ্য</strong>।</span>
          </div>
        {/if}

        <button 
          class="btn btn-primary apply-btn" 
          onclick={handleApply}
          disabled={job.status === 'CLOSED' || isExpired(job.deadline)}
        >
          {job.applicationFee > 0 
            ? `৳${job.applicationFee} পে করে আবেদন করুন` 
            : 'ফ্রিতে আবেদন করুন'}
        </button>
      </div>
    {/if}
  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&family=Hind+Siliguri:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  .job-detail-page { min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #F6F4EE; color: #16231F; }
  .bangla { font-family: 'Hind Siliguri', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }
  .main-content { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem; }
  .back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: #5B675F; font-size: 14px; cursor: pointer; padding: 8px 0; margin-bottom: 12px; font-family: 'Hind Siliguri', sans-serif; }
  .back-btn:hover { color: #1F5D50; }
  
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }
  
  .job-detail-card { background: white; border: 1px solid #E4EDE9; border-radius: 16px; padding: 24px; }
  .job-header { border-bottom: 1px solid #E4EDE9; padding-bottom: 16px; }
  .job-title { font-family: 'Baloo Da 2', sans-serif; font-size: 22px; font-weight: 700; color: #153F36; }
  .job-department { font-size: 13px; color: #5B675F; margin-top: 4px; }
  .job-meta-row { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
  .meta-item { display: flex; align-items: center; gap: 4px; font-size: 12.5px; color: #5B675F; }
  
  .job-section { margin-top: 20px; }
  .section-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #153F36; }
  .section-content { font-size: 14px; line-height: 1.7; color: #16231F; }
  
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .info-item { background: #F6F4EE; border-radius: 10px; padding: 12px; text-align: center; }
  .info-label { display: block; font-size: 11px; color: #8B9790; margin-bottom: 4px; }
  .info-value { font-size: 14px; font-weight: 600; color: #16231F; }
  
  .fee-notice { background: #FBEBD0; border: 1px solid #F0D5A0; border-radius: 10px; padding: 12px; margin-top: 16px; text-align: center; }
  .fee-note { font-size: 12.5px; color: #8A5A17; }
  
  .apply-btn { width: 100%; padding: 12px; margin-top: 16px; }
  .btn { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 10px; border: none; cursor: pointer; }
  .btn-primary { background: #1F5D50; color: white; }
  .btn-primary:hover { background: #153F36; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>