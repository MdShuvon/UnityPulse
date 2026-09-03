<!-- src/routes/tasks/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, Camera, FileText, Globe } from 'lucide-svelte';

  let isLoading = $state(true);
  let tasks = $state<any[]>([]);
  let error = $state('');

  function formatDeadline(dateString: string): string {
    if (!dateString) return 'চলমান কাজ';
    const date = new Date(dateString);
    if (date.getFullYear() >= 2099) return 'চলমান কাজ';
    return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function timeRemaining(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (date.getFullYear() >= 2099) return '';
    const diff = Math.floor((date.getTime() - Date.now()) / 86400000);
    if (diff < 0) return 'মেয়াদ শেষ';
    if (diff === 0) return 'আজ শেষ দিন';
    if (diff === 1) return 'আগামীকাল শেষ';
    return `${diff} দিন বাকি`;
  }

  function proofTypeLabel(type: string): string {
    if (type === 'PHOTO') return 'ছবি';
    if (type === 'TEXT') return 'লেখা';
    if (type === 'BOTH') return 'ছবি + লেখা';
    return type;
  }

  async function fetchTasks() {
    try {
      const res = await fetch('http://localhost:3001/tasks', {
        credentials: 'include'
      });
      if (res.ok) {
        tasks = await res.json();
      } else {
        error = 'Task লোড করতে সমস্যা হয়েছে';
      }
    } catch (err) {
      error = 'Task লোড করতে সমস্যা হয়েছে';
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchTasks();
  });
</script>

<div class="tasks-page">
  <main class="main-content">
    <div class="tasks-header">
      <h1 class="tasks-title">কাজ</h1>
      <p class="tasks-sub bangla">কাজ সম্পন্ন করুন, পয়েন্ট অর্জন করুন</p>
      <a href="/tasks/mine" class="my-tasks-link">📋 আমার কাজ</a>
    </div>

    {#if isLoading}
      <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>লোড হচ্ছে...</p></div>
    {:else if error}
      <div class="loading-state"><p>{error}</p></div>
    {:else if tasks.length > 0}
      {#each tasks as task}
        <div class="task-card" onclick={() => goto(`/tasks/${task.id}`)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && goto(`/tasks/${task.id}`)}>
          <div class="task-top">
            <div class="task-title-wrap">
              <h2 class="task-title">{task.title}</h2>
              <div class="task-badges">
                {#if !task.orgId}
                  <span class="global-badge"><Globe size={10} /> সবার জন্য</span>
                {:else if task.org}
                  <span class="org-badge">{task.org.name}</span>
                {/if}
              </div>
            </div>
            <span class="points-badge">+{task.pointValue} pts</span>
          </div>
          
          <div class="task-tags">
            <span class="tag">
              {#if task.proofType === 'TEXT'}
                <FileText size={12} />
              {:else}
                <Camera size={12} />
              {/if}
              {proofTypeLabel(task.proofType)}
            </span>
            {#if task.date && task.date !== '2099-12-31'}
              <span class="tag deadline-tag">
                ⏰ {timeRemaining(task.date) || formatDeadline(task.date)}
              </span>
            {/if}
          </div>
          
          <p class="task-desc bangla">
            {task.description.length > 120 ? task.description.slice(0, 120) + '...' : task.description}
          </p>
          
          <div class="task-foot">
            <span class="submission-count mono">{task._count?.submissions || 0} টি জমা</span>
            <span class="view-detail">বিস্তারিত →</span>
          </div>
        </div>
      {/each}
    {:else}
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <h3 class="empty-title">কোনো কাজ নেই</h3>
        <p class="empty-body bangla">নতুন কাজ শীঘ্রই আসছে। পরে আবার চেক করুন।</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .tasks-page {
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
  .tasks-header {
    text-align: center;
    padding: 6px 0 4px;
  }
  .tasks-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #153F36;
  }
  .tasks-sub {
    font-size: 13px;
    color: #5B675F;
    margin-top: 4px;
  }
  .my-tasks-link {
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
  .my-tasks-link:hover { background: #F0D5A0; }

  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }

  .task-card {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 16px;
    padding: 18px;
    margin-top: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .task-card:hover {
    border-color: #1F5D50;
    box-shadow: 0 2px 8px rgba(31,93,80,0.08);
  }
  .task-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .task-title-wrap { flex: 1; }
  .task-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 17px;
    font-weight: 700;
    color: #153F36;
  }
  .task-badges {
    display: flex;
    gap: 6px;
    margin-top: 4px;
    flex-wrap: wrap;
  }
  .global-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 10.5px;
    font-weight: 600;
    background: #FFF3E0;
    color: #E65100;
    padding: 2px 8px;
    border-radius: 10px;
  }
  .org-badge {
    font-size: 10.5px;
    font-weight: 600;
    background: #E8F5E9;
    color: #2E7D32;
    padding: 2px 8px;
    border-radius: 10px;
  }
  .points-badge {
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 700;
    background: #FBEBD0;
    color: #8A5A17;
    padding: 4px 10px;
    border-radius: 14px;
  }
  .task-tags {
    display: flex;
    gap: 6px;
    margin-top: 10px;
    flex-wrap: wrap;
  }
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
  .deadline-tag { background: #FDF0ED; color: #B8503F; }
  .task-desc {
    font-size: 13.5px;
    color: #16231F;
    margin-top: 10px;
    line-height: 1.6;
  }
  .task-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid #E4EDE9;
  }
  .submission-count { font-size: 11.5px; color: #8B9790; }
  .view-detail { font-size: 12.5px; color: #1F5D50; font-weight: 600; }

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