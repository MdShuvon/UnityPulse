<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, Plus, Edit, Lock, Unlock, Users, Eye } from 'lucide-svelte';

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
      const res = await fetch('http://localhost:3001/admin/donations/projects', {
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

      const res = await fetch(`http://localhost:3001/admin/donations/ledger?${params}`, {
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
      const res = await fetch(`http://localhost:3001/admin/donations/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchProjects();
    } catch (err) { alert('Server error'); }
    finally { isProcessing = false; }
  }

  onMount(() => { fetchProjects(); });
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
          </div>
          <span class="status-badge" class:closed={project.status === 'closed'}>
            {project.status === 'closed' ? 'Closed' : 'Open'}
          </span>
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

  @media (max-width: 768px) {
    .proj-footer { flex-direction: column; gap: 10px; align-items: flex-start; }
  }
</style>