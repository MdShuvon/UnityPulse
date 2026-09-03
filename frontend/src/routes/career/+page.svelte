<!-- src/routes/career/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, MapPin, Briefcase, Clock, Search } from 'lucide-svelte';

  let isLoading = $state(true);
  let jobs = $state<any[]>([]);
  let filteredJobs = $state<any[]>([]);
  let error = $state('');
  let searchQuery = $state('');

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

  function timeRemaining(deadline: string): string {
    if (!deadline) return '';
    const diff = Math.floor((new Date(deadline).getTime() - Date.now()) / 86400000);
    if (diff < 0) return 'মেয়াদ শেষ';
    if (diff === 0) return 'আজ শেষ দিন';
    if (diff === 1) return 'আগামীকাল শেষ';
    return `${diff} দিন বাকি`;
  }

  async function fetchJobs() {
    try {
      const res = await fetch('http://localhost:3001/career/jobs?limit=20&page=1', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        jobs = data.data || [];
        filteredJobs = jobs;
      } else {
        error = 'জব লোড করতে সমস্যা হয়েছে';
      }
    } catch (err) {
      error = 'জব লোড করতে সমস্যা হয়েছে';
    } finally {
      isLoading = false;
    }
  }

  function handleSearch(e: Event) {
    const target = e.target as HTMLInputElement;
    searchQuery = target.value;
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      filteredJobs = jobs;
    } else {
      filteredJobs = jobs.filter(j => 
        j.title.toLowerCase().includes(query) ||
        j.department?.toLowerCase().includes(query) ||
        j.location?.toLowerCase().includes(query)
      );
    }
  }

  onMount(() => {
    fetchJobs();
  });
</script>

<div class="career-page">
  <main class="main-content">
    <div class="career-header">
      <h1 class="career-title">ক্যারিয়ার</h1>
      <p class="career-sub bangla">UnityPulse-এর সাথে আপনার ক্যারিয়ার গড়ুন</p>
      <a href="/career/mine" class="my-apps-link">📋 আমার আবেদনসমূহ</a>
    </div>

    <div class="filter-bar">
      <div class="search-box">
        <Search size={18} class="search-icon" />
        <input
          type="text"
          placeholder="জব খুঁজুন..."
          value={searchQuery}
          oninput={handleSearch}
          class="search-input"
        />
      </div>
    </div>

    {#if isLoading}
      <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>লোড হচ্ছে...</p></div>
    {:else if error}
      <div class="loading-state"><p>{error}</p></div>
    {:else if filteredJobs.length > 0}
      {#each filteredJobs as job}
        <div class="job-card">
          <div class="job-top">
            <div>
              <h2 class="job-title">{job.title}</h2>
              <p class="job-org">{job.department || 'UnityPulse Foundation'}</p>
            </div>
            <span class="status-badge" class:closed={job.status === 'CLOSED' || isExpired(job.deadline)}>
              {job.status === 'CLOSED' || isExpired(job.deadline) ? 'Closed' : 'Open'}
            </span>
          </div>
          
          <div class="job-tags">
            <span class="tag"><Briefcase size={12} /> {job.jobType || 'Full-time'}</span>
            <span class="tag"><MapPin size={12} /> {job.location || 'Bangladesh'}</span>
            {#if job.experience}
              <span class="tag"><Clock size={12} /> {job.experience}</span>
            {/if}
          </div>
          
          <p class="job-desc bangla">
            {job.requirements ? decodeHtml(job.requirements).slice(0, 150) + '...' : 'বিস্তারিত দেখুন...'}
          </p>
          
          <div class="job-foot">
            <span class="deadline mono">
              {#if job.deadline}
                ⏰ {timeRemaining(job.deadline)} · {formatDeadline(job.deadline)}
              {:else}
                কোনো deadline নেই
              {/if}
            </span>
            <button 
              class="btn btn-primary" 
              onclick={() => goto(`/career/${job.id}`)}
              disabled={job.status === 'CLOSED' || isExpired(job.deadline)}
            >
              বিস্তারিত
            </button>
          </div>
        </div>
      {/each}
    {:else}
      <div class="empty-state">
        <div class="empty-icon">💼</div>
        <h3 class="empty-title">কোনো জব পাওয়া যায়নি</h3>
        <p class="empty-body bangla">নতুন সুযোগ শীঘ্রই আসছে। পরে আবার চেক করুন।</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .career-page {
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
  .career-header {
    text-align: center;
    padding: 6px 0 4px;
  }
  .career-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #153F36;
  }
  .career-sub {
    font-size: 13px;
    color: #5B675F;
    margin-top: 4px;
  }
  .my-apps-link {
    display: inline-block;
    margin-top: 12px;
    padding: 8px 16px;
    background: #FBEBD0;
    color: #8A5A17;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .my-apps-link:hover { background: #F0D5A0; }

  .filter-bar { margin-top: 16px; }
  .search-box { position: relative; }
  /* .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #8B9790; } */
  .search-input {
    width: 100%;
    padding: 11px 14px 11px 40px;
    border: 1px solid #E4EDE9;
    border-radius: 10px;
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 14px;
    outline: none;
    background: white;
  }
  .search-input:focus {
    border-color: #1F5D50;
    box-shadow: 0 0 0 3px rgba(31,93,80,0.1);
  }

  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }

  .job-card {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 16px;
    padding: 18px;
    margin-top: 14px;
  }
  .job-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .job-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 17px;
    font-weight: 700;
    color: #153F36;
  }
  .job-org { font-size: 12.5px; color: #5B675F; margin-top: 2px; }
  .status-badge {
    font-size: 11px;
    font-weight: 600;
    background: #FBEBD0;
    color: #8A5A17;
    padding: 3px 10px;
    border-radius: 20px;
  }
  .status-badge.closed { background: #E4EDE9; color: #5B675F; }
  .job-tags { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
  .tag {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    background: #E4EDE9;
    color: #153F36;
    padding: 4px 10px;
    border-radius: 20px;
  }
  .job-desc {
    font-size: 13.5px;
    color: #16231F;
    margin-top: 10px;
    line-height: 1.6;
  }
  .job-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid #E4EDE9;
  }
  .deadline { font-size: 12px; color: #B8503F; font-weight: 500; }
  .btn {
    font-family: 'DM Sans', sans-serif;
    font-size: 13.5px;
    font-weight: 500;
    padding: 9px 20px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
  }
  .btn-primary { background: #1F5D50; color: white; }
  .btn-primary:hover { background: #153F36; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

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