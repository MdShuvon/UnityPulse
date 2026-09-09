<!-- frontend/src/routes/tasks/+page.svelte - COMPLETELY FIXED -->
<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { 
    Loader2, 
    Camera, 
    FileText, 
    Globe, 
    CheckSquare, 
    ClipboardList,
    Clock,
    Users,
    ChevronRight,
    AlertCircle,
    Search
  } from "lucide-svelte";

  let isLoading = $state(true);
  let tasks = $state<any[]>([]);
  let error = $state("");
  let filter = $state<'ALL' | 'GLOBAL' | 'ORG'>('ALL');
  let searchQuery = $state('');

  function formatDeadline(dateString: string): string {
    if (!dateString) return "চলমান কাজ";
    const date = new Date(dateString);
    if (date.getFullYear() >= 2099) return "চলমান কাজ";
    return date.toLocaleDateString("bn-BD", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function timeRemaining(dateString: string): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (date.getFullYear() >= 2099) return "";
    const diff = Math.floor((date.getTime() - Date.now()) / 86400000);
    if (diff < 0) return "মেয়াদ শেষ";
    if (diff === 0) return "আজ শেষ দিন";
    if (diff === 1) return "আগামীকাল শেষ";
    if (diff < 7) return `${diff} দিন বাকি`;
    if (diff < 30) return `${Math.floor(diff / 7)} সপ্তাহ বাকি`;
    return `${Math.floor(diff / 30)} মাস বাকি`;
  }

  function proofTypeLabel(type: string): string {
    if (type === "PHOTO") return "ছবি";
    if (type === "TEXT") return "লেখা";
    if (type === "BOTH") return "ছবি + লেখা";
    return type;
  }

  function isExpired(task: any): boolean {
    if (!task.date || task.date === "2099-12-31") return false;
    return new Date(task.date) < new Date();
  }

  async function fetchTasks() {
    isLoading = true;
    error = "";
    
    try {
      const res = await fetch("http://localhost:3001/tasks", {
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        tasks = Array.isArray(data) ? data : (data.data || []);
      } else {
        const errorData = await res.json().catch(() => null);
        error = errorData?.error || "Task লোড করতে সমস্যা হয়েছে";
      }
    } catch (err) {
      console.error('Fetch error:', err);
      error = "সার্ভারে সংযোগ করা যাচ্ছে না";
    } finally {
      isLoading = false;
    }
  }

  let filteredTasks = $derived(
  tasks.filter(task => {
    if (filter === 'GLOBAL' && task.orgId) return false;
    if (filter === 'ORG' && !task.orgId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return task.title?.toLowerCase().includes(q) || 
             task.description?.toLowerCase().includes(q);
    }
    return true;
  })
);

  onMount(() => {
    fetchTasks();
  });
</script>

<div class="tasks-page">
  <main class="main-content">
    <!-- Hero Section -->
    <div class="page-hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-icon-wrap">
          <CheckSquare size={32} class="hero-icon" />
        </div>
        <h1 class="hero-title">কমিউনিটি কাজ</h1>
        <p class="hero-sub bangla">কাজ সম্পন্ন করুন, পয়েন্ট অর্জন করুন, পরিবর্তন আনুন</p>
        <div class="hero-actions">
          <a href="/tasks/mine" class="hero-link">
            <ClipboardList size={14} /> আমার কাজ
          </a>
          <span class="hero-stats">
            <Users size={14} /> {tasks.length} টি কাজ
          </span>
        </div>
      </div>
    </div>

    <!-- Search and Filter -->
    <div class="controls-bar">
      <div class="search-wrapper">
         <Search
          size={18}
          style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #8B9790; pointer-events: none;"
        />
        <input 
          type="text" 
          class="search-input bangla" 
          placeholder="কাজ খুঁজুন..."
          bind:value={searchQuery}
        />
      </div>
      <div class="filter-buttons">
        <button 
          type="button"
          class="filter-btn" 
          class:active={filter === 'ALL'}
          onclick={() => filter = 'ALL'}
        >
          সব
        </button>
        <button 
          type="button"
          class="filter-btn" 
          class:active={filter === 'GLOBAL'}
          onclick={() => filter = 'GLOBAL'}
        >
          <Globe size={12} /> গ্লোবাল
        </button>
        <button 
          type="button"
          class="filter-btn" 
          class:active={filter === 'ORG'}
          onclick={() => filter = 'ORG'}
        >
          সংগঠন
        </button>
      </div>
    </div>

    {#if isLoading}
      <div class="loading-state">
        <Loader2 size={48} class="spin-anim" />
        <p class="bangla">কাজ লোড হচ্ছে...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <AlertCircle size={32} class="error-icon" />
        <p class="error-text bangla">{error}</p>
        <button type="button" class="retry-btn" onclick={fetchTasks}>
          আবার চেষ্টা করুন
        </button>
      </div>
    {:else if filteredTasks.length > 0}
      <div class="tasks-grid">
        {#each filteredTasks as task}
          <div
            class="task-card"
            class:expired={isExpired(task)}
            onclick={() => goto(`/tasks/${task.id}`)}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === "Enter" && goto(`/tasks/${task.id}`)}
          >
            <div class="card-header">
              <div class="task-type-badge">
                {#if !task.orgId}
                  <Globe size={10} />
                {:else}
                  <Users size={10} />
                {/if}
              </div>
              <span class="points-badge">+{task.pointValue} pts</span>
            </div>

            <h2 class="task-title">{task.title}</h2>
            
            {#if task.org?.name}
              <span class="org-name bangla">{task.org.name}</span>
            {/if}

            <div class="task-tags">
              <span class="tag">
                {#if task.proofType === "TEXT"}
                  <FileText size={12} />
                {:else}
                  <Camera size={12} />
                {/if}
                {proofTypeLabel(task.proofType)}
              </span>
              {#if task.date && task.date !== "2099-12-31"}
                <span class="tag deadline-tag" class:expired={isExpired(task)}>
                  <Clock size={12} />
                  {timeRemaining(task.date) || formatDeadline(task.date)}
                </span>
              {/if}
            </div>

            <p class="task-desc bangla">
              {task.description?.length > 100
                ? task.description.slice(0, 100) + "..."
                : task.description}
            </p>

            <div class="card-footer">
              <span class="submission-count mono">
                {task._count?.submissions || 0} টি জমা
              </span>
              <span class="view-detail">
                বিস্তারিত <ChevronRight size={14} />
              </span>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <h3 class="empty-title bangla">কোনো কাজ নেই</h3>
        <p class="empty-body bangla">
          {searchQuery ? 'আপনার খোঁজ অনুযায়ী কোনো কাজ পাওয়া যায়নি।' : 'নতুন কাজ শীঘ্রই আসছে। পরে আবার চেক করুন।'}
        </p>
        {#if searchQuery}
          <button type="button" class="clear-search" onclick={() => searchQuery = ''}>
            খোঁজ মুছুন
          </button>
        {/if}
      </div>
    {/if}
  </main>
</div>

<style>
  .tasks-page {
    min-height: 100vh;
    font-family: "DM Sans", sans-serif;
    background: #f6f4ee;
    color: #16231f;
  }
  .bangla {
    font-family: "Hind Siliguri", sans-serif;
  }
  .mono {
    font-family: "DM Mono", monospace;
  }

  .main-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 2rem;
  }
  @media (max-width: 768px) {
    .main-content {
      max-width: 100%;
      padding: 1rem;
    }
  }

  .page-hero {
    position: relative;
    border-radius: 30px 46px 30px 30px;
    overflow: hidden;
    min-height: 280px;
    display: flex;
    align-items: flex-end;
    margin-bottom: 24px;
    background: linear-gradient(135deg, #E9A23B, #B8503F);
  }
  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(10,16,13,0.8) 0%, rgba(10,16,13,0.2) 100%);
  }
  .hero-content {
    position: relative;
    z-index: 1;
    padding: 32px;
    width: 100%;
  }
  .hero-icon-wrap {
    width: 56px;
    height: 56px;
    background: rgba(255,255,255,0.2);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  .hero-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 36px;
    font-weight: 800;
    color: white;
    margin-bottom: 8px;
  }
  .hero-sub {
    font-size: 15px;
    color: rgba(255,255,255,0.9);
    margin-bottom: 16px;
  }
  .hero-actions {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .hero-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    background: white;
    color: #B8503F;
    border-radius: 24px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    font-family: 'Hind Siliguri', sans-serif;
    transition: all 0.2s;
  }
  .hero-link:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .hero-stats {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: white;
    font-size: 13px;
    opacity: 0.9;
  }

  .controls-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .search-wrapper {
    flex: 1;
    min-width: 200px;
    position: relative;
  }
  .search-input {
    width: 100%;
    padding: 10px 16px 10px 36px;
    border: 1px solid #e4ede9;
    border-radius: 12px;
    font-size: 14px;
    background: white;
    outline: none;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .search-input:focus {
    border-color: #1f5d50;
    box-shadow: 0 0 0 3px rgba(31,93,80,0.1);
  }
  .filter-buttons {
    display: flex;
    gap: 8px;
  }
  .filter-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 10px 16px;
    background: white;
    border: 1px solid #e4ede9;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    color: #5b675f;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .filter-btn:hover {
    background: #f6f4ee;
  }
  .filter-btn.active {
    background: #1f5d50;
    color: white;
    border-color: #1f5d50;
  }

  .tasks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 16px;
  }
  @media (max-width: 768px) {
    .tasks-grid {
      grid-template-columns: 1fr;
    }
  }

  .task-card {
    background: white;
    border: 1px solid #e4ede9;
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  .task-card:hover {
    border-color: #1f5d50;
    box-shadow: 0 4px 12px rgba(31, 93, 80, 0.1);
    transform: translateY(-2px);
  }
  .task-card.expired {
    opacity: 0.7;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .task-type-badge {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #f6f4ee;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #5b675f;
  }
  .points-badge {
    font-size: 12px;
    font-weight: 700;
    background: #fbebd0;
    color: #8a5a17;
    padding: 5px 12px;
    border-radius: 14px;
  }
  .task-title {
    font-family: "Baloo Da 2", sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: #153f36;
    margin-bottom: 8px;
  }
  .org-name {
    display: inline-block;
    font-size: 12px;
    background: #e8f5e9;
    color: #2e7d32;
    padding: 3px 10px;
    border-radius: 10px;
    margin-bottom: 8px;
  }
  .task-tags {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .tag {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    background: #e4ede9;
    color: #153f36;
    padding: 4px 10px;
    border-radius: 20px;
  }
  .deadline-tag {
    background: #fdf0ed;
    color: #b8503f;
  }
  .deadline-tag.expired {
    background: #ffebee;
    color: #c62828;
  }
  .task-desc {
    font-size: 13.5px;
    color: #5b675f;
    line-height: 1.6;
    margin-bottom: 16px;
  }
  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid #e4ede9;
  }
  .submission-count {
    font-size: 11.5px;
    color: #8b9790;
  }
  .view-detail {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 12.5px;
    color: #1f5d50;
    font-weight: 600;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .loading-state {
    text-align: center;
    padding: 3rem;
    color: #5b675f;
  }
  .loading-state p {
    margin-top: 12px;
  }

  .error-state {
    text-align: center;
    padding: 3rem;
    background: white;
    border: 1px solid #e4ede9;
    border-radius: 16px;
  }
  .error-text {
    color: #b8503f;
    margin-bottom: 16px;
  }
  .retry-btn {
    padding: 10px 20px;
    background: #1f5d50;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .retry-btn:hover {
    background: #153f36;
  }

  .empty-state {
    text-align: center;
    padding: 48px 20px;
    background: white;
    border: 1px dashed #e4ede9;
    border-radius: 16px;
  }
  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }
  .empty-title {
    font-family: "Baloo Da 2", sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: #153f36;
    margin-bottom: 8px;
  }
  .empty-body {
    font-size: 14px;
    color: #5b675f;
    margin-bottom: 16px;
  }
  .clear-search {
    padding: 8px 16px;
    background: #f6f4ee;
    color: #5b675f;
    border: 1px solid #e4ede9;
    border-radius: 8px;
    cursor: pointer;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .clear-search:hover {
    background: #e4ede9;
  }
</style>