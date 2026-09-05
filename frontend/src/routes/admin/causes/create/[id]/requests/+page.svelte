<!-- src/routes/admin/causes/[id]/requests/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, ArrowLeft, CheckCircle2, XCircle } from 'lucide-svelte';

  let isLoading = $state(true);
  let requests = $state<any[]>([]);
  let error = $state('');
  let rejectNote = $state<Record<string, string>>({});
  let showRejectBox = $state<Record<string, boolean>>({});
  let causeId = '';

  async function fetchRequests() {
    try {
      const res = await fetch('http://localhost:3001/admin/causes/join-requests/pending', {
        credentials: 'include'
      });
      if (res.ok) {
        requests = await res.json();
      } else {
        error = 'Requests লোড করতে সমস্যা হয়েছে';
      }
    } catch (err) {
      error = 'Requests লোড করতে সমস্যা হয়েছে';
    } finally {
      isLoading = false;
    }
  }

  async function reviewRequest(requestId: string, decision: 'APPROVED' | 'REJECTED') {
    if (decision === 'REJECTED' && !rejectNote[requestId]?.trim()) {
      alert('Reject করার কারণ লিখুন');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/admin/causes/join-requests/${requestId}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          decision,
          reviewNote: decision === 'REJECTED' ? rejectNote[requestId] : undefined,
        }),
      });

      if (res.ok) {
        requests = requests.filter(r => r.id !== requestId);
      } else {
        const data = await res.json();
        alert(data.error || 'Decision নিতে সমস্যা হয়েছে');
      }
    } catch (err) {
      alert('সার্ভারে সমস্যা হয়েছে');
    }
  }

  onMount(() => {
    causeId = window.location.pathname.split('/')[3] || '';
    fetchRequests();
  });
</script>

<div class="admin-page">
  <button class="back-btn" onclick={() => goto('/admin/causes')}>
    <ArrowLeft size={16} /> Cause List-এ ফিরুন
  </button>

  <div class="page-header">
    <h1 class="page-title">Cause Join Requests</h1>
    <p class="page-sub bangla">বিভিন্ন Organization-এর project যুক্ত হওয়ার অনুরোধ পর্যালোচনা করুন</p>
  </div>

  {#if isLoading}
    <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>লোড হচ্ছে...</p></div>
  {:else if error}
    <div class="loading-state"><p>{error}</p></div>
  {:else if requests.length > 0}
    {#each requests as request}
      <div class="req-card">
        <div class="req-cause">Cause: <b>{request.cause?.title}</b>-এ যুক্ত হতে চায়</div>
        <div class="proj-row">
          <div class="proj-thumb"></div>
          <div>
            <div class="proj-title">{request.project?.title}</div>
            <div class="proj-org">{request.project?.org?.name}</div>
          </div>
        </div>
        {#if request.note}
          <div class="note-box">
            <div class="note-label">Org-এর justification</div>
            <span class="bangla">{request.note}</span>
          </div>
        {/if}
        <div class="admin-actions">
          <button class="btn btn-accept" onclick={() => reviewRequest(request.id, 'APPROVED')}>
            <CheckCircle2 size={14} /> Accept
          </button>
          <button class="btn btn-reject" onclick={() => showRejectBox[request.id] = !showRejectBox[request.id]}>
            <XCircle size={14} /> Reject
          </button>
        </div>
        {#if showRejectBox[request.id]}
          <div class="reject-note">
            <textarea class="bangla" placeholder="Reject করার কারণ লিখুন (আবশ্যক)..." bind:value={rejectNote[request.id]}></textarea>
            <button class="btn btn-reject confirm-reject" onclick={() => reviewRequest(request.id, 'REJECTED')}>
              Confirm Reject
            </button>
          </div>
        {/if}
      </div>
    {/each}
  {:else}
    <div class="empty-state">
      <div class="empty-icon">✅</div>
      <h3>কোনো pending request নেই</h3>
    </div>
  {/if}
</div>

<style>
  .admin-page { max-width: 700px; }
  .back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: #5B675F;
    font-size: 13px;
    cursor: pointer;
    padding: 8px 0;
    margin-bottom: 10px;
  }
  .back-btn:hover { color: #1F5D50; }
  .page-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: #153F36;
  }
  .page-sub { font-size: 13px; color: #5B675F; margin-top: 4px; }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }
  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .req-card {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 16px;
    padding: 18px 20px;
    margin-top: 14px;
  }
  .req-cause { font-size: 11px; color: #5B675F; margin-bottom: 6px; }
  .req-cause b { color: #153F36; }
  .proj-row { display: flex; align-items: center; gap: 10px; }
  .proj-thumb { width: 44px; height: 44px; border-radius: 10px; background: #E4EDE9; flex-shrink: 0; }
  .proj-title { font-size: 14px; font-weight: 700; }
  .proj-org { font-size: 11.5px; color: #5B675F; }
  .note-box {
    background: #F6F4EE;
    border-radius: 10px;
    padding: 10px 14px;
    margin-top: 12px;
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 12.5px;
  }
  .note-label {
    font-size: 10.5px;
    font-weight: 700;
    color: #5B675F;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 4px;
  }
  .admin-actions { display: flex; gap: 8px; margin-top: 14px; }
  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    padding: 9px 18px;
    border-radius: 9px;
    border: none;
    cursor: pointer;
    flex: 1;
  }
  .btn-accept { background: #1F5D50; color: white; }
  .btn-accept:hover { background: #153F36; }
  .btn-reject {
    background: white;
    color: #B8503F;
    border: 1px solid #B8503F;
  }
  .btn-reject:hover { background: #FDF0ED; }
  .reject-note { margin-top: 10px; }
  .reject-note textarea {
    width: 100%;
    border: 1px solid #B8503F;
    border-radius: 8px;
    padding: 8px 10px;
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 12.5px;
    min-height: 50px;
    resize: vertical;
    outline: none;
  }
  .confirm-reject { margin-top: 8px; }
  .empty-state { text-align: center; padding: 48px 20px; }
  .empty-icon { font-size: 32px; margin-bottom: 10px; }
</style>