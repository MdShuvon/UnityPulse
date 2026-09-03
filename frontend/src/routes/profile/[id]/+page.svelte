<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { 
    Loader2, User, Leaf, MapPin, Briefcase, Calendar,
    Heart, MessageCircle, Share2
  } from 'lucide-svelte';

  let isLoading = $state(true);
  let profileUser = $state<any>(null);
  let posts = $state<any[]>([]);
  let error = $state('');
  let isFollowing = $state(false);
  let followersCount = $state(0);
  let followingCount = $state(0);
  let currentUserId = $state<string | null>(null);
  let likedPosts = $state<Set<string>>(new Set());

 const userId = $derived(($page as any)?.params?.id || '');

  function decodeHtml(html: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  }

  function getInitials(name: string): string {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  function formatTimestamp(dateString: string): string {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (diff < 1) return 'এইমাত্র';
    if (diff < 60) return `${diff} মিনিট আগে`;
    if (diff < 1440) return `${Math.floor(diff / 60)} ঘণ্টা আগে`;
    return `${Math.floor(diff / 1440)} দিন আগে`;
  }

  async function fetchPublicProfile() {
    try {
      // Check current user
      const meRes = await fetch('http://localhost:3001/auth/me', { credentials: 'include' });
      if (meRes.ok) {
        const meData = await meRes.json();
        currentUserId = meData.id;
      }

      // Fetch profile
      const profileRes = await fetch(`http://localhost:3001/profile/${userId}`, { credentials: 'include' });
      if (profileRes.ok) {
        profileUser = await profileRes.json();
      } else {
        error = 'প্রোফাইল পাওয়া যায়নি';
        return;
      }

      // Fetch posts
      const postsRes = await fetch(`http://localhost:3001/profile/${userId}/posts?limit=20&page=1`, { credentials: 'include' });
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        posts = postsData.data || [];
      }

      // Fetch follow counts
      const followRes = await fetch(`http://localhost:3001/profile/${userId}/follow-counts`, { credentials: 'include' });
      if (followRes.ok) {
        const followData = await followRes.json();
        followersCount = followData.followers;
        followingCount = followData.following;
      }

      // Check if following
      if (currentUserId && currentUserId !== userId) {
        const isFollowingRes = await fetch(`http://localhost:3001/profile/${userId}/is-following`, { credentials: 'include' });
        if (isFollowingRes.ok) {
          const followData = await isFollowingRes.json();
          isFollowing = followData.isFollowing;
        }
      }

      // Load liked posts
      const savedLiked = localStorage.getItem('likedPosts');
      if (savedLiked) likedPosts = new Set(JSON.parse(savedLiked));

    } catch (err) {
      error = 'প্রোফাইল লোড করতে সমস্যা হয়েছে';
    } finally {
      isLoading = false;
    }
  }

  async function toggleFollow() {
    if (!currentUserId) { goto('/login'); return; }
    try {
      const res = await fetch(`http://localhost:3001/profile/${userId}/follow`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        isFollowing = data.following;
        followersCount += data.following ? 1 : -1;
      }
    } catch (err) { console.error(err); }
  }

  async function toggleLike(postId: string) {
    if (!currentUserId) { goto('/login'); return; }
    try {
      const res = await fetch(`http://localhost:3001/posts/${postId}/like`, {
        method: 'POST', credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const newLiked = new Set(likedPosts);
        if (data.liked) newLiked.add(postId); else newLiked.delete(postId);
        likedPosts = newLiked;
        localStorage.setItem('likedPosts', JSON.stringify([...newLiked]));
        posts = posts.map(p => p.id === postId ? { ...p, _count: { ...p._count, likes: (p._count?.likes || 0) + (data.liked ? 1 : -1) } } : p);
      }
    } catch (err) { console.error(err); }
  }

  function isPostLiked(postId: string): boolean { return likedPosts.has(postId); }

  async function sharePost(postId: string) {
    const url = `${window.location.origin}/press#post-${postId}`;
    try { await navigator.clipboard.writeText(url); alert('লিংক কপি করা হয়েছে!'); }
    catch { prompt('লিংক কপি করুন:', url); }
  }

  onMount(() => { fetchPublicProfile(); });
</script>

<div class="public-profile-page">
  <main class="main-content">
    {#if isLoading}
      <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>লোড হচ্ছে...</p></div>
    {:else if error}
      <div class="loading-state">
        <p>{error}</p>
        <button class="btn btn-primary" onclick={() => goto('/press')}>Press-এ ফিরে যান</button>
      </div>
    {:else if profileUser}
      <div class="profile-card">
        <div class="avatar-wrap">
          {#if profileUser.profilePhoto}
            <img src={profileUser.profilePhoto} alt={profileUser.name} class="profile-photo-img" />
          {:else}
            <div class="avatar-circle">{getInitials(profileUser.name)}</div>
          {/if}
        </div>
        <div class="profile-name-block">
          <h1 class="profile-name">{profileUser.name}</h1>
          <p class="profile-role bangla">
            {profileUser.role === 'SUPER_ADMIN' ? 'সুপার অ্যাডমিন' : profileUser.role === 'LOCAL_ADMIN' ? 'লোকাল অ্যাডমিন' : 'কমিউনিটি ভলান্টিয়ার'}
          </p>
          {#if profileUser.address}
            <p class="profile-loc">📍 {profileUser.address}</p>
          {/if}
          {#if profileUser.bio}
            <p class="profile-bio bangla">{profileUser.bio}</p>
          {/if}
        </div>
        
        <div class="follow-stats">
          <span><strong>{followersCount}</strong> অনুসারী</span>
          <span class="divider">·</span>
          <span><strong>{followingCount}</strong> অনুসরণ</span>
        </div>
        
        {#if currentUserId !== userId}
          <div class="profile-actions">
            <button class="btn btn-primary" onclick={toggleFollow}>
              {isFollowing ? '✓ অনুসরণ করছেন' : '+ অনুসরণ করুন'}
            </button>
          </div>
        {/if}
      </div>

      <div class="posts-section">
        <h2 class="section-title">পাবলিক পোস্ট</h2>
        
        {#if posts.length > 0}
          {#each posts as post}
            <div class="post-card">
              <div class="post-head">
                <div class="mini-avatar">
                  {#if profileUser.profilePhoto}
                    <img src={profileUser.profilePhoto} alt={profileUser.name} class="avatar-img" />
                  {:else}
                    {getInitials(profileUser.name)}
                  {/if}
                </div>
                <div class="post-meta">
                  <span class="post-name">{profileUser.name}</span>
                  <span class="post-time mono">{formatTimestamp(post.createdAt)}</span>
                </div>
              </div>
              
              {#if post.content}
                <p class="post-body bangla">{decodeHtml(post.content)}</p>
              {/if}
              
              {#if post.photos?.length > 0}
                <div class="post-photos-grid" class:single-photo={post.photos.length === 1}>
                  {#each post.photos as photo}
                    <img src={photo} alt="post" class="post-photo-img" loading="lazy" />
                  {/each}
                </div>
              {/if}
              
              <div class="post-stats">
                <span class="mono">❤ {post._count?.likes || 0} likes</span>
                <span class="mono">{post._count?.comments || 0} comments</span>
              </div>
              
              <div class="post-actions">
                <button class="post-action" class:liked={isPostLiked(post.id)} onclick={() => toggleLike(post.id)}>
                  <Heart size={16} fill={isPostLiked(post.id) ? '#B8503F' : 'none'} /> Like
                </button>
                <button class="post-action" onclick={() => goto('/press')}>
                  <MessageCircle size={16} /> Comment
                </button>
                <button class="post-action" onclick={() => sharePost(post.id)}>
                  <Share2 size={16} /> Share
                </button>
              </div>
            </div>
          {/each}
        {:else}
          <div class="empty-posts">
            <p class="bangla">এখনো কোনো পাবলিক পোস্ট নেই।</p>
          </div>
        {/if}
      </div>
    {/if}
  </main>

  <footer class="footer">
    <div class="footer-container">
      <span class="footer-brand">🌿 UnityPulse © 2026</span>
      <div class="footer-links">
        <a href="/about">About</a><span>|</span>
        <a href="/contact">Contact</a><span>|</span>
        <a href="/privacy">Privacy</a>
      </div>
    </div>
  </footer>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&family=Hind+Siliguri:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  .public-profile-page { min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #F6F4EE; color: #16231F; }
  .bangla { font-family: 'Hind Siliguri', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }
  
  /* .dashboard-header { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.5rem; background: #FFFFFF; border-bottom: 1px solid #E4EDE9; position: sticky; top: 0; z-index: 100; } */
  /* .header-left { display: flex; align-items: center; } */
  /* .brand { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; } */
  /* .brand-icon { color: #1F5D50; } */
  /* .brand-name { font-family: 'Baloo Da 2', sans-serif; font-weight: 800; font-size: 1.25rem; color: #16231F; }
  .header-nav { display: flex; align-items: center; gap: 1.25rem; }
  .nav-link { color: #5B675F; text-decoration: none; font-size: 0.875rem; font-weight: 500; padding: 0.375rem 0; border-bottom: 2px solid transparent; }
  .nav-link:hover { color: #1F5D50; border-bottom-color: #1F5D50; }
  .header-right { display: flex; align-items: center; }
  .profile-link { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: #E4EDE9; color: #5B675F; text-decoration: none; }
   */
  .main-content { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem; }
  /* .spin-anim { animation: spin 1s linear infinite; color: #1F5D50; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }
  
  .profile-card { background: white; border-radius: 16px; border: 1px solid #E4EDE9; padding: 28px 24px; }
  .avatar-wrap { width: 96px; height: 96px; margin: 0 auto 14px; }
  .avatar-circle { width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, #1F5D50, #2E7A69); display: flex; align-items: center; justify-content: center; color: white; font-family: 'Baloo Da 2', sans-serif; font-size: 28px; font-weight: 700; }
  .profile-photo-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
  .profile-name-block { text-align: center; }
  .profile-name { font-family: 'Baloo Da 2', sans-serif; font-size: 22px; font-weight: 700; }
  .profile-role { font-size: 13px; color: #5B675F; margin-top: 2px; }
  .profile-loc { font-size: 13px; color: #5B675F; margin-top: 6px; }
  .profile-bio { font-size: 14px; line-height: 1.6; margin: 14px auto 0; max-width: 440px; }
  
  .follow-stats { display: flex; justify-content: center; gap: 12px; margin-top: 16px; font-size: 13px; color: #5B675F; }
  .divider { color: #E4EDE9; }
  
  .profile-actions { display: flex; justify-content: center; margin-top: 16px; }
  .btn { font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 500; padding: 9px 20px; border-radius: 10px; border: none; cursor: pointer; }
  .btn-primary { background: #1F5D50; color: white; }
  .btn-primary:hover { background: #153F36; }
  
  .posts-section { margin-top: 24px; }
  .section-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 12px; }
  
  .post-card { background: white; border: 1px solid #E4EDE9; border-radius: 16px; padding: 16px; margin-top: 14px; }
  .post-head { display: flex; align-items: center; gap: 10px; }
  .mini-avatar { width: 38px; height: 38px; border-radius: 50%; background: #1F5D50; color: white; display: flex; align-items: center; justify-content: center; font-family: 'Baloo Da 2', sans-serif; font-size: 14px; font-weight: 700; flex-shrink: 0; overflow: hidden; }
  .avatar-img { width: 100%; height: 100%; object-fit: cover; }
  .post-meta { flex: 1; }
  .post-name { font-size: 14px; font-weight: 700; display: block; }
  .post-time { font-size: 12px; color: #5B675F; }
  .post-body { font-size: 14.5px; line-height: 1.65; margin: 12px 0; }
  .post-photos-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 12px 0; }
  .post-photos-grid.single-photo { grid-template-columns: 1fr; }
  .post-photo-img { width: 100%; height: auto; display: block; border-radius: 10px; object-fit: cover; }
  .post-stats { display: flex; justify-content: space-between; font-size: 12px; color: #5B675F; padding: 10px 2px; border-bottom: 1px solid #E4EDE9; }
  .post-actions { display: flex; padding-top: 6px; }
  .post-action { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 0; font-size: 13px; font-weight: 500; color: #5B675F; background: none; border: none; cursor: pointer; border-radius: 8px; }
  .post-action:hover { background: #F6F4EE; }
  .post-action.liked { color: #B8503F; }
  
  .empty-posts { text-align: center; padding: 2rem; background: white; border-radius: 16px; border: 1px dashed #E4EDE9; }
  
  .footer { background: white; border-top: 1px solid #E4EDE9; padding: 16px; margin-top: 2rem; }
  .footer-container { max-width: 640px; margin: 0 auto; display: flex; justify-content: space-between; font-size: 13px; color: #5B675F; }
  .footer-links { display: flex; gap: 10px; }
  .footer-links a { color: #5B675F; text-decoration: none; }
  
  /* @media (max-width: 768px) {
    .header-nav { display: none; }
  } */
</style>