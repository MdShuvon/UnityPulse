<!-- src/routes/press/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    Loader2,
    User,
    Heart,
    MessageCircle,
    Share2,
    ArrowLeft,
    Newspaper,
  } from "lucide-svelte";

  let isLoading = $state(true);
  let posts = $state<any[]>([]);
  let error = $state("");
  let likedPosts = $state<Set<string>>(new Set());
  let showComments = $state<Record<string, boolean>>({});
  let comments = $state<Record<string, any[]>>({});
  let commentText = $state<Record<string, string>>({});

  function decodeHtml(html: string): string {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html;
    return textarea.value;
  }

  function getInitials(name: string): string {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?"
    );
  }

  function timeAgo(dateString: string): string {
    const diff = Math.floor(
      (Date.now() - new Date(dateString).getTime()) / 60000,
    );
    if (diff < 1) return "এইমাত্র";
    if (diff < 60) return `${diff} মিনিট আগে`;
    if (diff < 1440) return `${Math.floor(diff / 60)} ঘণ্টা আগে`;
    return `${Math.floor(diff / 1440)} দিন আগে`;
  }

  async function fetchPosts() {
    try {
      const res = await fetch("http://localhost:3001/posts?limit=20&page=1", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        posts = data.data || [];
        const savedLiked = localStorage.getItem("likedPosts");
        if (savedLiked) likedPosts = new Set(JSON.parse(savedLiked));
      } else {
        error = "পোস্ট লোড করতে সমস্যা হয়েছে";
      }
    } catch (err) {
      error = "পোস্ট লোড করতে সমস্যা হয়েছে";
    } finally {
      isLoading = false;
    }
  }

  async function toggleLike(postId: string) {
    try {
      const res = await fetch(`http://localhost:3001/posts/${postId}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const newLiked = new Set(likedPosts);
        if (data.liked) newLiked.add(postId);
        else newLiked.delete(postId);
        likedPosts = newLiked;
        localStorage.setItem("likedPosts", JSON.stringify([...newLiked]));
        posts = posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                _count: {
                  ...p._count,
                  likes: (p._count?.likes || 0) + (data.liked ? 1 : -1),
                },
              }
            : p,
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  function isPostLiked(postId: string): boolean {
    return likedPosts.has(postId);
  }

  async function fetchComments(postId: string) {
    try {
      const res = await fetch(
        `http://localhost:3001/posts/${postId}/comments?limit=20&page=1`,
        {
          credentials: "include",
        },
      );
      if (res.ok) {
        const data = await res.json();
        comments[postId] = data.data;
        comments = { ...comments };
      }
    } catch (err) {
      console.error(err);
    }
  }

  function toggleComments(postId: string) {
    showComments[postId] = !showComments[postId];
    showComments = { ...showComments };
    if (showComments[postId]) fetchComments(postId);
  }

  async function submitComment(postId: string) {
    const content = commentText[postId]?.trim();
    if (!content) return;
    try {
      const res = await fetch(
        `http://localhost:3001/posts/${postId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content }),
        },
      );
      if (res.ok) {
        commentText[postId] = "";
        commentText = { ...commentText };
        fetchComments(postId);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function sharePost(postId: string) {
    const shareUrl = `${window.location.origin}/press#post-${postId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("লিংক কপি করা হয়েছে!");
    } catch {
      prompt("লিংক কপি করুন:", shareUrl);
    }
  }

  onMount(() => {
    fetchPosts();
  });
</script>

<div class="press-page">
  <main class="main-content">
    <div class="page-hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <Newspaper size={36} class="hero-icon" />
        <h1 class="hero-title">কমিউনিটি প্রেস</h1>
        <p class="hero-sub bangla">সদস্যদের গল্প, সংগঠনের আপডেট ও কমিউনিটির কণ্ঠস্বর</p>
      </div>
    </div>

    {#if isLoading}
      <div class="loading-state">
        <Loader2 size={48} class="spin-anim" />
        <p>লোড হচ্ছে...</p>
      </div>
    {:else if error}
      <div class="loading-state"><p>{error}</p></div>
    {:else if posts.length > 0}
      {#each posts as post}
        <div class="post-card" id={`post-${post.id}`}>
          <div class="post-head">
            <div class="mini-avatar">{getInitials(post.user?.name)}</div>
            <div class="post-meta">
              <span class="post-name">{post.user?.name || "Unknown"}</span>
              <span class="post-time mono">{timeAgo(post.createdAt)}</span>
            </div>
          </div>

          {#if post.content}
            <p class="post-body bangla">{decodeHtml(post.content)}</p>
          {/if}

          {#if post.photos?.length > 0}
            <div
              class="post-photos-grid"
              class:single-photo={post.photos.length === 1}
            >
              {#each post.photos as photo}
                <img
                  src={photo}
                  alt="post"
                  class="post-photo-img"
                  width="300"
                  height="300"
                  loading="lazy"
                />
              {/each}
            </div>
          {/if}

          <div class="post-stats">
            <span class="mono">❤ {post._count?.likes || 0} likes</span>
            <span class="mono">{post._count?.comments || 0} comments</span>
          </div>

          <div class="post-actions">
            <button
              class="post-action"
              class:liked={isPostLiked(post.id)}
              onclick={() => toggleLike(post.id)}
            >
              <Heart
                size={16}
                fill={isPostLiked(post.id) ? "#B8503F" : "none"}
              /> Like
            </button>
            <button class="post-action" onclick={() => toggleComments(post.id)}>
              <MessageCircle size={16} /> Comment ({post._count?.comments || 0})
            </button>
            <button class="post-action" onclick={() => sharePost(post.id)}>
              <Share2 size={16} /> Share
            </button>
          </div>

          {#if showComments[post.id]}
            <div class="comments-section">
              <div class="comment-input-row">
                <div class="mini-avatar-sm">{getInitials("User")}</div>
                <textarea
                  class="comment-textarea bangla"
                  placeholder="কমেন্ট লিখুন..."
                  bind:value={commentText[post.id]}
                  rows="1"
                ></textarea>
                <button
                  class="comment-send-btn"
                  onclick={() => submitComment(post.id)}>➤</button
                >
              </div>
              {#if comments[post.id]?.length > 0}
                {#each comments[post.id] as comment}
                  <div class="comment-row">
                    <div class="mini-avatar-sm">
                      {getInitials(comment.user?.name || "?")}
                    </div>
                    <div class="comment-bubble">
                      <span class="comment-name">{comment.user?.name}</span>
                      <p class="comment-text bangla">
                        {decodeHtml(comment.content)}
                      </p>
                    </div>
                  </div>
                {/each}
              {:else}
                <p class="no-comments bangla">কোনো কমেন্ট নেই।</p>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    {:else}
      <div class="empty-state">
        <div class="empty-icon">📰</div>
        <h3 class="empty-title">কোনো পোস্ট নেই</h3>
        <p class="empty-body bangla">প্রথম পোস্ট করার জন্য অপেক্ষা করুন।</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .press-page {
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
  /* .press-header {
    text-align: center;
    padding: 6px 0 4px;
  }
  .press-title {
    font-family: "Baloo Da 2", sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #153f36;
  }
  .press-sub {
    font-size: 13px;
    color: #5b675f;
    margin-top: 4px;
  } */
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
.press-page .page-hero { background: linear-gradient(135deg, #1F5D50, #153F36); }
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

  .post-card {
    background: white;
    border: 1px solid #e4ede9;
    border-radius: 16px;
    padding: 16px;
    margin-top: 14px;
  }
  .post-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .mini-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #1f5d50;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Baloo Da 2", sans-serif;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .post-meta {
    flex: 1;
  }
  .post-name {
    font-size: 14px;
    font-weight: 700;
    display: block;
  }
  .post-time {
    font-size: 12px;
    color: #5b675f;
  }

  .post-body {
    font-size: 14.5px;
    line-height: 1.65;
    margin: 12px 0;
  }
  .post-photos-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin: 12px 0;
  }
  .post-photos-grid.single-photo {
    grid-template-columns: 1fr;
  }
  .post-photo-img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 10px;
    object-fit: cover;
  }
  .post-stats {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #5b675f;
    padding: 10px 2px;
    border-bottom: 1px solid #e4ede9;
  }
  .post-actions {
    display: flex;
    padding-top: 6px;
  }
  .post-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 9px 0;
    font-size: 13px;
    font-weight: 500;
    color: #5b675f;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 8px;
  }
  .post-action:hover {
    background: #f6f4ee;
  }
  .post-action.liked {
    color: #b8503f;
  }

  .comments-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e4ede9;
  }
  .comment-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .mini-avatar-sm {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #1f5d50;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Baloo Da 2", sans-serif;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .comment-textarea {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #e4ede9;
    border-radius: 12px;
    font-size: 13px;
    outline: none;
    font-family: "Hind Siliguri", sans-serif;
    resize: none;
    min-height: 36px;
  }
  .comment-send-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #1f5d50;
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .comment-row {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  .comment-bubble {
    flex: 1;
    background: #f6f4ee;
    border-radius: 14px;
    padding: 9px 14px;
  }
  .comment-name {
    font-size: 12.5px;
    font-weight: 700;
    display: block;
  }
  .comment-text {
    font-size: 13.5px;
    margin-top: 2px;
  }
  .no-comments {
    text-align: center;
    font-size: 12px;
    color: #8b9790;
    padding: 12px;
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
