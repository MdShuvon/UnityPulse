<!-- src/routes/donate/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { Loader2, Heart, DollarSign, Calendar, Users, HeartHandshake } from "lucide-svelte";

  let isLoading = $state(true);
  let projects = $state<any[]>([]);
  let error = $state("");

  function formatAmount(amount: number): string {
    if (amount >= 1000) {
      return (amount / 1000).toFixed(1).replace(/\.0$/, "") + "K ৳";
    }
    return amount + " ৳";
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("bn-BD", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function progressPercent(collected: number, goal: number): number {
    if (!goal) return 0;
    return Math.min(100, Math.round((collected / goal) * 100));
  }

  async function fetchProjects() {
    try {
      const res = await fetch("http://localhost:3001/donations/projects", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        projects = data.data || data;
      } else {
        error = "ডোনেশন প্রজেক্ট লোড করতে সমস্যা হয়েছে";
      }
    } catch (err) {
      error = "ডোনেশন প্রজেক্ট লোড করতে সমস্যা হয়েছে";
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchProjects();
  });
</script>

<div class="donate-page">
  <main class="main-content">
    <div class="page-hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <HeartHandshake size={36} class="hero-icon" />
        <h1 class="hero-title">সহায়তা করুন</h1>
        <p class="hero-sub bangla">আপনার প্রতিটি অবদান কারো জীবনে পরিবর্তন আনে</p>
      </div>
    </div>

    {#if isLoading}
      <div class="loading-state">
        <Loader2 size={48} class="spin-anim" />
        <p>লোড হচ্ছে...</p>
      </div>
    {:else if error}
      <div class="loading-state"><p>{error}</p></div>
    {:else if projects.length > 0}
      {#each projects as project}
        <div class="project-card">
          <div class="project-top">
            <div>
              <h2 class="project-title">{project.title}</h2>
              <p class="project-org bangla">
                {project.org?.name || "UnityPulse Foundation"}
              </p>
            </div>
            <span
              class="status-badge"
              class:completed={project.status === "completed"}
            >
              {project.status === "completed" ? "সম্পন্ন" : "চলমান"}
            </span>
          </div>

          <p class="project-desc bangla">
            {project.description?.length > 120
              ? project.description.slice(0, 120) + "..."
              : project.description}
          </p>

          <div class="progress-section">
            <div class="progress-bar">
              <div
                class="progress-fill"
                style={`width: ${progressPercent(project.collectedAmount, project.goalAmount)}%`}
              ></div>
            </div>
            <div class="progress-info">
              <span class="collected mono"
                >{formatAmount(project.collectedAmount)}</span
              >
              <span class="goal mono">{formatAmount(project.goalAmount)}</span>
            </div>
          </div>

          <div class="project-tags">
            <span class="tag"
              ><Users size={12} />
              {project.donations?.length || 0} জন দাতা</span
            >
            {#if project.deadline}
              <span class="tag"
                ><Calendar size={12} /> {formatDate(project.deadline)}</span
              >
            {/if}
          </div>

          <button
            class="btn btn-primary donate-btn"
            onclick={() => (window.location.href = `/donate/${project.id}`)}
          >
            <DollarSign size={16} /> ডোনেট করুন
          </button>
        </div>
      {/each}
    {:else}
      <div class="empty-state">
        <div class="empty-icon">💚</div>
        <h3 class="empty-title">কোনো প্রজেক্ট নেই</h3>
        <p class="empty-body bangla">নতুন ডোনেশন প্রজেক্ট শীঘ্রই আসছে।</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .page-hero {
    position: relative;
    border-radius: 30px 46px 30px 30px;
    overflow: hidden;
    min-height: 30vh;
    display: flex;
    align-items: flex-end;
    margin-bottom: 20px;
  }
  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(10,16,13,0.75) 0%, rgba(10,16,13,0.15) 100%);
  }
  .hero-content {
    position: relative;
    z-index: 1;
    padding: 28px;
  }
  /* .hero-icon { color: #E9A23B; margin-bottom: 8px; } */
  .hero-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 32px;
    font-weight: 800;
    color: white;
  }
  .hero-sub {
    font-size: 14px;
    color: rgba(255,255,255,0.85);
    margin-top: 6px;
    font-family: 'Hind Siliguri', sans-serif;
  }
  /* .hero-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    padding: 8px 16px;
    background: #E9A23B;
    color: #4A2E08;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    font-family: 'Hind Siliguri', sans-serif;
  } */
  .donate-page .page-hero { background: linear-gradient(135deg, #B8503F, #153F36); }
  .donate-page {
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
  /* .donate-header {
    text-align: center;
    padding: 6px 0 4px;
  }
  .header-icon {
    color: #b8503f;
    margin-bottom: 0.25rem;
  }
  .donate-title {
    font-family: "Baloo Da 2", sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #153f36;
  }
  .donate-sub {
    font-size: 13px;
    color: #5b675f;
    margin-top: 4px;
  } */

  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  .loading-state {
    text-align: center;
    padding: 3rem;
    color: #5b675f;
  }

  .project-card {
    background: white;
    border: 1px solid #e4ede9;
    border-radius: 16px;
    padding: 18px;
    margin-top: 14px;
  }
  .project-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .project-title {
    font-family: "Baloo Da 2", sans-serif;
    font-size: 17px;
    font-weight: 700;
    color: #153f36;
  }
  .project-org {
    font-size: 12.5px;
    color: #5b675f;
    margin-top: 2px;
  }
  .status-badge {
    font-size: 11px;
    font-weight: 600;
    background: #fbebd0;
    color: #8a5a17;
    padding: 3px 10px;
    border-radius: 20px;
    flex-shrink: 0;
  }
  .status-badge.completed {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .project-desc {
    font-size: 13.5px;
    color: #16231f;
    margin-top: 10px;
    line-height: 1.6;
  }

  .progress-section {
    margin-top: 14px;
  }
  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e4ede9;
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #1f5d50, #2e7a69);
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  .progress-info {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    font-size: 12px;
    color: #5b675f;
  }
  .collected {
    font-weight: 600;
    color: #1f5d50;
  }
  .goal {
    color: #8b9790;
  }

  .project-tags {
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
    background: #e4ede9;
    color: #153f36;
    padding: 4px 10px;
    border-radius: 20px;
  }

  .donate-btn {
    width: 100%;
    margin-top: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .btn {
    font-family: "DM Sans", sans-serif;
    font-size: 14px;
    font-weight: 600;
    padding: 10px 24px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
  }
  .btn-primary {
    background: #1f5d50;
    color: white;
  }
  .btn-primary:hover {
    background: #153f36;
  }

  .empty-state {
    text-align: center;
    padding: 48px 20px;
    background: white;
    border: 1px dashed #e4ede9;
    border-radius: 16px;
    margin-top: 16px;
  }
  .empty-icon {
    font-size: 32px;
    margin-bottom: 10px;
  }
  .empty-title {
    font-family: "Baloo Da 2", sans-serif;
    font-size: 17px;
    font-weight: 700;
    color: #153f36;
  }
  .empty-body {
    font-size: 13.5px;
    color: #5b675f;
    margin-top: 6px;
  }
</style>
