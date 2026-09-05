<!-- src/routes/admin/causes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, Plus, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-svelte';

  let isLoading = $state(true);
  let causes = $state<any[]>([]);
  let error = $state('');

  async function fetchCauses() {
    try {
      const res = await fetch('http://localhost:3001/admin/causes', { credentials: 'include' });
      if (res.ok) {
        causes = await res.json();
      } else {
        error = 'Cause লোড করতে সমস্যা হয়েছে';
      }
    } catch (err) {
      error = 'Cause লোড করতে সমস্যা হয়েছে';
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchCauses();
  });
</script>

<div class="admin-page">
  <div class="page-header">
    <div>
      <h1 class="page-title">Cause List</h1>
      <p class="page-sub bangla">সব Cause এবং তাদের অবস্থা</p>
    </div>
    <a href="/admin/causes/create" class="btn btn-primary">
      <Plus size={16} /> নতুন Cause
    </a>
  </div>

  {#if isLoading}
    <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>লোড হচ্ছে...</p></div>
  {:else if error}
    <div class="loading-state"><p>{error}</p></div>
  {:else if causes.length > 0}
    <div class="cause-list">
      {#each causes as cause}
        <div class="cause-card">
          {#if cause.coverImage}
            <img src={cause.coverImage} alt={cause.title} class="cause-thumb" width="600" height="140" loading="lazy" />
          {/if}
          <div class="cause-top">
            <div class="cause-info">
              <h2 class="cause-title">{cause.title}</h2>
              <div class="cause-badges">
                {#if cause.isFeatured}
                  <span class="badge featured">⭐ Featured</span>
                {/if}
                <span class="badge" class:active={cause.status === 'ACTIVE'}>
                  {cause.status === 'ACTIVE' ? 'Active' : 'Closed'}
                </span>
              </div>
            </div>
            <a href={`/admin/causes/${cause.id}/edit`} class="edit-btn">
              <Edit size={14} /> Edit
            </a>
          </div>
          
          <div class="cause-stats">
            <span class="stat"><strong>{cause._count?.projects || 0}</strong> Projects</span>
            <span class="stat"><strong>{cause._count?.joinRequests || 0}</strong> Pending Requests</span>
            <span class="stat"><strong>{cause._count?.faqs || 0}</strong> FAQs</span>
          </div>
          
          <a href={`/admin/causes/${cause.id}/requests`} class="requests-link">
            Join Requests দেখুন →
          </a>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon">🎯</div>
      <h3>কোনো Cause নেই</h3>
      <p class="bangla">নতুন Cause তৈরি করুন।</p>
      <a href="/admin/causes/create" class="btn btn-primary">Cause তৈরি করুন</a>
    </div>
  {/if}
</div>

<style>
  .admin-page { max-width: 700px; }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  .page-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: #153F36;
  }
  .page-sub { font-size: 13px; color: #5B675F; }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    border: none;
  }
  .btn-primary { background: #1F5D50; color: white; }
  .btn-primary:hover { background: #153F36; }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }
  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .cause-list { display: flex; flex-direction: column; gap: 12px; }
  .cause-card {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 14px;
    padding: 16px 18px;
  }
    .cause-thumb {
    width: 100%;
    height: 140px;
    object-fit: cover;
    border-radius: 10px;
    margin-bottom: 12px;
    display: block;
  }
  .cause-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }
  .cause-info { flex: 1; }
  .cause-title {
    font-size: 15px;
    font-weight: 700;
    color: #153F36;
  }
  .cause-badges {
    display: flex;
    gap: 6px;
    margin-top: 6px;
    flex-wrap: wrap;
  }
  .badge {
    font-size: 10.5px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 10px;
    background: #E4EDE9;
    color: #5B675F;
  }
  .badge.active { background: #EAF4EE; color: #1F6E45; }
  .badge.featured { background: #FBEBD0; color: #8A5A17; }
  .edit-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    color: #1F5D50;
    text-decoration: none;
    padding: 5px 10px;
    border: 1px solid #1F5D50;
    border-radius: 6px;
    flex-shrink: 0;
  }
  .cause-stats {
    display: flex;
    gap: 16px;
    margin-top: 12px;
    padding: 10px;
    background: #F6F4EE;
    border-radius: 8px;
  }
  .stat { font-size: 12px; color: #5B675F; }
  .stat strong { color: #153F36; font-size: 14px; }
  .requests-link {
    display: block;
    margin-top: 10px;
    font-size: 12px;
    color: #1F5D50;
    text-decoration: none;
    font-weight: 600;
  }
  .empty-state {
    text-align: center;
    padding: 48px 20px;
    background: white;
    border: 1px dashed #E4EDE9;
    border-radius: 16px;
  }
  .empty-icon { font-size: 32px; margin-bottom: 10px; }
</style>