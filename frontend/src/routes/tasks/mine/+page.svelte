<!-- src/routes/tasks/mine/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    Loader2,
    ArrowLeft,
    Clock,
    CheckCircle2,
    XCircle,
    Camera,
  } from "lucide-svelte";

  let isLoading = $state(true);
  let submissions = $state<any[]>([]);
  let error = $state("");

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("bn-BD", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function statusLabel(status: string): string {
    if (status === "PENDING") return "পর্যালোচনার অপেক্ষায়";
    if (status === "APPROVED") return "অনুমোদিত";
    if (status === "REJECTED") return "প্রত্যাখ্যাত";
    return status;
  }

  async function fetchMySubmissions() {
    try {
      const res = await fetch("http://localhost:3001/tasks/mine", {
        credentials: "include",
      });
      if (res.ok) {
        submissions = await res.json();
      } else if (res.status === 401) {
        goto("/login");
      } else {
        error = "তথ্য লোড করতে সমস্যা হয়েছে";
      }
    } catch (err) {
      error = "তথ্য লোড করতে সমস্যা হয়েছে";
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchMySubmissions();
  });
</script>

<div class="my-tasks-page">
  <main class="main-content">
    <button class="back-btn" onclick={() => goto("/tasks")}>
      <ArrowLeft size={16} /> Tasks পেজে ফিরে যান
    </button>

    <div class="page-header">
      <h1 class="page-title">আমার কাজ</h1>
      <p class="page-sub bangla">আপনার জমা দেওয়া কাজের অবস্থা</p>
    </div>

    {#if isLoading}
      <div class="loading-state">
        <Loader2 size={48} class="spin-anim" />
        <p>লোড হচ্ছে...</p>
      </div>
    {:else if error}
      <div class="loading-state"><p>{error}</p></div>
    {:else if submissions.length > 0}
      {#each submissions as submission}
        <div class="submission-card">
          <div class="submission-top">
            <div>
              <h2 class="submission-title">{submission.task.title}</h2>
              <p class="submission-date mono">
                {formatDate(submission.submittedAt)}
              </p>
            </div>
            <span
              class="status-badge"
              class:approved={submission.status === "APPROVED"}
              class:rejected={submission.status === "REJECTED"}
            >
              {#if submission.status === "APPROVED"}
                <CheckCircle2 size={12} />
              {:else if submission.status === "REJECTED"}
                <XCircle size={12} />
              {:else}
                <Clock size={12} />
              {/if}
              {statusLabel(submission.status)}
            </span>
          </div>

          <div class="submission-info">
            <span class="info-item">
              <span class="info-label">পয়েন্ট</span>
              <span class="info-value mono">
                {submission.status === "APPROVED"
                  ? `+${submission.pointsAwarded || submission.task.pointValue}`
                  : `${submission.task.pointValue}`}
              </span>
            </span>
            <span class="info-item">
              <span class="info-label">Proof</span>
              <span class="info-value">
                <Camera size={12} />
                {submission.proofPhotos?.length || 0} টি ছবি
              </span>
            </span>
          </div>

          {#if submission.status === "REJECTED" && submission.reviewNote}
            <div class="rejection-note bangla">
              <strong>নোট:</strong>
              {submission.reviewNote}
            </div>
          {/if}

          <button
            class="btn btn-outline"
            onclick={() => goto(`/tasks/${submission.task.id}`)}
          >
            বিস্তারিত দেখুন
          </button>
        </div>
      {/each}
    {:else}
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3 class="empty-title">কোনো জমা নেই</h3>
        <p class="empty-body bangla">আপনি এখনো কোনো কাজ জমা দেননি।</p>
        <button class="btn btn-primary" onclick={() => goto("/tasks")}
          >কাজ দেখুন</button
        >
      </div>
    {/if}
  </main>
</div>

<style>
  .my-tasks-page {
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
  .back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: #5b675f;
    font-size: 14px;
    cursor: pointer;
    padding: 8px 0;
    margin-bottom: 12px;
    font-family: "Hind Siliguri", sans-serif;
  }
  .back-btn:hover {
    color: #1f5d50;
  }

  .page-header {
    text-align: center;
    padding: 6px 0 16px;
  }
  .page-title {
    font-family: "Baloo Da 2", sans-serif;
    font-size: 24px;
    font-weight: 800;
    color: #153f36;
  }
  .page-sub {
    font-size: 13px;
    color: #5b675f;
    margin-top: 4px;
  }

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

  .submission-card {
    background: white;
    border: 1px solid #e4ede9;
    border-radius: 16px;
    padding: 18px;
    margin-top: 14px;
  }
  .submission-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .submission-title {
    font-family: "Baloo Da 2", sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: #153f36;
  }
  .submission-date {
    font-size: 11.5px;
    color: #8b9790;
    margin-top: 2px;
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    font-weight: 600;
    background: #fff3e0;
    color: #e65100;
    padding: 4px 10px;
    border-radius: 12px;
    flex-shrink: 0;
  }
  .status-badge.approved {
    background: #e8f5e9;
    color: #2e7d32;
  }
  .status-badge.rejected {
    background: #fdf0ed;
    color: #b8503f;
  }

  .submission-info {
    display: flex;
    gap: 16px;
    margin-top: 12px;
    padding: 10px;
    background: #f6f4ee;
    border-radius: 8px;
  }
  .info-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .info-label {
    font-size: 10.5px;
    color: #8b9790;
  }
  .info-value {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 13px;
    font-weight: 600;
    color: #16231f;
  }

  .rejection-note {
    background: #fdf0ed;
    border-radius: 8px;
    padding: 10px;
    margin-top: 10px;
    font-size: 12.5px;
    color: #b8503f;
  }

  .btn {
    font-family: "DM Sans", sans-serif;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    margin-top: 12px;
  }
  .btn-primary {
    background: #1f5d50;
    color: white;
  }
  .btn-primary:hover {
    background: #153f36;
  }
  .btn-outline {
    background: white;
    color: #1f5d50;
    border: 1px solid #1f5d50;
  }
  .btn-outline:hover {
    background: #f6f4ee;
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
    margin-bottom: 12px;
  }
</style>
