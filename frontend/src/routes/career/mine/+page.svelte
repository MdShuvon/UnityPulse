<!-- src/routes/career/mine/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    Loader2,
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText,
    Briefcase,
    XCircle,
    UserRound,
  } from "lucide-svelte";

  let isLoading = $state(true);
  let applications = $state<any[]>([]);
  let error = $state("");

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("bn-BD", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getStatusBadge(status: string): { label: string; class: string; icon: any } {
    switch (status) {
      case "SUBMITTED":
        return { label: "Under Review", class: "badge-review", icon: Clock };
      case "ACCEPTED":
        return { label: "Accepted", class: "badge-accepted", icon: CheckCircle2 };
      case "REJECTED":
        return { label: "Rejected", class: "badge-rejected", icon: XCircle };
      case "SHORTLISTED":
        return { label: "Shortlisted", class: "badge-shortlisted", icon: CheckCircle2 };
      case "SELECTED":
        return { label: "Selected", class: "badge-selected", icon: CheckCircle2 };
      default:
        return { label: status, class: "badge-review", icon: Clock };
    }
  }

  function getProgressSteps(status: string): number {
    switch (status) {
      case "SUBMITTED": return 1;
      case "ACCEPTED": return 3;
      case "REJECTED": return 3;
      default: return 1;
    }
  }

  async function fetchApplications() {
    try {
      const res = await fetch("http://localhost:3001/career/my-applications", {
        credentials: "include",
      });
      if (res.ok) {
        applications = await res.json();
      } else if (res.status === 401) {
        goto("/login");
        return;
      } else {
        error = "আবেদন লোড করতে সমস্যা হয়েছে";
      }
    } catch (err) {
      error = "আবেদন লোড করতে সমস্যা হয়েছে";
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchApplications();
  });
</script>

<div class="mine-page">
  <main class="main-content">
    <button class="back-btn" onclick={() => goto("/career")}>
      <ArrowLeft size={16} /> Career-এ ফিরে যান
    </button>

    <div class="page-hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <FileText size={32} class="hero-icon" />
        <h1 class="hero-title">আমার আবেদনসমূহ</h1>
        <p class="hero-sub bangla">আপনার সব job application-এর status এক নজরে</p>
      </div>
    </div>

    {#if isLoading}
      <div class="loading-state">
        <Loader2 size={48} class="spin-anim" />
        <p>লোড হচ্ছে...</p>
      </div>
    {:else if error}
      <div class="loading-state"><p>{error}</p></div>
    {:else if applications.length > 0}
      {#each applications as app}
        {@const badge = getStatusBadge(app.status)}
        {@const steps = getProgressSteps(app.status)}
        {@const StatusIcon = badge.icon}

        <div class="app-card">
          <div class="app-top">
            <div class="app-info">
              <h2 class="app-title">{app.job?.title || "Unknown Job"}</h2>
              <p class="app-sub mono">Applied: {formatDate(app.createdAt)}</p>
            </div>
            <span class="badge {badge.class}">
              <StatusIcon size={12} /> {badge.label}
            </span>
          </div>

          <!-- Progress Tracker -->
          <div class="mini-track">
            <div class="mini-step done"></div>
            <div class="mini-step" class:done={steps >= 2}></div>
            <div class="mini-step" class:done={steps >= 3}></div>
          </div>
          <div class="track-labels">
            <span>Applied</span>
            <span>Review</span>
            <span>Decision</span>
          </div>

          <!-- Fee Status -->
          <div class="fee-status">
            {#if app.feeStatus === "free"}
              <span class="fee-badge free">
                <CheckCircle2 size={12} /> ফ্রি আবেদন
              </span>
            {:else if app.feeStatus === "PENDING"}
              <span class="fee-badge pending">
                <Clock size={12} /> Payment Pending
              </span>
            {:else}
              <span class="fee-badge paid">
                <CheckCircle2 size={12} /> Payment Verified
              </span>
            {/if}
          </div>

          {#if app.reviewNote}
            <p class="review-note bangla">
              <FileText size={12} /> {app.reviewNote}
            </p>
          {/if}
        </div>
      {/each}
    {:else}
      <div class="empty-state">
        <div class="empty-icon"><Briefcase size={40} /></div>
        <h3 class="empty-title">কোনো আবেদন নেই</h3>
        <p class="empty-body bangla">আপনি এখনো কোনো জবে আবেদন করেননি।</p>
        <button class="btn btn-primary" onclick={() => goto("/career")}>
          <UserRound size={14} /> জব দেখুন
        </button>
      </div>
    {/if}
  </main>
</div>

<style>
  .mine-page {
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

  .page-hero {
    position: relative;
    border-radius: 30px 46px 30px 30px;
    overflow: hidden;
    min-height: 25vh;
    background: linear-gradient(135deg, #2E7A69, #1F5D50);
    display: flex;
    align-items: flex-end;
    margin-bottom: 20px;
  }
  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(10,16,13,0.7) 0%, rgba(10,16,13,0.1) 100%);
  }
  .hero-content {
    position: relative;
    z-index: 1;
    padding: 24px;
  }
  .hero-icon { color: #E9A23B; margin-bottom: 6px; }
  .hero-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 28px;
    font-weight: 800;
    color: white;
  }
  .hero-sub {
    font-size: 13px;
    color: rgba(255,255,255,0.85);
    margin-top: 4px;
  }

  .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }

  .app-card {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 16px;
    padding: 16px 18px;
    margin-top: 12px;
  }
  .app-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }
  .app-info { flex: 1; }
  .app-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 15.5px;
    font-weight: 700;
    color: #153F36;
  }
  .app-sub { font-size: 12px; color: #5B675F; margin-top: 2px; }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10.5px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 20px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .badge-review { background: #FBEBD0; color: #8A5A17; }
  .badge-accepted { background: #EAF4EE; color: #1F6E45; }
  .badge-rejected { background: #F6E4E1; color: #B8503F; }
  .badge-shortlisted { background: #EAF4EE; color: #1F6E45; }
  .badge-selected { background: #1F5D50; color: white; }

  .mini-track {
    display: flex;
    gap: 4px;
    margin-top: 12px;
  }
  .mini-step {
    flex: 1;
    height: 4px;
    border-radius: 3px;
    background: #E4EDE9;
  }
  .mini-step.done { background: #1F5D50; }
  .track-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
    font-size: 9px;
    color: #8B9790;
  }

  .fee-status { margin-top: 12px; }
  .fee-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 600;
    padding: 5px 12px;
    border-radius: 20px;
  }
  .fee-badge.free { background: #EAF4EE; color: #1F6E45; }
  .fee-badge.pending { background: #FBEBD0; color: #8A5A17; }
  .fee-badge.paid { background: #EAF4EE; color: #1F6E45; }

  .review-note {
    font-size: 12.5px;
    color: #5B675F;
    margin-top: 10px;
    background: #F6F4EE;
    padding: 8px 12px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .empty-state {
    text-align: center;
    padding: 48px 20px;
    background: white;
    border: 1px dashed #E4EDE9;
    border-radius: 16px;
    margin-top: 16px;
  }
  .empty-icon { margin-bottom: 10px; color: #8B9790; }
  .empty-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 17px;
    font-weight: 700;
    color: #153F36;
  }
  .empty-body { font-size: 13.5px; color: #5B675F; margin-top: 6px; }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13.5px;
    font-weight: 500;
    padding: 9px 20px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    margin-top: 12px;
  }
  .btn-primary { background: #1F5D50; color: white; }
  .btn-primary:hover { background: #153F36; }

  @media (max-width: 768px) {
    .main-content { max-width: 100%; padding: 1rem; }
    .page-hero { min-height: 20vh; }
    .hero-title { font-size: 22px; }
  }
</style>