<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, Plus, Edit, Lock, Unlock, CheckCircle2, XCircle } from 'lucide-svelte';
  
  let isLoading = $state(true);
  let tasks = $state<any[]>([]);
  let submissions = $state<any[]>([]);
  let error = $state('');
  let isProcessing = $state(false);
  let showReviewModal = $state(false);
  let reviewingTask = $state<any>(null);
  let rejectNote = $state('');
  let showRejectInput = $state(false);
  let rejectingSubmission = $state<any>(null);

  function getInitials(name: string): string {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function fetchTasks() {
    try {
      const res = await fetch('http://localhost:3001/admin/tasks', {
        credentials: 'include',
      });
      if (res.ok) {
        tasks = await res.json();
      }
    } catch (err) { console.error(err); }
  }

  async function openSubmissions(taskId: string) {
    reviewingTask = tasks.find(t => t.id === taskId);
    showReviewModal = true;
    
    try {
      const res = await fetch('http://localhost:3001/admin/tasks/submissions', {
        credentials: 'include',
      });
      if (res.ok) {
        const allSubs = await res.json();
        submissions = allSubs.filter((s: any) => s.task?.id === taskId);
      }
    } catch (err) { console.error(err); }
  }

  async function acceptSubmission(submissionId: string) {
    if (isProcessing) return;
    isProcessing = true;
    try {
      const res = await fetch(`http://localhost:3001/admin/tasks/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'APPROVED' }),
      });
      if (res.ok) {
        const newSubs = submissions.filter(s => s.id !== submissionId);
        submissions = newSubs;
        
        // Auto-advance to next submission
        if (currentSubmissionIndex >= newSubs.length) {
          currentSubmissionIndex = Math.max(0, newSubs.length - 1);
        }
        
        // If no more submissions, close modal
        if (newSubs.length === 0) {
          showReviewModal = false;
          currentSubmissionIndex = 0;
        }
      }
    } catch (err) { alert('Server error'); }
    finally { isProcessing = false; }
  }

  async function submitReject() {
    if (!rejectNote.trim()) { alert('Reject reason required'); return; }
    if (!rejectingSubmission || isProcessing) return;
    
    isProcessing = true;
    try {
      const res = await fetch(`http://localhost:3001/admin/tasks/submissions/${rejectingSubmission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'REJECTED', note: rejectNote }),
      });
      if (res.ok) {
        const newSubs = submissions.filter(s => s.id !== rejectingSubmission.id);
        submissions = newSubs;
        showRejectInput = false;
        rejectingSubmission = null;
        rejectNote = '';
        
        if (currentSubmissionIndex >= newSubs.length) {
          currentSubmissionIndex = Math.max(0, newSubs.length - 1);
        }
        
        if (newSubs.length === 0) {
          showReviewModal = false;
          currentSubmissionIndex = 0;
        }
      }
    } catch (err) { alert('Server error'); }
    finally { isProcessing = false; }
  }

  async function toggleTaskStatus(taskId: string, currentStatus: string) {
    if (isProcessing) return;
    isProcessing = true;
    
    const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    
    try {
      const res = await fetch(`http://localhost:3001/admin/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) { alert('Server error'); }
    finally { isProcessing = false; }
  }

  onMount(() => {
    fetchTasks();
    isLoading = false;
  });

  let currentSubmissionIndex = $state(0);

function getCurrentSubmission() {
  return submissions[currentSubmissionIndex] || null;
}

function nextSubmission() {
  if (currentSubmissionIndex < submissions.length - 1) {
    currentSubmissionIndex += 1;
  }
}

function getRemainingCount(): string {
  const total = submissions.length;
  const current = currentSubmissionIndex + 1;
  return `${current} / ${total}`;
}

</script>

<div class="tasks-page">
  <div class="page-top">
    <div>
      <h1 class="page-title">Community Tasks</h1>
      <p class="page-sub bangla">সব active ও বন্ধ task এখানে ব্যবস্থাপনা করুন</p>
    </div>
    <button class="btn-new" onclick={() => goto('/admin/tasks/create')}>
      <Plus size={16} /> নতুন Task
    </button>
  </div>

  {#if isLoading}
    <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>Loading...</p></div>
  {:else if tasks.length > 0}
    {#each tasks as task}
      <div class="task-row">
        <div class="task-main">
          <div class="task-title">{task.title}</div>
          <div class="task-tags">
            <span class="tag">{task.proofType || 'PHOTO'} Proof</span>
            <span class="points-tag mono">+{task.pointValue} pts</span>
          </div>
        </div>
        
        <span class="status-badge" class:closed={task.status === 'CLOSED'}>
          {task.status === 'CLOSED' ? 'Closed' : 'Open'}
        </span>
        
        <div class="sub-count" onclick={() => openSubmissions(task.id)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && openSubmissions(task.id)}>
          <span class="num">{task._count?.submissions || 0}</span>
          <span class="lbl">Submissions</span>
        </div>
        
        <div class="row-actions">
          <button class="icon-btn" onclick={() => goto(`/admin/tasks/create?edit=${task.id}`)} title="Edit">
            <Edit size={14} />
          </button>
          <button class="icon-btn" onclick={() => toggleTaskStatus(task.id, task.status)} title={task.status === 'OPEN' ? 'Close' : 'Reopen'}>
            {#if task.status === 'OPEN'}
              <Lock size={14} />
            {:else}
              <Unlock size={14} />
            {/if}
          </button>
        </div>
      </div>
    {/each}
  {:else}
    <div class="empty-state"><p class="bangla">কোনো task নেই। "নতুন Task" button দিয়ে শুরু করুন।</p></div>
  {/if}

  {#if showReviewModal && reviewingTask}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={() => { showReviewModal = false; showRejectInput = false; }} onkeydown={(e) => e.key === 'Escape' && (showReviewModal = false)} role="dialog" tabindex="-1">
      <div class="review-modal">
        <h2 class="review-title">{reviewingTask.title} - Submissions</h2>
        
        {#if submissions.length > 0}
          {@const sub = submissions[currentSubmissionIndex]}
          <div class="counter-badge">{getRemainingCount()}</div>
          
          {#if sub}
            <div class="submission-card">
              <div class="sub-row">
                <div class="av">{getInitials(sub.user?.name)}</div>
                <div>
                  <div class="sub-name">{sub.user?.name}</div>
                  <div class="sub-task bangla">+{reviewingTask.pointValue} pts</div>
                </div>
              </div>
              
              {#if sub.proofPhotos?.length > 0}
                <div class="proof-photos">
                  {#each sub.proofPhotos as photo}
                    <img src={photo} alt="proof" class="proof-photo" />
                  {/each}
                </div>
              {/if}
              
              {#if showRejectInput && rejectingSubmission?.id === sub.id}
                <textarea class="reject-input bangla" bind:value={rejectNote} placeholder="Reject করার কারণ লিখুন (আবশ্যক)..."></textarea>
                <div class="admin-actions">
                  <button class="btn btn-reject" onclick={submitReject}>Reject নিশ্চিত করুন</button>
                  <button class="btn btn-cancel" onclick={() => { showRejectInput = false; }}>বাতিল</button>
                </div>
              {:else}
                <div class="admin-actions">
                  <button class="btn btn-accept" onclick={() => acceptSubmission(sub.id)}>
                    <CheckCircle2 size={14} /> Accept (+{reviewingTask.pointValue} pts দিন)
                  </button>
                  <button class="btn btn-reject" onclick={() => { showRejectInput = true; rejectingSubmission = sub; rejectNote = ''; }}>
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        {:else}
          <p class="no-subs bangla">কোনো pending submission নেই</p>
        {/if}
        
        <button class="btn btn-cancel close-btn" onclick={() => { showReviewModal = false; showRejectInput = false; }}>বন্ধ করুন</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .counter-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  background: #FBEBD0;
  color: #8A5A17;
  padding: 3px 10px;
  border-radius: 20px;
  margin-bottom: 12px;
  }
  .row-actions { display: flex; gap: 6px; }
  .tasks-page { min-height: 100vh; }
  .page-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .page-title { font-family: 'Baloo Da 2', sans-serif; font-size: 22px; font-weight: 700; color: #153F36; }
  .page-sub { font-size: 13px; color: #5B675F; margin-top: 4px; }
  .btn-new { display: flex; align-items: center; gap: 6px; background: #1F5D50; color: white; font-size: 13px; font-weight: 500; padding: 10px 18px; border-radius: 9px; border: none; cursor: pointer; }
  
  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }
  
  .task-row { background: white; border: 1px solid #E4EDE9; border-radius: 14px; padding: 16px 18px; margin-top: 12px; display: flex; align-items: center; gap: 14px; }
  .task-main { flex: 1; }
  .task-title { font-family: 'Baloo Da 2', sans-serif; font-size: 15px; font-weight: 700; color: #153F36; }
  .task-tags { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
  .tag { font-size: 11px; background: #E4EDE9; color: #153F36; padding: 3px 9px; border-radius: 20px; }
  .points-tag { font-size: 11px; background: #FBEBD0; color: #8A5A17; padding: 3px 9px; border-radius: 20px; font-weight: 600; }
  
  .status-badge { font-size: 11px; font-weight: 600; background: #EAF4EE; color: #1F6E45; padding: 3px 10px; border-radius: 20px; }
  .status-badge.closed { background: #E4EDE9; color: #5B675F; }
  
  .sub-count { display: flex; flex-direction: column; align-items: center; justify-content: center; background: #FBEBD0; color: #8A5A17; border-radius: 10px; padding: 6px 14px; cursor: pointer; min-width: 64px; }
  .sub-count .num { font-family: 'DM Mono', monospace; font-size: 16px; font-weight: 700; }
  .sub-count .lbl { font-size: 9px; }
  
  .icon-btn { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; padding: 6px 10px; border-radius: 7px; border: 1px solid #E4EDE9; background: white; color: #1F5D50; cursor: pointer; }
  
  .empty-state { text-align: center; padding: 48px 20px; background: white; border: 1px dashed #E4EDE9; border-radius: 16px; margin-top: 16px; }
  
  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
  .review-modal { background: white; border-radius: 16px; padding: 24px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; }
  .review-title { font-family: 'Baloo Da 2', sans-serif; font-size: 18px; font-weight: 700; color: #153F36; margin-bottom: 16px; }
  
  .submission-card { background: #F6F4EE; border: 1px solid #E4EDE9; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
  .sub-row { display: flex; align-items: center; gap: 10px; }
  .av { width: 36px; height: 36px; border-radius: 50%; background: #1F5D50; color: white; display: flex; align-items: center; justify-content: center; font-family: 'Baloo Da 2', sans-serif; font-size: 13px; font-weight: 700; }
  .sub-name { font-size: 14px; font-weight: 700; }
  .sub-task { font-size: 12px; color: #5B675F; }
  
  .proof-photos { display: grid; gap: 8px; margin-top: 12px; }
  .proof-photo { width: 100%; border-radius: 10px; object-fit: cover; }
  
  .reject-input { width: 100%; border: 1px solid #B8503F; border-radius: 8px; padding: 8px 10px; font-family: 'Hind Siliguri', sans-serif; font-size: 12.5px; min-height: 50px; margin-top: 10px; outline: none; }
  
  .admin-actions { display: flex; gap: 8px; margin-top: 12px; }
  .btn { display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 13px; font-weight: 500; padding: 9px 18px; border-radius: 9px; border: none; cursor: pointer; flex: 1; }
  .btn-accept { background: #1F5D50; color: white; }
  .btn-reject { background: white; color: #B8503F; border: 1px solid #B8503F; }
  .btn-cancel { background: #F6F4EE; color: #5B675F; }
  .close-btn { margin-top: 16px; width: 100%; }
  .no-subs { text-align: center; color: #5B675F; padding: 24px; }
  
  @media (max-width: 768px) {
    .task-row { flex-wrap: wrap; }
    .sub-count { min-width: 50px; }
  }
</style>