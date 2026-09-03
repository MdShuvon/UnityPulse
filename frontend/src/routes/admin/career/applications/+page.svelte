<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, CheckCircle2, XCircle, Eye } from 'lucide-svelte';

  let isLoading = $state(true);
  let applications = $state<any[]>([]);
  let error = $state('');
  let rejectNote = $state('');
  let showRejectModal = $state(false);
  let rejectingAppId = $state<string | null>(null);
  let isProcessing = $state(false);

  async function fetchApplications() {
    try {
      const res = await fetch('http://localhost:3001/admin/career/applications', {
        credentials: 'include',
      });
      if (res.ok) {
        applications = await res.json();
      } else {
        error = 'আবেদন লোড করতে সমস্যা হয়েছে';
      }
    } catch (err) {
      error = 'আবেদন লোড করতে সমস্যা হয়েছে';
    } finally {
      isLoading = false;
    }
  }

  async function viewCV(applicationId: string) {
    try {
      const res = await fetch(`http://localhost:3001/admin/career/applications/${applicationId}/cv`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, '_blank');
      }
    } catch (err) { alert('CV লোড করতে সমস্যা হয়েছে'); }
  }

  function openRejectModal(applicationId: string) {
    rejectingAppId = applicationId;
    rejectNote = '';
    showRejectModal = true;
  }

  async function submitReject() {
    if (!rejectNote.trim()) { alert('Reject এর কারণ লিখুন'); return; }
    if (!rejectingAppId || isProcessing) return;
    isProcessing = true;
    try {
      const res = await fetch(`http://localhost:3001/admin/career/applications/${rejectingAppId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'REJECTED', note: rejectNote }),
      });
      if (res.ok) {
        showRejectModal = false;
        rejectNote = '';
        rejectingAppId = null;
        fetchApplications();
      }
    } catch (err) { alert('সার্ভারে সমস্যা হয়েছে'); }
    finally { isProcessing = false; }
  }

  async function acceptApplication(applicationId: string) {
    if (isProcessing) return;
    isProcessing = true;
    try {
      const res = await fetch(`http://localhost:3001/admin/career/applications/${applicationId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'ACCEPTED' }),
      });
      if (res.ok) fetchApplications();
    } catch (err) { alert('সার্ভারে সমস্যা হয়েছে'); }
    finally { isProcessing = false; }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function getInitials(name: string): string {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  onMount(() => { fetchApplications(); });
</script>

<div class="admin-page-content">
  <h1 class="page-title">Applications Review</h1>
  <p class="page-sub bangla">নতুন আবেদনগুলো এখানে দেখুন এবং সিদ্ধান্ত নিন</p>

  {#if isLoading}
    <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>লোড হচ্ছে...</p></div>
  {:else if error}
    <div class="loading-state"><p>{error}</p></div>
  {:else if applications.length > 0}
    {#each applications as app}
      <div class="admin-card">
        <div class="applicant-row">
          <div class="av">{getInitials(app.user?.name)}</div>
          <div class="applicant-info">
            <span class="applicant-name">{app.user?.name}</span>
            <span class="applicant-job bangla">আবেদন: {app.job?.title || 'Unknown'}</span>
          </div>
        </div>
        
        <div class="contact-row mono">
          <span>{app.user?.email}</span>
          <span>{app.user?.phone}</span>
        </div>
        
        <div class="badges-row">
          <span class="pay-badge">
            {#if app.feeStatus === 'FREE'}🆓 Free{:else}✅ Payment Verified{/if}
          </span>
          <button class="cv-btn" onclick={() => viewCV(app.id)}>📄 CV দেখুন</button>
        </div>
        
        <div class="admin-actions">
          <button class="btn btn-accept" onclick={() => acceptApplication(app.id)}>
            <CheckCircle2 size={14} /> Accept
          </button>
          <button class="btn btn-reject" onclick={() => openRejectModal(app.id)}>
            <XCircle size={14} /> Reject
          </button>
        </div>
      </div>
    {/each}
  {:else}
    <div class="empty-state">
      <p>📋 কোনো pending application নেই</p>
    </div>
  {/if}

  {#if showRejectModal}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={() => showRejectModal = false} onkeydown={(e) => e.key === 'Escape' && (showRejectModal = false)} role="dialog" tabindex="-1">
      <div class="modal-content">
        <h3 class="modal-title">Reject Reason</h3>
        <textarea class="reject-input bangla" rows="3" bind:value={rejectNote} placeholder="Reject করার কারণ লিখুন (আবশ্যক)..."></textarea>
        <div class="modal-actions">
          <button class="btn btn-reject" onclick={submitReject} disabled={isProcessing}>
            {isProcessing ? 'প্রসেসিং...' : 'Reject করুন'}
          </button>
          <button class="btn btn-cancel" onclick={() => showRejectModal = false}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .admin-page-content { min-height: 100vh; }
  .page-title { font-family: 'Baloo Da 2', sans-serif; font-size: 22px; font-weight: 700; color: #153F36; }
  .page-sub { font-size: 13px; color: #5B675F; margin-top: 4px; }
  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }
  
  .admin-card { background: white; border: 1px solid #E4EDE9; border-radius: 16px; padding: 18px 20px; margin-top: 18px; }
  .applicant-row { display: flex; align-items: center; gap: 12px; }
  .av { width: 40px; height: 40px; border-radius: 50%; background: #1F5D50; color: white; display: flex; align-items: center; justify-content: center; font-family: 'Baloo Da 2', sans-serif; font-size: 14px; font-weight: 700; }
  .applicant-info { flex: 1; }
  .applicant-name { display: block; font-size: 14.5px; font-weight: 700; }
  .applicant-job { display: block; font-size: 12.5px; color: #5B675F; }
  
  .contact-row { display: flex; gap: 14px; margin-top: 10px; font-size: 12px; color: #5B675F; flex-wrap: wrap; }
  
  .badges-row { display: flex; gap: 8px; margin-top: 12px; align-items: center; }
  .pay-badge { display: inline-flex; align-items: center; gap: 6px; background: #EAF4EE; color: #1F6E45; font-size: 11.5px; font-weight: 600; padding: 5px 12px; border-radius: 20px; }
  .cv-btn { background: white; border: 1px solid #E4EDE9; color: #1F5D50; font-size: 11.5px; font-weight: 600; padding: 5px 12px; border-radius: 20px; cursor: pointer; }
  
  .admin-actions { display: flex; gap: 8px; margin-top: 16px; }
  .btn { font-size: 13px; font-weight: 500; padding: 9px 18px; border-radius: 9px; border: 1px solid transparent; cursor: pointer; flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; }
  .btn-accept { background: #1F5D50; color: white; }
  .btn-reject { background: white; color: #B8503F; border-color: #B8503F; }
  .btn-cancel { background: #F6F4EE; color: #5B675F; }
  
  .empty-state { text-align: center; padding: 48px 20px; background: white; border: 1px dashed #E4EDE9; border-radius: 16px; margin-top: 16px; }
  
  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
  .modal-content { background: white; border-radius: 16px; padding: 24px; max-width: 400px; width: 100%; }
  .modal-title { font-family: 'Baloo Da 2', sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 12px; }
  .reject-input { width: 100%; padding: 10px; border: 1px solid #B8503F; border-radius: 8px; font-size: 12.5px; resize: none; outline: none; font-family: 'Hind Siliguri', sans-serif; min-height: 50px; }
  .modal-actions { display: flex; gap: 10px; margin-top: 16px; }
</style>