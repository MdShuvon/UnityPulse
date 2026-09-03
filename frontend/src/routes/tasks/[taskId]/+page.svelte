<!-- src/routes/tasks/[taskId]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, Camera, FileText, Star, Globe, ArrowLeft, CheckCircle2, Clock } from 'lucide-svelte';

  let isLoading = $state(true);
  let task = $state<any>(null);
  let error = $state('');
  let user = $state<any>(null);
  let taskId = '';

  function formatDeadline(dateString: string): string {
    if (!dateString) return 'চলমান কাজ';
    const date = new Date(dateString);
    if (date.getFullYear() >= 2099) return 'চলমান কাজ';
    return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function proofTypeLabel(type: string): string {
    if (type === 'PHOTO') return 'ছবি জমা দিতে হবে';
    if (type === 'TEXT') return 'লেখা জমা দিতে হবে';
    if (type === 'BOTH') return 'ছবি এবং লেখা দুটোই জমা দিতে হবে';
    return type;
  }

  async function fetchTaskDetail() {
    try {
      const res = await fetch(`http://localhost:3001/tasks/${taskId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        task = await res.json();
      } else {
        error = 'Task পাওয়া যায়নি';
      }
    } catch (err) {
      error = 'Task লোড করতে সমস্যা হয়েছে';
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

  function handleSubmit() {
    if (!user) {
      goto(`/login?redirect=/tasks/${taskId}/submit`);
      return;
    }
    goto(`/tasks/${taskId}/submit`);
  }

  function submissionStatusLabel(status: string): string {
    if (status === 'PENDING') return 'পর্যালোচনার অপেক্ষায়';
    if (status === 'APPROVED') return 'অনুমোদিত';
    if (status === 'REJECTED') return 'প্রত্যাখ্যাত';
    return status;
  }

  onMount(() => {
    taskId = window.location.pathname.split('/').pop() || '';
    checkAuth();
    fetchTaskDetail();
  });
</script>

<div class="task-detail-page">
  <main class="main-content">
    <button class="back-btn" onclick={() => goto('/tasks')}>
      <ArrowLeft size={16} /> ফিরে যান
    </button>

    {#if isLoading}
      <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>লোড হচ্ছে...</p></div>
    {:else if error}
      <div class="loading-state">
        <p>{error}</p>
        <button class="btn btn-primary" onclick={() => goto('/tasks')}>Tasks পেজে ফিরে যান</button>
      </div>
    {:else if task}
      <div class="task-detail-card">
        <div class="task-header">
          <div class="task-title-row">
            <h1 class="task-title">{task.title}</h1>
            <span class="points-badge">+{task.pointValue} pts</span>
          </div>
          
          <div class="task-badges">
            {#if !task.orgId}
              <span class="global-badge"><Globe size={10} /> সবার জন্য</span>
            {:else if task.org}
              <span class="org-badge">{task.org.name}</span>
            {/if}
            <span class="proof-badge">
              {#if task.proofType === 'TEXT'}
                <FileText size={10} />
              {:else}
                <Camera size={10} />
              {/if}
              {proofTypeLabel(task.proofType)}
            </span>
          </div>
        </div>

        <div class="task-section">
          <h2 class="section-title">বিবরণ</h2>
          <p class="section-content bangla" style="white-space: pre-line;">{task.description}</p>
        </div>

        <div class="task-section">
          <h2 class="section-title">তথ্য</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">পয়েন্ট</span>
              <span class="info-value mono">+{task.pointValue}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Proof Type</span>
              <span class="info-value">{task.proofType === 'PHOTO' ? 'ছবি' : task.proofType === 'TEXT' ? 'লেখা' : 'ছবি + লেখা'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Deadline</span>
              <span class="info-value mono">{formatDeadline(task.date)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">জমা</span>
              <span class="info-value mono">{task._count?.submissions || 0} টি</span>
            </div>
          </div>
        </div>

        {#if task.mySubmission}
          <div class="submission-status">
            <div class="status-header">
              <span class="status-label">আপনার জমা</span>
              <span class="status-badge" class:approved={task.mySubmission.status === 'APPROVED'} class:rejected={task.mySubmission.status === 'REJECTED'}>
                {submissionStatusLabel(task.mySubmission.status)}
              </span>
            </div>
            {#if task.mySubmission.status === 'REJECTED'}
              <p class="rejected-note bangla">আপনি আবার জমা দিতে পারেন</p>
            {/if}
          </div>
        {/if}

        <button 
          class="btn btn-primary submit-btn" 
          onclick={handleSubmit}
          disabled={task.mySubmission?.status === 'PENDING' || task.mySubmission?.status === 'APPROVED'}
        >
          {#if task.mySubmission?.status === 'APPROVED'}
            <CheckCircle2 size={16} /> অনুমোদিত হয়েছে
          {:else if task.mySubmission?.status === 'PENDING'}
            <Clock size={16} /> পর্যালোচনার অপেক্ষায়
          {:else if task.mySubmission?.status === 'REJECTED'}
            আবার জমা দিন
          {:else}
            কাজ জমা দিন
          {/if}
        </button>
      </div>
    {/if}
  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&family=Hind+Siliguri:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  .task-detail-page { min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #F6F4EE; color: #16231F; }
  .bangla { font-family: 'Hind Siliguri', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }
  
  .main-content { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem; }
  .back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: #5B675F; font-size: 14px; cursor: pointer; padding: 8px 0; margin-bottom: 12px; font-family: 'Hind Siliguri', sans-serif; }
  .back-btn:hover { color: #1F5D50; }
  
  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }
  
  .task-detail-card { background: white; border: 1px solid #E4EDE9; border-radius: 16px; padding: 24px; }
  .task-header { border-bottom: 1px solid #E4EDE9; padding-bottom: 16px; }
  .task-title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .task-title { font-family: 'Baloo Da 2', sans-serif; font-size: 22px; font-weight: 700; color: #153F36; flex: 1; }
  .points-badge { flex-shrink: 0; font-size: 13px; font-weight: 700; background: #FBEBD0; color: #8A5A17; padding: 5px 12px; border-radius: 16px; }
  .task-badges { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
  .global-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 600; background: #FFF3E0; color: #E65100; padding: 3px 10px; border-radius: 12px; }
  .org-badge { font-size: 11px; font-weight: 600; background: #E8F5E9; color: #2E7D32; padding: 3px 10px; border-radius: 12px; }
  .proof-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 600; background: #E4EDE9; color: #153F36; padding: 3px 10px; border-radius: 12px; }
  
  .task-section { margin-top: 20px; }
  .section-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #153F36; }
  .section-content { font-size: 14px; line-height: 1.7; color: #16231F; }
  
  .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .info-item { background: #F6F4EE; border-radius: 10px; padding: 12px; text-align: center; }
  .info-label { display: block; font-size: 11px; color: #8B9790; margin-bottom: 4px; }
  .info-value { font-size: 14px; font-weight: 600; color: #16231F; }
  
  .submission-status { background: #F6F4EE; border-radius: 10px; padding: 14px; margin-top: 20px; }
  .status-header { display: flex; justify-content: space-between; align-items: center; }
  .status-label { font-size: 13px; font-weight: 600; color: #5B675F; }
  .status-badge { font-size: 12px; font-weight: 600; background: #FFF3E0; color: #E65100; padding: 4px 12px; border-radius: 12px; }
  .status-badge.approved { background: #E8F5E9; color: #2E7D32; }
  .status-badge.rejected { background: #FDF0ED; color: #B8503F; }
  .rejected-note { font-size: 12px; color: #B8503F; margin-top: 8px; }
  
  .submit-btn { width: 100%; padding: 12px; margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .btn { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 10px; border: none; cursor: pointer; }
  .btn-primary { background: #1F5D50; color: white; }
  .btn-primary:hover { background: #153F36; }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>