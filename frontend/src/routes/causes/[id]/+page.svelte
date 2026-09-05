<!-- src/routes/causes/[id]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, ArrowLeft, Heart, DollarSign, ChevronDown, ChevronUp } from 'lucide-svelte';

  let isLoading = $state(true);
  let cause = $state<any>(null);
  let error = $state('');
  let activeTab = $state<'story' | 'projects' | 'reports' | 'faq'>('story');
  let openFaqs = $state<Set<string>>(new Set());
  let causeId = '';

  function toggleFaq(id: string) {
    const newSet = new Set(openFaqs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    openFaqs = newSet;
  }

  function formatAmount(amount: number): string {
    if (amount >= 1000) return (amount / 1000).toFixed(1).replace(/\.0$/, '') + 'K ৳';
    return amount + ' ৳';
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  async function fetchCause() {
    try {
      const res = await fetch(`http://localhost:3001/causes/${causeId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        cause = await res.json();
      } else {
        error = 'Cause পাওয়া যায়নি';
      }
    } catch (err) {
      error = 'Cause লোড করতে সমস্যা হয়েছে';
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    causeId = window.location.pathname.split('/').pop() || '';
    fetchCause();
  });
</script>

<div class="cause-detail-page">
  <main class="main-content">
    <button class="back-btn" onclick={() => goto('/dashboard')}>
      <ArrowLeft size={16} /> সব Cause-এ ফিরুন
    </button>

    {#if isLoading}
      <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>লোড হচ্ছে...</p></div>
    {:else if error}
      <div class="loading-state"><p>{error}</p></div>
    {:else if cause}
      <!-- Hero Section -->
      <div class="detail-hero">
        <div class="art" style={`background: ${cause.coverImage ? `url(${cause.coverImage})` : 'linear-gradient(135deg, #2E7A69, #153F36)'}`}></div>
        <div class="overlay">
          <div class="title">{cause.title}</div>
          <div class="sub bangla">{cause.story?.slice(0, 120)}...</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        <button class="tab-btn" class:active={activeTab === 'story'} onclick={() => activeTab = 'story'}>গল্প</button>
        <button class="tab-btn" class:active={activeTab === 'projects'} onclick={() => activeTab = 'projects'}>প্রজেক্ট</button>
        <button class="tab-btn" class:active={activeTab === 'reports'} onclick={() => activeTab = 'reports'}>রিপোর্ট</button>
        <button class="tab-btn" class:active={activeTab === 'faq'} onclick={() => activeTab = 'faq'}>প্রশ্নোত্তর</button>
      </div>

      <!-- Story Tab -->
      {#if activeTab === 'story'}
        <div class="tab-panel active">
          <div class="cause-story">
            <h2 class="story-title">{cause.title}</h2>
            <p class="story-text bangla">{cause.story}</p>
          </div>
        </div>
      {/if}

      <!-- Projects Tab -->
      {#if activeTab === 'projects'}
        <div class="tab-panel active">
          {#if cause.projects?.length > 0}
            {#each cause.projects as project}
              <div class="proj-under-cause">
                <div class="proj-thumb" style={`background: ${project.coverImage ? `url(${project.coverImage})` : 'linear-gradient(135deg, #1F5D50, #153F36)'}`}></div>
                <div class="proj-info">
                  <div class="proj-org">{project.org?.name || 'Organization'}</div>
                  <div class="proj-title">{project.title}</div>
                  <div class="proj-progress">
                    <div class="proj-progress-fill" style={`width: ${Math.round((project.collectedAmount / project.goalAmount) * 100)}%`}></div>
                  </div>
                  <div class="proj-meta mono">{formatAmount(project.collectedAmount)} / {formatAmount(project.goalAmount)}</div>
                </div>
                <button class="proj-donate-btn" onclick={() => goto(`/donate`)}>
                  <DollarSign size={14} /> Donate
                </button>
              </div>
            {/each}
          {:else}
            <p class="empty-text bangla">এই Cause-এ এখনো কোনো প্রজেক্ট নেই।</p>
          {/if}
        </div>
      {/if}

      <!-- Reports Tab -->
      {#if activeTab === 'reports'}
        <div class="tab-panel active">
          <div class="report-card">
            <div class="report-summary">
              <div class="report-stat">
                <div class="num mono">{formatAmount(cause.report?.totalRaised || 0)}</div>
                <div class="lbl">মোট সংগৃহীত</div>
              </div>
              <div class="report-stat">
                <div class="num mono">{formatAmount(cause.report?.totalSpent || 0)}</div>
                <div class="lbl">মোট ব্যয়িত</div>
              </div>
            </div>
            
            {#if cause.report?.expenses?.length > 0}
              {#each cause.report.expenses as expense}
                <div class="expense-item">
                  <div class="expense-photo"></div>
                  <div>
                    <div class="expense-desc bangla">{expense.description}</div>
                    <div class="expense-cat mono">{expense.projectTitle} · {formatDate(expense.createdAt)}</div>
                  </div>
                  <div class="expense-amount">- {formatAmount(expense.amount)}</div>
                </div>
              {/each}
            {:else}
              <p class="empty-text bangla">এখনো কোনো খরচ রেকর্ড করা হয়নি।</p>
            {/if}
          </div>
        </div>
      {/if}

      <!-- FAQ Tab -->
      {#if activeTab === 'faq'}
        <div class="tab-panel active">
          {#if cause.faqs?.length > 0}
            {#each cause.faqs as faq}
              <div class="faq-item" class:open={openFaqs.has(faq.id)} onclick={() => toggleFaq(faq.id)} onkeydown={(e) => e.key === 'Enter' && toggleFaq(faq.id)} role="button" tabindex="0">
                <div class="faq-q">
                  {faq.question}
                  {#if openFaqs.has(faq.id)}
                    <ChevronUp size={16} />
                  {:else}
                    <ChevronDown size={16} />
                  {/if}
                </div>
                <div class="faq-a bangla">{faq.answer}</div>
              </div>
            {/each}
          {:else}
            <p class="empty-text bangla">এখনো কোনো প্রশ্নোত্তর যোগ করা হয়নি।</p>
          {/if}
        </div>
      {/if}
    {/if}
  </main>
</div>

<style>
  .cause-detail-page {
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    background: #F6F4EE;
    color: #16231F;
  }
  .bangla { font-family: 'Hind Siliguri', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }

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
    margin-bottom: 12px;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .back-btn:hover { color: #1F5D50; }

  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }

  .detail-hero {
    position: relative;
    border-radius: 30px 46px 30px 30px;
    overflow: hidden;
  }
  .detail-hero .art {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
  }
  .detail-hero .overlay {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 22px;
    background: linear-gradient(to top, rgba(10,16,13,0.85) 10%, rgba(10,16,13,0.1) 65%, transparent 100%);
  }
  .detail-hero .title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 22px;
    font-weight: 800;
    color: white;
    line-height: 1.25;
  }
  .detail-hero .sub {
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 12.5px;
    color: rgba(255,255,255,0.85);
    margin-top: 6px;
  }

  .tab-bar {
    display: flex;
    gap: 4px;
    margin-top: 16px;
    background: #E4EDE9;
    border-radius: 16px;
    padding: 4px;
  }
  .tab-btn {
    flex: 1;
    background: none;
    border: none;
    padding: 10px 8px;
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 12.5px;
    font-weight: 600;
    color: #5B675F;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .tab-btn.active {
    background: white;
    color: #153F36;
    box-shadow: 0 1px 3px rgba(21,63,54,0.12);
  }

  .tab-panel { margin-top: 16px; animation: fadein 0.2s ease; }
  @keyframes fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

  .cause-story {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 16px;
    padding: 20px;
  }
  .story-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: #153F36;
  }
  .story-text {
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 13.5px;
    line-height: 1.75;
    margin-top: 10px;
  }

  .proj-under-cause {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 14px;
    padding: 14px 16px;
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .proj-under-cause:first-child { margin-top: 0; }
  .proj-thumb {
    width: 52px;
    height: 52px;
    border-radius: 10px;
    flex-shrink: 0;
    background-size: cover;
    background-position: center;
  }
  .proj-info { flex: 1; min-width: 0; }
  .proj-org { font-size: 11px; color: #5B675F; }
  .proj-title { font-size: 13.5px; font-weight: 700; margin-top: 2px; }
  .proj-progress { height: 5px; background: #E4EDE9; border-radius: 4px; margin-top: 6px; overflow: hidden; }
  .proj-progress-fill { height: 100%; background: #E9A23B; }
  .proj-meta { font-size: 10px; color: #5B675F; margin-top: 3px; }
  .proj-donate-btn {
    background: #1F5D50;
    color: white;
    font-size: 12px;
    font-weight: 600;
    padding: 7px 14px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .report-card {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 16px;
    padding: 18px 20px;
  }
  .report-summary {
    display: flex;
    gap: 12px;
    margin-bottom: 14px;
  }
  .report-stat {
    flex: 1;
    background: #F6F4EE;
    border-radius: 10px;
    padding: 12px;
    text-align: center;
  }
  .report-stat .num { font-family: 'DM Mono', monospace; font-size: 16px; font-weight: 700; color: #153F36; }
  .report-stat .lbl { font-size: 10.5px; color: #5B675F; margin-top: 2px; }
  .expense-item {
    display: flex;
    gap: 10px;
    padding: 10px 0;
    border-top: 1px solid #E4EDE9;
  }
  .expense-item:first-of-type { border-top: none; padding-top: 0; }
  .expense-photo { width: 44px; height: 44px; border-radius: 8px; background: #E4EDE9; flex-shrink: 0; }
  .expense-desc { font-size: 12.5px; font-weight: 600; }
  .expense-cat { font-size: 10.5px; color: #5B675F; margin-top: 1px; }
  .expense-amount { font-family: 'DM Mono', monospace; font-size: 12.5px; font-weight: 700; color: #B8503F; margin-left: auto; align-self: center; }

  .faq-item {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 12px;
    padding: 14px 16px;
    margin-top: 8px;
    cursor: pointer;
  }
  .faq-item:first-child { margin-top: 0; }
  .faq-q {
    font-size: 13px;
    font-weight: 700;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .faq-a {
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 12.5px;
    color: #5B675F;
    line-height: 1.6;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.2s ease, margin-top 0.2s ease;
  }
  .faq-item.open .faq-a { margin-top: 8px; max-height: 200px; }

  .empty-text { text-align: center; padding: 2rem; color: #5B675F; }
</style>