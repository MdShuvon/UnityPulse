<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, Plus, Edit, Lock, Unlock, Users, Eye, Mail } from 'lucide-svelte';

  let isLoading = $state(true);
  let projects = $state<any[]>([]);
  let ledger = $state<any[]>([]);
  let error = $state('');
  let isProcessing = $state(false);
  let showLedger = $state(false);
  let selectedProject = $state<any>(null);
  let projectFilter = $state('all');
  let startDate = $state('');
  let endDate = $state('');
  let user = $state<any>(null);
    let showNotifyModal = $state(false);
    let notifyProject = $state<any>(null);
    let problemType = $state('ENCODING');
    let problemDetails = $state('');
    let isSubmittingNotify = $state(false);
    let notifyError = $state('');

  async function fetchUser() {
    try {
      const res = await fetch('https://localhost:3001/auth/me', {
        credentials: 'include',
      });
      if (res.ok) user = await res.json();
    } catch (err) {
      console.error(err);
    }
  }

  // Modal states

  function openNotifyModal(project: any) {
    notifyProject = project;
    problemType = 'ENCODING';
    problemDetails = '';
    notifyError = '';
    showNotifyModal = true;
  }

  function closeNotifyModal() {
    showNotifyModal = false;
    notifyProject = null;
    problemType = 'ENCODING';
    problemDetails = '';
    notifyError = '';
  }

  async function submitNotify() {
    if (isSubmittingNotify || !notifyProject) return;

    if (problemDetails.trim().length < 10) {
      notifyError = 'সমস্যার বিবরণ কমপক্ষে ১০ অক্ষর দিতে হবে';
      return;
    }

    isSubmittingNotify = true;
    notifyError = '';

    try {
      const res = await fetch(
        `https://localhost:3001/admin/donations/projects/${notifyProject.id}/notify-creator`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ problemType, problemDetails }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        closeNotifyModal();
        // Success toast
        showToast(`"${data.creatorName}"-কে notify করা হয়েছে`, 'success');
      } else {
        notifyError = data.error || 'Notify করতে সমস্যা হয়েছে';
      }
    } catch (err) {
      notifyError = 'Network error';
    } finally {
      isSubmittingNotify = false;
    }
  }

  // Toast system
  let toasts = $state<Array<{ id: number; message: string; type: 'success' | 'error' }>>([]);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = Date.now();
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
    }, 4000);
  }

  function formatTaka(amount: number): string {
    return '৳ ' + amount.toLocaleString('en-IN');
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getProgress(project: any): number {
    if (project.goalAmount === 0) return 0;
    return Math.min(100, (project.collectedAmount / project.goalAmount) * 100);
  }

  async function fetchProjects() {
    try {
      const res = await fetch('https://localhost:3001/admin/donations/projects', {
        credentials: 'include',
      });
      if (res.ok) {
        projects = await res.json();
      }
    } catch (err) { console.error(err); }
    finally { isLoading = false; }
  }

  async function fetchLedger(projectId?: string) {
    try {
      const params = new URLSearchParams();
      if (projectId && projectId !== 'all') params.append('projectId', projectId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`https://localhost:3001/admin/donations/ledger?${params}`, {
        credentials: 'include',
      });
      if (res.ok) {
        ledger = await res.json();
      }
    } catch (err) { console.error(err); }
  }

  function openLedger(project: any) {
    selectedProject = project;
    projectFilter = project.id;
    showLedger = true;
    fetchLedger(project.id);
  }

  function closeLedger() {
    showLedger = false;
    selectedProject = null;
    projectFilter = 'all';
    ledger = [];
  }

  async function toggleProjectStatus(projectId: string, currentStatus: string) {
    if (isProcessing) return;
    isProcessing = true;
    
    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    
    try {
      const res = await fetch(`https://localhost:3001/admin/donations/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchProjects();
    } catch (err) { alert('Server error'); }
    finally { isProcessing = false; }
  }

  onMount(() => { 
    fetchProjects();
    fetchUser();
  });
</script>

<div class="donations-page">
  <div class="page-top">
    <div>
      <h1 class="page-title">Donation Projects</h1>
      <p class="page-sub bangla">সব ক্যাম্পেইন ব্যবস্থাপনা করুন</p>
    </div>
    <button class="btn-new" onclick={() => goto('/admin/donations/create')}>
      <Plus size={16} /> নতুন Project
    </button>
  </div>

  {#if isLoading}
    <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>Loading...</p></div>
  {:else if projects.length > 0}
    {#each projects as project}
    <div class="proj-row">
      <div class="proj-top">
        <div>
          <div class="proj-title">{project.title}</div>
          {#if project.description}
            <div class="proj-desc bangla">{project.description.slice(0, 80)}...</div>
          {/if}
          
          {#if project.creator && user?.role === 'SUPER_ADMIN'}
            <div class="proj-creator">
              তৈরি করেছেন: <strong>{project.creator.name}</strong>
              {#if project.creator.email}
                · <a href={`mailto:${project.creator.email}`} class="creator-link">{project.creator.email}</a>
              {/if}
            </div>
          {/if}
        </div>
        <div class="proj-actions-top">
          <span class="status-badge" class:closed={project.status === 'closed'}>
            {project.status === 'closed' ? 'Closed' : 'Open'}
          </span>
          
          {#if user?.role === 'SUPER_ADMIN' && project.creator && project.createdBy !== user.id}
            <button 
              class="notify-btn"
              onclick={() => openNotifyModal(project)}
              title="Notify creator to fix this project"
            >
              <Mail size={12} /> Notify Creator
            </button>
          {/if}
        </div>
      </div>

        <div class="progress-track">
          <div class="progress-fill" style={`width: ${getProgress(project)}%`}></div>
        </div>
        <div class="proj-nums">
          <span class="collected mono">{formatTaka(project.collectedAmount)} সংগৃহীত</span>
          <span class="goal mono">লক্ষ্য: {formatTaka(project.goalAmount)}</span>
        </div>

        <div class="proj-footer">
          <div class="donor-count" onclick={() => openLedger(project)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && openLedger(project)}>
            <Users size={14} />
            <span>{project._count?.donations || 0} জন দান করেছেন</span>
            <span class="ledger-link">Ledger দেখুন</span>
          </div>
          <div class="row-actions">
            <button class="icon-btn" onclick={() => goto(`/admin/donations/create?id=${project.id}`)} title="Edit">
              <Edit size={14} />
            </button>
            <button class="icon-btn" onclick={() => toggleProjectStatus(project.id, project.status)} title={project.status === 'active' ? 'Close' : 'Reopen'}>
              {#if project.status === 'active'}
                <Lock size={14} />
              {:else}
                <Unlock size={14} />
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/each}
  {:else}
    <div class="empty-state"><p class="bangla">কোনো donation project নেই। "নতুন Project" button দিয়ে শুরু করুন।</p></div>
  {/if}

  {#if showLedger && selectedProject}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={closeLedger} onkeydown={(e) => e.key === 'Escape' && closeLedger()} role="dialog" tabindex="-1">
      <div class="ledger-modal">
        <div class="ledger-header">
          <h2 class="ledger-title">{selectedProject.title} - Donation Ledger</h2>
          <button class="close-btn" onclick={closeLedger}>X</button>
        </div>

        <div class="filter-row">
          <select class="filter-select" bind:value={projectFilter} onchange={(e) => fetchLedger(projectFilter)}>
            <option value="all">সব Project</option>
            {#each projects as p}
              <option value={p.id}>{p.title}</option>
            {/each}
          </select>
          <input type="date" class="filter-date" bind:value={startDate} onchange={() => fetchLedger(projectFilter)} />
          <input type="date" class="filter-date" bind:value={endDate} onchange={() => fetchLedger(projectFilter)} />
        </div>

        {#if ledger.length > 0}
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Project</th>
                  <th>Amount</th>
                  <th>Transaction</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {#each ledger as donation}
                  <tr>
                    <td>{donation.user?.name || donation.guestName || 'Anonymous'}</td>
                    <td class="bangla">{donation.project?.title || 'N/A'}</td>
                    <td class="mono">{formatTaka(donation.amount)}</td>
                    <td class="mono">{donation.paymentRef || 'N/A'}</td>
                    <td>
                      <span class="verified-badge">{donation.status || 'Verified'}</span>
                    </td>
                    <td class="mono">{formatDate(donation.createdAt)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="no-data bangla">এই filter-এ কোনো donation নেই</p>
        {/if}
      </div>
    </div>
  {/if}
    <!-- Notify Modal -->
  {#if showNotifyModal && notifyProject}
    <div 
      class="modal-overlay" 
      onclick={closeNotifyModal} 
      onkeydown={(e) => e.key === 'Escape' && closeNotifyModal()}
      role="dialog" 
      tabindex="-1"
    >
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="notify-modal" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="presentation">
        <h3 class="notify-title">Notify Creator</h3>
        <p class="notify-sub">
          "{notifyProject.creator?.name}"-কে এই project fix করার জন্য জানান:
        </p>
        <p class="notify-project-title bangla">"{notifyProject.title}"</p>

        <div class="form-group">
          <label class="form-label" for="problem-type">সমস্যার ধরন</label>
          <select id="problem-type" class="form-input" bind:value={problemType}>
            <option value="ENCODING">Bengali text encoding ভুল</option>
            <option value="CONTENT">Content inappropriate</option>
            <option value="AMOUNT">Amount/Goal ভুল</option>
            <option value="OTHER">অন্য সমস্যা</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="problem-details">বিস্তারিত বিবরণ</label>
          <textarea 
            id="problem-details"
            class="form-input bangla" 
            bind:value={problemDetails}
            placeholder="সমস্যা কী সেটা বিস্তারিত লিখুন (কমপক্ষে ১০ অক্ষর)..."
            rows="4"
            maxlength="500"
          ></textarea>
          <p class="char-count">{problemDetails.length}/500</p>
        </div>

        {#if notifyError}
          <div class="notify-error bangla">{notifyError}</div>
        {/if}

        <div class="modal-actions">
          <button class="btn-cancel" onclick={closeNotifyModal}>Cancel</button>
          <button 
            class="btn-submit" 
            onclick={submitNotify} 
            disabled={isSubmittingNotify}
          >
            {#if isSubmittingNotify}
              <Loader2 size={14} class="spin-anim" /> Sending...
            {:else}
              <Mail size={14} /> Send Notification
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Toast Container -->
  <div class="toast-container">
    {#each toasts as toast (toast.id)}
      <div class="toast" class:toast-error={toast.type === 'error'}>
        {toast.message}
      </div>
    {/each}
  </div>
</div>

<style>
  .donations-page { min-height: 100vh; }
  .page-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .page-title { font-family: 'Baloo Da 2', sans-serif; font-size: 22px; font-weight: 700; color: #153F36; }
  .page-sub { font-size: 13px; color: #5B675F; margin-top: 4px; }
  .btn-new { display: flex; align-items: center; gap: 6px; background: #1F5D50; color: white; font-size: 13px; font-weight: 500; padding: 10px 18px; border-radius: 9px; border: none; cursor: pointer; }

  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }

  .proj-row { background: white; border: 1px solid #E4EDE9; border-radius: 14px; padding: 16px 18px; margin-top: 12px; }
  .proj-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .proj-title { font-family: 'Baloo Da 2', sans-serif; font-size: 15px; font-weight: 700; color: #153F36; }
  .proj-desc { font-size: 12px; color: #5B675F; margin-top: 2px; }

  .status-badge { font-size: 11px; font-weight: 600; background: #EAF4EE; color: #1F6E45; padding: 3px 10px; border-radius: 20px; }
  .status-badge.closed { background: #E4EDE9; color: #5B675F; }

  .progress-track { height: 8px; background: #E4EDE9; border-radius: 6px; margin-top: 12px; overflow: hidden; }
  .progress-fill { height: 100%; background: #E9A23B; border-radius: 6px; transition: width 0.3s ease; }

  .proj-nums { display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px; }
  .collected { font-weight: 700; color: #153F36; }
  .goal { color: #5B675F; }

  .proj-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
  .donor-count { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #5B675F; cursor: pointer; }
  .ledger-link { color: #1F5D50; font-weight: 500; }
  .row-actions { display: flex; gap: 6px; }

  .icon-btn { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; padding: 5px 10px; border-radius: 7px; border: 1px solid #E4EDE9; background: white; color: #1F5D50; cursor: pointer; }

  .empty-state { text-align: center; padding: 48px 20px; background: white; border: 1px dashed #E4EDE9; border-radius: 16px; margin-top: 16px; }

  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
  .ledger-modal { background: white; border-radius: 16px; padding: 24px; max-width: 700px; width: 100%; max-height: 80vh; overflow-y: auto; }
  .ledger-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .ledger-title { font-family: 'Baloo Da 2', sans-serif; font-size: 17px; font-weight: 700; color: #153F36; }
  .close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: #5B675F; }

  .filter-row { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .filter-select { padding: 8px 12px; border: 1px solid #E4EDE9; border-radius: 8px; font-size: 12px; outline: none; }
  .filter-date { padding: 8px 12px; border: 1px solid #E4EDE9; border-radius: 8px; font-size: 12px; outline: none; }

  .table-container { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #5B675F; padding: 12px 14px; background: #F6F4EE; border-bottom: 1px solid #E4EDE9; }
  td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #E4EDE9; white-space: nowrap; }

  .verified-badge { font-size: 10.5px; font-weight: 600; background: #EAF4EE; color: #1F6E45; padding: 3px 10px; border-radius: 20px; }
  .no-data { text-align: center; color: #5B675F; padding: 24px; }

.proj-creator {
  font-size: 11.5px;
  color: #8B9790;
  margin-top: 6px;
}
.proj-creator strong {
  color: #153F36;
}
.creator-link {
  color: #1F5D50;
  text-decoration: none;
}
.creator-link:hover {
  text-decoration: underline;
}

.proj-actions-top {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  flex-shrink: 0;
}

.notify-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid #E9A23B;
  background: #FBEBD0;
  color: #8A5A17;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.15s;
  white-space: nowrap;
}
.notify-btn:hover:not(:disabled) {
  background: #E9A23B;
  color: white;
}
.notify-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

  /* Notify Modal */
  .notify-modal {
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .notify-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: #153F36;
    margin-bottom: 6px;
  }

  .notify-sub {
    font-size: 13px;
    color: #5B675F;
    margin-bottom: 4px;
  }

  .notify-project-title {
    font-size: 13px;
    font-weight: 600;
    color: #1F5D50;
    padding: 8px 12px;
    background: #F6F4EE;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .form-group {
    margin-bottom: 14px;
  }

  .form-label {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    color: #5B675F;
    margin-bottom: 6px;
    font-family: 'Hind Siliguri', sans-serif;
  }

  .form-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #E4EDE9;
    border-radius: 10px;
    font-size: 13px;
    background: #F6F4EE;
    outline: none;
    font-family: 'Hind Siliguri', sans-serif;
    box-sizing: border-box;
  }

  .form-input:focus {
    border-color: #1F5D50;
    box-shadow: 0 0 0 3px rgba(31,93,80,0.1);
  }

  textarea.form-input {
    resize: vertical;
    min-height: 80px;
  }

  .char-count {
    text-align: right;
    font-size: 11px;
    color: #8B9790;
    margin-top: 4px;
  }

  .notify-error {
    background: #FDF0ED;
    color: #B8503F;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 12.5px;
    margin-bottom: 12px;
  }

  .modal-actions {
    display: flex;
    gap: 8px;
    margin-top: 20px;
  }

  .btn-cancel {
    flex: 1;
    padding: 10px;
    background: #F6F4EE;
    color: #5B675F;
    border: 1px solid #E4EDE9;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  .btn-submit {
    flex: 2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    background: #1F5D50;
    color: white;
    border: none;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  .btn-submit:hover:not(:disabled) {
    background: #153F36;
  }

  .btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Toast */
  .toast-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    pointer-events: none;
  }

  .toast {
    background: #1F5D50;
    color: white;
    padding: 16px 28px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    font-family: 'Hind Siliguri', sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    animation: toastPop 0.3s ease;
    max-width: 90vw;
    text-align: center;
    pointer-events: auto;
  }

  .toast-error {
    background: #B8503F;
  }

  @keyframes toastPop {
    from { 
      opacity: 0; 
      transform: scale(0.9) translateY(-10px); 
    }
    to { 
      opacity: 1; 
      transform: scale(1) translateY(0); 
    }
  }

  @media (max-width: 768px) {
    .proj-footer { flex-direction: column; gap: 10px; align-items: flex-start; }
  }
</style>