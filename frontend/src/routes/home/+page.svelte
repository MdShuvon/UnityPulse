<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    Loader2,
    Leaf,
    CheckCircle2,
    Trophy,
    Heart,
    ArrowRight,
  } from "lucide-svelte";

  let isLoading = $state(true);
  let user = $state<any>(null);
  let stats = $state<any>(null);
  let topTasks = $state<any[]>([]);
  let careerSnippet = $state<any[]>([]);
  let featuredCause = $state<any>(null);
  let error = $state("");

  async function fetchHome() {
    try {
      const [userRes, dashboardRes, highlightsRes, causeRes] =
        await Promise.all([
          fetch("http://localhost:3001/auth/me", { credentials: "include" }),
          fetch("http://localhost:3001/home", { credentials: "include" }),
          fetch("http://localhost:3001/home/highlights", {
            credentials: "include",
          }),
          fetch("http://localhost:3001/causes/featured", {
            credentials: "include",
          }),
        ]);

      if (userRes.ok) user = await userRes.json();
      if (dashboardRes.ok) stats = await dashboardRes.json();
      if (highlightsRes.ok) {
        const data = await highlightsRes.json();
        topTasks = data.topTasks || [];
        careerSnippet = data.careerSnippet || [];
      }
      if (causeRes.ok) {
        const causeData = await causeRes.json();
        // Array হলে array, object হলে array-তে convert করুন
        featuredCause = Array.isArray(causeData) ? causeData : [causeData];
        console.log("Featured Cause:", featuredCause);
      }
    } catch (err) {
      console.error(err);
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchHome();
  });
</script>

<div class="home-page">
  <main class="main-content">
    <!-- Featured Cause Grid -->
    <section class="cause-section">
      <div class="section-label">সক্রিয় Cause · এই মুহূর্তে চলছে</div>

      {#if isLoading}
        <div class="cause-skeleton">
          <div class="skeleton-big"></div>
          <div class="skeleton-mini-col">
            <div class="skeleton-mini"></div>
            <div class="skeleton-mini"></div>
            <div class="skeleton-mini"></div>
            <div class="skeleton-mini"></div>
          </div>
        </div>
      {:else if featuredCause && featuredCause.length > 0}
        <div class="cause-grid">
          <!-- Big Card -->
          {#if featuredCause[0]}
            <div
              class="cause-big"
              onclick={() => goto(`/causes/${featuredCause[0].id}`)}
              role="button"
              tabindex="0"
              onkeydown={(e) =>
                e.key === "Enter" && goto(`/causes/${featuredCause[0].id}`)}
            >
              {#if featuredCause[0].coverImage}
                <img
                  src={featuredCause[0].coverImage}
                  alt={featuredCause[0].title}
                  class="big-img"
                />
              {:else}
                <div class="big-fallback"></div>
              {/if}
              <div class="overlay">
                <span class="prio-badge"
                  ><span class="prio-dot"></span>Featured</span
                >
                <div class="title">{featuredCause[0].title}</div>
                <div class="meta-line bangla">
                  {featuredCause[0].story?.slice(0, 80)}...
                </div>
                <div class="meta-date mono">
                  {new Date(featuredCause[0].createdAt).toLocaleDateString(
                    "bn-BD",
                  )}
                </div>
                <button
                  class="cta"
                  onclick={(e) => {
                    e.stopPropagation();
                    goto(`/causes/${featuredCause[0].id}`);
                  }}>বিস্তারিত দেখুন</button
                >
              </div>
            </div>
          {/if}

          <!-- Mini Cards -->
          <div class="cause-mini-col">
            {#each featuredCause.slice(1, 5) as cause}
              <div
                class="cause-mini"
                onclick={() => goto(`/causes/${cause.id}`)}
                role="button"
                tabindex="0"
                onkeydown={(e) =>
                  e.key === "Enter" && goto(`/causes/${cause.id}`)}
              >
                <div class="thumb">
                  {#if cause.coverImage}
                    <img
                      src={cause.coverImage}
                      alt={cause.title}
                      class="thumb-img"
                    />
                  {:else}
                    <div class="thumb-fallback"></div>
                  {/if}
                </div>
                <div class="info">
                  <div class="cat">{cause.projects?.length || 0} Projects</div>
                  <div class="title">{cause.title}</div>
                  <div class="date mono">
                    {new Date(cause.createdAt).toLocaleDateString("bn-BD")}
                  </div>
                </div>
                <div class="go">›</div>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="empty-cause">
          <div class="empty-icon">🌿</div>
          <p class="bangla">কোনো active Cause নেই।</p>
          <p class="empty-hint bangla">নতুন Cause শীঘ্রই আসছে।</p>
          <a
            href="/admin/causes/create"
            class="btn btn-primary create-cause-btn">Cause তৈরি করুন</a
          >
        </div>
      {/if}
    </section>

    <!-- Stats -->
    {#if stats}
      <section class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{stats.verifiedMembers || 0}</span>
          <span class="stat-label bangla">সদস্য</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{stats.activeOrgs || 0}</span>
          <span class="stat-label bangla">সংগঠন</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{stats.totalDonations || 0}</span>
          <span class="stat-label bangla">ডোনেশন</span>
        </div>
      </section>
    {/if}

    <!-- Top Tasks -->
    {#if topTasks.length > 0}
      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title">উপলব্ধ কাজ</h2>
          <a href="/tasks" class="see-all">সব দেখুন →</a>
        </div>
        <div class="tasks-list">
          {#each topTasks as task}
            <div
              class="task-item"
              onclick={() => goto(`/tasks/${task.id}`)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === "Enter" && goto(`/tasks/${task.id}`)}
            >
              <div class="task-info">
                <span class="task-title">{task.title}</span>
                <span class="task-org">{task.org?.name || "সবার জন্য"}</span>
              </div>
              <span class="task-points">+{task.pointValue} pts</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Career Snippet -->
    {#if careerSnippet.length > 0}
      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title">ক্যারিয়ার সুযোগ</h2>
          <a href="/career" class="see-all">সব দেখুন →</a>
        </div>
        <div class="tasks-list">
          {#each careerSnippet as job}
            <div
              class="task-item"
              onclick={() => goto(`/career/${job.id}`)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === "Enter" && goto(`/career/${job.id}`)}
            >
              <div class="task-info">
                <span class="task-title">{job.title}</span>
                <span class="task-org">{job.department || "UnityPulse"}</span>
              </div>
              <span class="task-points"
                >{job.applicationFee === 0
                  ? "ফ্রি"
                  : `৳${job.applicationFee}`}</span
              >
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- CTA -->
    <section class="cta-section">
      <h2 class="cta-title">আজই শুরু করুন</h2>
      <p class="cta-text bangla">
        UnityPulse-এ যোগ দিন এবং আপনার কমিউনিটিতে পরিবর্তন আনুন।
      </p>
      <div class="cta-actions">
        {#if user}
          <a href="/profile" class="btn btn-primary">প্রোফাইল দেখুন</a>
        {:else}
          <a href="/register" class="btn btn-primary">ফ্রি রেজিস্টার করুন</a>
          <a href="/login" class="btn btn-secondary">লগইন করুন</a>
        {/if}
      </div>
    </section>
  </main>
</div>

<style>
  .cause-skeleton {
    display: flex;
    gap: 14px;
    align-items: stretch;
  }
  .skeleton-big {
    flex: 0 0 56%;
    border-radius: 30px 46px 30px 30px;
    background: linear-gradient(90deg, #e4ede9 25%, #f6f4ee 50%, #e4ede9 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  .skeleton-mini-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .skeleton-mini {
    flex: 1;
    border-radius: 16px 26px 16px 16px;
    background: linear-gradient(90deg, #e4ede9 25%, #f6f4ee 50%, #e4ede9 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  .empty-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }
  .empty-hint {
    font-size: 12.5px;
    color: #8b9790;
    margin-top: 4px;
  }
  .create-cause-btn {
    margin-top: 16px;
    display: inline-flex;
  }

  .cause-section {
    margin-top: 1.5rem;
  }
  .section-label {
    font-size: 11px;
    letter-spacing: 0.06em;
    color: #5b675f;
    font-weight: 700;
    margin: 26px 2px 12px;
    font-family: "Hind Siliguri", sans-serif;
  }
  .cause-grid {
    display: flex;
    gap: 14px;
    align-items: stretch;
  }
  .cause-big {
    flex: 0 0 56%;
    position: relative;
    border-radius: 30px 46px 30px 30px;
    overflow: hidden;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    transition: transform 0.18s ease;
  }
  .cause-big:hover {
    transform: translateY(-2px);
  }
  .big-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .big-fallback {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #2e7a69, #153f36);
  }
  .cause-big .overlay {
    position: relative;
    z-index: 1;
    padding: 24px;
    background: linear-gradient(
      to top,
      rgba(10, 16, 13, 0.82) 5%,
      rgba(10, 16, 13, 0.15) 60%,
      transparent 100%
    );
  }
  .prio-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.94);
    color: #153f36;
    font-size: 11px;
    font-weight: 700;
    padding: 5px 12px 5px 8px;
    border-radius: 20px;
    margin-bottom: 14px;
  }
  .prio-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #b8503f;
  }
  .cause-big .title {
    font-family: "Baloo Da 2", sans-serif;
    font-size: 24px;
    font-weight: 800;
    color: white;
    line-height: 1.25;
  }
  .cause-big .meta-line {
    font-family: "Hind Siliguri", sans-serif;
    font-size: 12.5px;
    color: rgba(255, 255, 255, 0.82);
    margin-top: 8px;
  }
  .cause-big .meta-date {
    font-family: "DM Mono", monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.65);
    margin-top: 10px;
  }
  .cause-big .cta {
    margin-top: 16px;
    align-self: flex-start;
    background: #e9a23b;
    color: #4a2e08;
    font-size: 12.5px;
    font-weight: 700;
    padding: 9px 20px;
    border-radius: 20px;
    border: none;
    cursor: pointer;
  }
  .cause-mini-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cause-mini {
    background: white;
    border: 1px solid #e4ede9;
    border-radius: 16px 26px 16px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    flex: 1;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      transform 0.15s ease;
  }
  .cause-mini .thumb {
    width: 80px;
    height: 80px;
    border-radius: 12px;
    flex-shrink: 0;
    overflow: hidden;
  }
  .thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .thumb-fallback {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1f5d50, #153f36);
  }
  .cause-mini .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
  }
  .cause-mini .cat {
    font-size: 10px;
    font-weight: 700;
    margin-bottom: 0;
    color: #1f5d50;
  }
  .cause-mini .title {
    font-size: 13.5px;
    font-weight: 700;
    line-height: 1.3;
    color: #16231f;
  }
  .cause-mini .date {
    font-family: "DM Mono", monospace;
    font-size: 10px;
    color: #5b675f;
    margin-top: 0;
  }
  .cause-mini .go {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #e4ede9;
    color: #153f36;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  .empty-cause {
    background: white;
    border: 1px dashed #e4ede9;
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
    color: #5b675f;
  }

  @media (max-width: 680px) {
    .cause-grid {
      flex-direction: column;
    }
    .cause-big {
      flex: 0 0 auto;
      min-height: 260px;
    }
    .cause-mini-col {
      flex-direction: row;
      flex-wrap: wrap;
    }
    .cause-mini {
      flex: 0 0 calc(50% - 5px);
    }
  }
  .home-page {
    min-height: 100vh;
    font-family: "DM Sans", sans-serif;
    background: #f6f4ee;
    color: #16231f;
  }
  .bangla {
    font-family: "Hind Siliguri", sans-serif;
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

  /* Hero section removed — replaced by Cause Grid */

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 24px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-primary {
    background: #1f5d50;
    color: white;
  }
  .btn-primary:hover {
    background: #153f36;
  }
  .btn-secondary {
    background: white;
    color: #1f5d50;
    border: 1px solid #1f5d50;
  }
  .btn-secondary:hover {
    background: #f6f4ee;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 1.5rem;
  }
  .stat-card {
    background: white;
    border: 1px solid #e4ede9;
    border-radius: 12px;
    padding: 1rem;
    text-align: center;
  }
  .stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: #153f36;
  }
  .stat-label {
    font-size: 0.8125rem;
    color: #5b675f;
  }

  .section-block {
    margin-top: 2rem;
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  .section-title {
    font-family: "Baloo Da 2", sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #153f36;
  }
  .see-all {
    font-size: 0.875rem;
    color: #1f5d50;
    text-decoration: none;
  }
  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .task-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem;
    background: white;
    border: 1px solid #e4ede9;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .task-item:hover {
    border-color: #1f5d50;
  }
  .task-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .task-title {
    font-weight: 600;
    color: #16231f;
    font-size: 0.9375rem;
  }
  .task-org {
    font-size: 0.75rem;
    color: #8b9790;
  }
  .task-points {
    font-weight: 700;
    color: #1f5d50;
    font-size: 0.875rem;
  }

  .cta-section {
    text-align: center;
    margin-top: 2rem;
    padding: 2rem 1rem;
    background: white;
    border-radius: 16px;
    border: 1px solid #e4ede9;
  }
  .cta-title {
    font-family: "Baloo Da 2", sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #153f36;
  }
  .cta-text {
    font-size: 0.9375rem;
    color: #5b675f;
    margin-top: 0.5rem;
  }
  .cta-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 1.25rem;
    flex-wrap: wrap;
  }
</style>
