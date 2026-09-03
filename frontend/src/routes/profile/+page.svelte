<!-- src/routes/profile/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { page as pageStore } from '$app/stores';
  import { goto } from "$app/navigation";
  import {
    Loader2,
    User,
    LogOut,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    Calendar,
    Heart,
    MessageCircle,
    Share2,
    Image,
    X,
    Send,
    Leaf,
    Camera,
    Pencil,
    Trash2,
    Plus,
    MoreVertical,
    Reply,
    ChevronLeft
  } from "lucide-svelte";

  let isLoading = $state(true);
  let user = $state<any>(null);
  let posts = $state<any[]>([]);
  let error = $state("");
  let activeTab = $state<"posts" | "about" | "activity">("posts");
  let showComposer = $state(false);
  let postContent = $state("");
  let postVisibility = $state<"PUBLIC" | "ORG_ONLY" | "MEMBERS_ONLY">("PUBLIC");
  let isSubmitting = $state(false);
  let isLoggingOut = $state(false);
  let isEditingProfile = $state(false);
  let isUploadingPhoto = $state(false);
  let showPhotoMenu = $state(false);
  let showPhotoPreview = $state(false);
  let editForm = $state({
    bio: "",
    address: "",
    occupation: "",
    gender: "",
    dateOfBirth: "",
  });
  let selectedPhotos = $state<File[]>([]);
  let photoPreviews = $state<string[]>([]);
  let likedPosts = $state<Set<string>>(new Set());
  let likedComments = $state<Set<string>>(new Set());
  let showComments = $state<Record<string, boolean>>({});
  let comments = $state<Record<string, any[]>>({});
  let commentText = $state<Record<string, string>>({});
  let replyTo = $state<Record<string, { id: string; name: string } | null>>({});
  let replyText = $state<Record<string, string>>({});
  let showReplyInput = $state<Record<string, boolean>>({});
  let editingCommentId = $state<string | null>(null);
  let editingCommentText = $state("");
  let openPostMenuId = $state<string | null>(null);
  let openCommentMenuId = $state<string | null>(null);
  let isEditingPost = $state(false);
  let editingPostId = $state<string | null>(null);
  let editingPostText = $state("");

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

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  async function fetchProfile() {
    try {
      const userRes = await fetch("http://localhost:3001/auth/me", {
        credentials: "include",
      });
      if (userRes.ok) {
        user = await userRes.json();
      } else {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      const postsRes = await fetch(
        `http://localhost:3001/users/${user.id}/posts?limit=20&page=1`,
        { credentials: "include" },
      );
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        posts = postsData.data || [];
        const savedLiked = localStorage.getItem("likedPosts");
        if (savedLiked) likedPosts = new Set(JSON.parse(savedLiked));
        const savedCommentLikes = localStorage.getItem("likedComments");
        if (savedCommentLikes)
          likedComments = new Set(JSON.parse(savedCommentLikes));
      }
    } catch (err) {
      error = "প্রোফাইল লোড করতে সমস্যা হয়েছে";
    } finally {
      isLoading = false;
    }
  }

  async function handleProfilePhotoUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("শুধু JPG, PNG, WebP");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("সর্বোচ্চ ১০MB");
      return;
    }
    isUploadingPhoto = true;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("http://localhost:3001/profile/photo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        user = { ...user, profilePhoto: data.profilePhoto };
        showPhotoMenu = false;
        user = { ...user };
      }
    } catch (err) {
      alert("ছবি upload করতে সমস্যা হয়েছে");
    } finally {
      isUploadingPhoto = false;
    }
  }

  async function deleteProfilePhoto() {
    if (!confirm("প্রোফাইল ছবি ডিলিট করতে চান?")) return;
    try {
      const res = await fetch("http://localhost:3001/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profilePhoto: null }),
      });
      if (res.ok) {
        user = { ...user, profilePhoto: null };
        showPhotoMenu = false;
      }
    } catch (err) {
      console.error(err);
    }
  }

  function startEditProfile() {
    editForm = {
      bio: user?.bio || "",
      address: user?.address || "",
      occupation: user?.occupation || "",
      gender: user?.gender || "",
      dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split("T")[0] : "",
    };
    isEditingProfile = true;
  }

  async function saveProfile() {
    try {
      const res = await fetch("http://localhost:3001/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bio: editForm.bio || undefined,
          address: editForm.address || undefined,
          occupation: editForm.occupation || undefined,
          gender: editForm.gender || undefined,
          dateOfBirth: editForm.dateOfBirth || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        user = { ...user, ...data };
        isEditingProfile = false;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLogout() {
    if (!confirm("আপনি কি লগআউট করতে চান?")) return;
    try {
      await fetch("http://localhost:3001/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      alert("Logout-এ সমস্যা হয়েছে");
    }
  }

  function handlePhotoSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    if (files.length + selectedPhotos.length > 5) {
      alert("সর্বোচ্চ ৫টা");
      return;
    }
    files.forEach((file) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert("JPG, PNG, WebP only");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("সর্বোচ্চ ৫MB");
        return;
      }
      selectedPhotos.push(file);
      photoPreviews.push(URL.createObjectURL(file));
    });
  }

  function removePhoto(index: number) {
    selectedPhotos.splice(index, 1);
    photoPreviews.splice(index, 1);
  }

  async function createPost() {
    if ((!postContent.trim() && selectedPhotos.length === 0) || isSubmitting)
      return;
    isSubmitting = true;
    try {
      if (selectedPhotos.length > 0) {
        const formData = new FormData();
        formData.append("content", postContent);
        formData.append("visibility", postVisibility);
        selectedPhotos.forEach((photo) => formData.append("photos", photo));
        const res = await fetch("http://localhost:3001/posts", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (res.ok) {
          postContent = "";
          selectedPhotos = [];
          photoPreviews = [];
          showComposer = false;
          fetchProfile();
        }
      } else {
        const res = await fetch("http://localhost:3001/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            content: postContent,
            visibility: postVisibility,
          }),
        });
        if (res.ok) {
          postContent = "";
          showComposer = false;
          fetchProfile();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      isSubmitting = false;
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

  async function deletePost(postId: string) {
    if (!confirm("পোস্ট ডিলিট করতে চান?")) return;
    try {
      const res = await fetch(`http://localhost:3001/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) posts = posts.filter((p) => p.id !== postId);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchComments(postId: string) {
    try {
      const res = await fetch(
        `http://localhost:3001/posts/${postId}/comments?limit=20&page=1`,
        { credentials: "include" },
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

  async function toggleCommentLike(postId: string, commentId: string) {
    try {
      const res = await fetch(
        `http://localhost:3001/posts/${postId}/comments/${commentId}/like`,
        { method: "POST", credentials: "include" },
      );
      if (res.ok) {
        const data = await res.json();
        const newLiked = new Set(likedComments);
        if (data.liked) newLiked.add(commentId);
        else newLiked.delete(commentId);
        likedComments = newLiked;
        localStorage.setItem("likedComments", JSON.stringify([...newLiked]));
      }
    } catch (err) {
      console.error(err);
    }
  }

  function isCommentLiked(commentId: string): boolean {
    return likedComments.has(commentId);
  }
  function getCommentLikeCount(comment: any): number {
    return comment._count?.likes || 0;
  }

  async function deleteComment(postId: string, commentId: string) {
    if (!confirm("কমেন্ট ডিলিট করতে চান?")) return;
    try {
      const res = await fetch(
        `http://localhost:3001/posts/${postId}/comments/${commentId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (res.ok) {
        posts = posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                _count: {
                  ...p._count,
                  comments: Math.max(0, (p._count?.comments || 0) - 1),
                },
              }
            : p,
        );
        fetchComments(postId);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function startEditComment(comment: any) {
    editingCommentId = comment.id;
    editingCommentText = comment.content
      ?.replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
    openCommentMenuId = null;
  }

  async function saveEditComment(postId: string, commentId: string) {
    if (!editingCommentText.trim()) return;
    try {
      const res = await fetch(
        `http://localhost:3001/posts/${postId}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: editingCommentText }),
        },
      );
      if (res.ok) {
        editingCommentId = null;
        editingCommentText = "";
        fetchComments(postId);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function startReply(postId: string, comment: any) {
    replyTo[postId] = { id: comment.id, name: comment.user?.name || "Unknown" };
    replyText[postId] = "";
    showReplyInput[postId] = true;
    replyTo = { ...replyTo };
    replyText = { ...replyText };
    showReplyInput = { ...showReplyInput };
  }

  function cancelReply(postId: string) {
    replyTo[postId] = null;
    showReplyInput[postId] = false;
    replyTo = { ...replyTo };
    showReplyInput = { ...showReplyInput };
  }

  async function submitReply(postId: string) {
    const parentId = replyTo[postId]?.id;
    const content = replyText[postId]?.trim();
    if (!parentId || !content) return;
    try {
      const res = await fetch(
        `http://localhost:3001/posts/${postId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content, parentId }),
        },
      );
      if (res.ok) {
        replyTo[postId] = null;
        replyText[postId] = "";
        showReplyInput[postId] = false;
        fetchComments(postId);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function togglePostMenu(postId: string) {
    openPostMenuId = openPostMenuId === postId ? null : postId;
    openCommentMenuId = null;
  }
  function toggleCommentMenu(commentId: string) {
    openCommentMenuId = openCommentMenuId === commentId ? null : commentId;
    openPostMenuId = null;
  }

  function startEditPost(post: any) {
    isEditingPost = true;
    editingPostId = post.id;
    editingPostText = post.content || "";
    openPostMenuId = null;
  }

  async function saveEditPost() {
    if (!editingPostId || !editingPostText.trim()) return;
    try {
      const res = await fetch(`http://localhost:3001/posts/${editingPostId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: editingPostText }),
      });
      if (res.ok) {
        posts = posts.map((p) =>
          p.id === editingPostId
            ? { ...p, content: editingPostText, editedAt: new Date() }
            : p,
        );
        isEditingPost = false;
        editingPostId = null;
        editingPostText = "";
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
    fetchProfile();
  });
</script>

<div class="profile-page">
  <main class="main-content">
    {#if isLoading}
      <div class="skeleton-profile">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-name"></div>
        <div class="skeleton-role"></div>
        <div class="skeleton-bio"></div>
        <div class="skeleton-actions"></div>
      </div>
    {:else if user}
      <div class="profile-card">
        <div class="avatar-section">
          <div class="avatar-wrap" onclick={() => { showPhotoPreview = true; }} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (showPhotoPreview = true)}>
            {#if user.profilePhoto}
              <img src={user.profilePhoto} alt={user.name} class="profile-photo-img" />
            {:else}
              <div class="avatar-circle">{getInitials(user.name)}</div>
            {/if}
          </div>
        </div>
        <div class="profile-name-block">
          <h1 class="profile-name">{user.name}</h1>
          <p class="profile-role bangla">
            {user.role === "SUPER_ADMIN" ? "সুপার অ্যাডমিন" : user.role === "LOCAL_ADMIN" ? "লোকাল অ্যাডমিন" : "কমিউনিটি ভলান্টিয়ার"}
          </p>
          <p class="profile-loc"><MapPin size={14} /> {user.address || "ঠিকানা যোগ করা হয়নি"}</p>
          <p class="profile-bio bangla">{user.bio || "এখনো কোনো বায়ো যোগ করা হয়নি।"}</p>
        </div>
        <div class="profile-actions">
          <button class="btn btn-primary" onclick={() => (showComposer = !showComposer)}>
            <Plus size={16} /> {showComposer ? "বাতিল" : "পোস্ট তৈরি করুন"}
          </button>
          <button class="btn btn-secondary" onclick={startEditProfile}>
            <Pencil size={16} /> Edit Profile
          </button>
          <button class="btn btn-secondary logout-btn" onclick={handleLogout}>
            <LogOut size={16} /> লগআউট
          </button>
        </div>
        <div class="tabs">
          <button class="tab" class:active={activeTab === "posts"} onclick={() => (activeTab = "posts")}>পোস্ট</button>
          <button class="tab" class:active={activeTab === "about"} onclick={() => (activeTab = "about")}>তথ্য</button>
          <button class="tab" class:active={activeTab === "activity"} onclick={() => (activeTab = "activity")}>কার্যক্রম</button>
        </div>
      </div>

      {#if showComposer}
        <div class="composer-modal">
          <textarea class="composer-input bangla" placeholder="কী মনে করছেন?" bind:value={postContent} rows="4"></textarea>
          {#if photoPreviews.length > 0}
            <div class="photo-previews">
              {#each photoPreviews as preview, i}
                <div class="preview-item">
                  <img src={preview} alt="preview" />
                  <button class="remove-photo" onclick={() => removePhoto(i)}><X size={14} /></button>
                </div>
              {/each}
            </div>
          {/if}
          <div class="composer-actions">
            <label class="photo-upload-btn">
              <Image size={18} /> ছবি যোগ করুন
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onchange={handlePhotoSelect} style="display:none;" />
            </label>
            <select bind:value={postVisibility} class="visibility-select">
              <option value="PUBLIC">🌍 Public</option>
              <option value="ORG_ONLY">🏢 Org Only</option>
              <option value="MEMBERS_ONLY">👥 Members Only</option>
            </select>
            <button class="btn btn-primary" onclick={createPost} disabled={isSubmitting || (!postContent.trim() && selectedPhotos.length === 0)}>
              {isSubmitting ? "পোস্ট হচ্ছে..." : "পোস্ট করুন"}
            </button>
          </div>
        </div>
      {/if}

      {#if activeTab === "posts"}
        {#each posts as post}
          <div class="post-card">
            <div class="post-head">
              <div class="mini-avatar">{getInitials(user.name)}</div>
              <div class="post-meta">
                <span class="post-name">{user.name}</span>
                <span class="post-time mono">{timeAgo(post.createdAt)}</span>
              </div>
              <div class="menu-container">
                <button class="three-dot-btn" onclick={() => togglePostMenu(post.id)}>
                  <MoreVertical size={18} />
                </button>
                {#if openPostMenuId === post.id}
                  <div class="dropdown-menu">
                    <button class="dropdown-item" onclick={() => startEditPost(post)}>
                      <Pencil size={14} /> Edit
                    </button>
                    <button class="dropdown-item delete-item" onclick={() => deletePost(post.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                {/if}
              </div>
            </div>
            {#if isEditingPost && editingPostId === post.id}
              <div class="edit-post-section">
                <textarea class="edit-post-input bangla" bind:value={editingPostText} rows="3"></textarea>
                <div class="edit-post-actions">
                  <button class="btn btn-primary" onclick={saveEditPost}>Save</button>
                  <button class="btn btn-secondary" onclick={() => { isEditingPost = false; editingPostId = null; }}>Cancel</button>
                </div>
              </div>
            {:else if post.content}
              <p class="post-body bangla">{decodeHtml(post.content)}</p>
            {/if}
            {#if post.photos?.length > 0}
              <div class="post-photos-grid" class:single-photo={post.photos.length === 1}>
                {#each post.photos as photo}
                  <img src={photo} alt="post" class="post-photo-img" width="300" height="300" loading="lazy" />
                {/each}
              </div>
            {/if}
            <div class="post-stats">
              <span class="mono">❤ {post._count?.likes || 0} likes</span>
              <span class="mono">{post._count?.comments || 0} comments</span>
            </div>
            <div class="post-actions">
              <button class="post-action" class:liked={isPostLiked(post.id)} onclick={() => toggleLike(post.id)}>
                <Heart size={16} fill={isPostLiked(post.id) ? "#B8503F" : "none"} /> Like
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
                  <div class="mini-avatar-sm">{getInitials(user.name)}</div>
                  <textarea class="comment-textarea bangla" placeholder="কমেন্ট লিখুন..." bind:value={commentText[post.id]} rows="1" onkeydown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(post.id); } }}></textarea>
                  <button class="comment-send-btn" onclick={() => submitComment(post.id)}>
                    <Send size={14} />
                  </button>
                </div>
                {#if comments[post.id]?.length > 0}
                  {#each comments[post.id] as comment}
                    <div class="comment-row">
                      <div class="mini-avatar-sm">{getInitials(comment.user?.name || "?")}</div>
                      <div class="comment-bubble">
                        <span class="comment-name">{comment.user?.name}</span>
                        {#if editingCommentId === comment.id}
                          <textarea class="edit-input bangla" bind:value={editingCommentText} rows="2"></textarea>
                          <div class="edit-actions">
                            <button class="save-edit-btn" onclick={() => saveEditComment(post.id, comment.id)}>Save</button>
                            <button class="cancel-edit-btn" onclick={() => { editingCommentId = null; }}>Cancel</button>
                          </div>
                        {:else}
                          <p class="comment-text bangla" style="white-space: pre-wrap;">{decodeHtml(comment.content)}</p>
                        {/if}
                        <div class="comment-actions-row">
                          <button class="comment-action" class:liked={isCommentLiked(comment.id)} onclick={() => toggleCommentLike(post.id, comment.id)}>
                            <Heart size={12} fill={isCommentLiked(comment.id) ? "#B8503F" : "none"} /> Like ({getCommentLikeCount(comment)})
                          </button>
                          <button class="comment-action" onclick={() => startReply(post.id, comment)}>
                            <Reply size={12} /> Reply
                          </button>
                          {#if comment.user?.id === user.id}
                            <div class="comment-menu-wrapper">
                              <button class="comment-three-dot" onclick={() => toggleCommentMenu(comment.id)}>
                                <MoreVertical size={14} />
                              </button>
                              {#if openCommentMenuId === comment.id}
                                <div class="comment-dropdown-menu">
                                  <button class="dropdown-item" onclick={() => startEditComment(comment)}>
                                    <Pencil size={12} /> Edit
                                  </button>
                                  <button class="dropdown-item delete-item" onclick={() => deleteComment(post.id, comment.id)}>
                                    <Trash2 size={12} /> Delete
                                  </button>
                                </div>
                              {/if}
                            </div>
                          {/if}
                        </div>
                        {#if showReplyInput[post.id] && replyTo[post.id]?.id === comment.id}
                          <div class="reply-input-row">
                            <div class="mini-avatar-sm">{getInitials(user.name)}</div>
                            <textarea class="comment-textarea bangla" placeholder="রিপ্লাই লিখুন..." bind:value={replyText[post.id]} rows="1" onkeydown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitReply(post.id); } }}></textarea>
                            <button class="comment-send-btn" onclick={() => submitReply(post.id)}>
                              <Send size={14} />
                            </button>
                            <button class="cancel-reply-btn" onclick={() => cancelReply(post.id)}>
                              <X size={14} />
                            </button>
                          </div>
                        {/if}
                        {#if comment.replies?.length > 0}
                          <div class="nested-replies">
                            {#each comment.replies as reply}
                              <div class="reply-row">
                                <div class="mini-avatar-sm">{getInitials(reply.user?.name || "?")}</div>
                                <div class="comment-bubble reply-bubble">
                                  <span class="comment-name">{reply.user?.name}</span>
                                  {#if editingCommentId === reply.id}
                                    <textarea class="edit-input bangla" bind:value={editingCommentText} rows="2"></textarea>
                                    <div class="edit-actions">
                                      <button class="save-edit-btn" onclick={() => saveEditComment(post.id, reply.id)}>Save</button>
                                      <button class="cancel-edit-btn" onclick={() => { editingCommentId = null; }}>Cancel</button>
                                    </div>
                                  {:else}
                                    <p class="comment-text bangla" style="white-space: pre-wrap;">{decodeHtml(reply.content)}</p>
                                  {/if}
                                  <div class="comment-actions-row">
                                    <button class="comment-action" class:liked={isCommentLiked(reply.id)} onclick={() => toggleCommentLike(post.id, reply.id)}>
                                      <Heart size={12} fill={isCommentLiked(reply.id) ? "#B8503F" : "none"} /> Like ({getCommentLikeCount(reply)})
                                    </button>
                                    <button class="comment-action" onclick={() => startReply(post.id, reply)}>
                                      <Reply size={12} /> Reply
                                    </button>
                                    {#if reply.user?.id === user.id}
                                      <div class="comment-menu-wrapper">
                                        <button class="comment-three-dot" onclick={() => toggleCommentMenu(reply.id)}>
                                          <MoreVertical size={14} />
                                        </button>
                                        {#if openCommentMenuId === reply.id}
                                          <div class="comment-dropdown-menu">
                                            <button class="dropdown-item" onclick={() => startEditComment(reply)}>
                                              <Pencil size={12} /> Edit
                                            </button>
                                            <button class="dropdown-item delete-item" onclick={() => deleteComment(post.id, reply.id)}>
                                              <Trash2 size={12} /> Delete
                                            </button>
                                          </div>
                                        {/if}
                                      </div>
                                    {/if}
                                  </div>
                                </div>
                              </div>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                {:else}
                  <p class="no-comments bangla">কোনো কমেন্ট নেই। প্রথম কমেন্ট করুন!</p>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
        {#if posts.length === 0}
          <p class="empty-text bangla">এখনো কোনো পোস্ট নেই। প্রথম পোস্ট করুন!</p>
        {/if}
      {:else if activeTab === "about"}
        <div class="about-card">
          <div class="detail-item">
            <Mail size={18} />
            <div>
              <span class="detail-label">ইমেইল</span>
              <span class="detail-value">{user.email}</span>
            </div>
          </div>
          <div class="detail-item">
            <Phone size={18} />
            <div>
              <span class="detail-label">ফোন</span>
              <span class="detail-value">{user.phone}</span>
            </div>
          </div>
          <div class="detail-item">
            <MapPin size={18} />
            <div>
              <span class="detail-label">ঠিকানা</span>
              <span class="detail-value">{user.address || "N/A"}</span>
            </div>
          </div>
          <div class="detail-item">
            <Briefcase size={18} />
            <div>
              <span class="detail-label">পেশা</span>
              <span class="detail-value">{user.occupation || "N/A"}</span>
            </div>
          </div>
          <div class="detail-item">
            <Calendar size={18} />
            <div>
              <span class="detail-label">যোগদান</span>
              <span class="detail-value">{formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>
      {:else}
        <p class="empty-text bangla">কার্যক্রম শীঘ্রই আসছে...</p>
      {/if}
    {/if}
  </main>

  {#if showPhotoPreview}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="photo-preview-overlay" onclick={() => showPhotoPreview = false} onkeydown={(e) => e.key === 'Escape' && (showPhotoPreview = false)} role="dialog" tabindex="-1">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="photo-preview-container" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        {#if user.profilePhoto}
          <img src={user.profilePhoto} alt={user.name} class="photo-preview-img" />
        {:else}
          <div class="preview-placeholder">
            <User size={48} />
          </div>
        {/if}
        <button class="photo-preview-close" onclick={() => showPhotoPreview = false}>
          <X size={24} />
        </button>
        <div class="photo-preview-actions">
          <button class="btn btn-primary" onclick={() => document.getElementById('profile-photo-input')?.click()}>
            <Camera size={16} /> Change Photo
          </button>
          {#if user.profilePhoto}
            <button class="btn btn-danger" onclick={() => { showPhotoPreview = false; deleteProfilePhoto(); }}>
              <Trash2 size={16} /> Delete
            </button>
          {/if}
        </div>
        <input id="profile-photo-input" type="file" accept="image/jpeg,image/png,image/webp" onchange={handleProfilePhotoUpload} style="display:none;" />
      </div>
    </div>
  {/if}

  {#if isEditingProfile}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={() => (isEditingProfile = false)} onkeydown={(e) => e.key === 'Escape' && (isEditingProfile = false)} role="dialog" tabindex="-1">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="modal-content" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <h2 class="modal-title">✏️ প্রোফাইল এডিট করুন</h2>
        <div class="form-group">
          <label class="modal-label" for="edit-bio">বায়ো</label>
          <textarea id="edit-bio" class="form-input bangla" rows="3" bind:value={editForm.bio}></textarea>
        </div>
        <div class="form-group">
          <label class="modal-label" for="edit-address">ঠিকানা</label>
          <input id="edit-address" class="form-input bangla" bind:value={editForm.address} />
        </div>
        <div class="form-group">
          <label class="modal-label" for="edit-occupation">পেশা</label>
          <input id="edit-occupation" class="form-input bangla" bind:value={editForm.occupation} />
        </div>
        <div class="form-group">
          <label class="modal-label" for="edit-gender">লিঙ্গ</label>
          <select id="edit-gender" class="form-input" bind:value={editForm.gender}>
            <option value="">নির্বাচন করুন</option>
            <option value="male">পুরুষ</option>
            <option value="female">মহিলা</option>
            <option value="other">অন্যান্য</option>
          </select>
        </div>
        <div class="form-group">
          <label class="modal-label" for="edit-dob">জন্ম তারিখ</label>
          <input id="edit-dob" type="date" class="form-input" bind:value={editForm.dateOfBirth} />
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" onclick={saveProfile}>Save</button>
          <button class="btn btn-secondary" onclick={() => (isEditingProfile = false)}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .profile-page {
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

  .skeleton-profile {
    background: white;
    border-radius: 16px;
    border: 1px solid #E4EDE9;
    padding: 28px 24px;
    text-align: center;
  }
  .skeleton-avatar {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: #E4EDE9;
    margin: 0 auto 14px;
    animation: pulse 1.5s ease-in-out infinite;
  }
  .skeleton-name {
    width: 200px;
    height: 22px;
    background: #E4EDE9;
    border-radius: 4px;
    margin: 0 auto 8px;
    animation: pulse 1.5s ease-in-out infinite;
  }
  .skeleton-role {
    width: 150px;
    height: 14px;
    background: #E4EDE9;
    border-radius: 4px;
    margin: 0 auto 12px;
    animation: pulse 1.5s ease-in-out infinite;
  }
  .skeleton-bio {
    width: 280px;
    height: 14px;
    background: #E4EDE9;
    border-radius: 4px;
    margin: 0 auto 16px;
    animation: pulse 1.5s ease-in-out infinite;
  }
  .skeleton-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
  }
  .skeleton-actions::before,
  .skeleton-actions::after {
    content: '';
    width: 120px;
    height: 38px;
    background: #E4EDE9;
    border-radius: 10px;
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }

  .profile-card {
    background: white;
    border-radius: 16px;
    border: 1px solid #E4EDE9;
    padding: 28px 24px 16px;
    position: relative;
  }
  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 14px;
    position: relative;
  }
  .avatar-wrap {
    width: 140px;
    height: 140px;
    position: relative;
    cursor: pointer;
  }
  .avatar-circle {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: linear-gradient(135deg, #1F5D50, #2E7A69);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 36px;
    font-weight: 700;
    border: 4px solid #E9A23B;
  }
  .profile-photo-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid #E9A23B;
  }
  /* photo-menu removed — preview has actions */

  .profile-name-block { text-align: center; }
  .profile-name {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 22px;
    font-weight: 700;
  }
  .profile-role { font-size: 13px; color: #5B675F; margin-top: 2px; }
  .profile-loc {
    font-size: 13px;
    color: #5B675F;
    margin-top: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .profile-bio {
    font-size: 14px;
    line-height: 1.6;
    margin: 14px auto 0;
    max-width: 440px;
  }
  .profile-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 18px;
    flex-wrap: wrap;
  }
  .btn {
    font-family: 'DM Sans', sans-serif;
    font-size: 13.5px;
    font-weight: 500;
    padding: 9px 20px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .btn-primary { background: #1F5D50; color: white; }
  .btn-primary:hover { background: #153F36; }
  .btn-secondary {
    background: white;
    color: #1F5D50;
    border: 1px solid #1F5D50;
  }
  .logout-btn { color: #B8503F; border-color: #B8503F; }
  .logout-btn:hover { background: #FDF0ED; }

  .tabs {
    display: flex;
    gap: 4px;
    margin-top: 22px;
    border-bottom: 1px solid #E4EDE9;
  }
  .tab {
    flex: 1;
    text-align: center;
    padding: 10px 6px;
    font-size: 14px;
    font-weight: 500;
    color: #5B675F;
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .tab.active { color: #1F5D50; }
  .tab.active::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2.5px;
    background: #E9A23B;
    border-radius: 2px;
  }

  .composer-modal {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 16px;
    padding: 16px;
    margin-top: 16px;
  }
  .composer-input {
    width: 100%;
    padding: 12px;
    border: 1px solid #E4EDE9;
    border-radius: 10px;
    font-size: 14px;
    resize: none;
    outline: none;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .composer-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .visibility-select {
    padding: 8px 12px;
    border: 1px solid #E4EDE9;
    border-radius: 8px;
    font-size: 13px;
    outline: none;
    background: white;
  }
  .photo-upload-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid #E4EDE9;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    color: #5B675F;
  }
  .photo-upload-btn:hover {
    border-color: #1F5D50;
    color: #1F5D50;
  }
  .photo-previews {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 12px;
  }
  .preview-item { position: relative; }
  .preview-item img {
    width: 100%;
    height: 100px;
    object-fit: cover;
    border-radius: 8px;
  }
  .remove-photo {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(0,0,0,0.6);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .post-card {
    background: white;
    border: 1px solid #E4EDE9;
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
    background: #1F5D50;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .post-meta { flex: 1; }
  .post-name { font-size: 14px; font-weight: 700; display: block; }
  .post-time { font-size: 12px; color: #5B675F; }
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
  .post-photos-grid.single-photo { grid-template-columns: 1fr; }
  .post-photo-img {
    width: 100%;
    border-radius: 10px;
    object-fit: cover;
  }
  .post-stats {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #5B675F;
    padding: 10px 2px;
    border-bottom: 1px solid #E4EDE9;
  }
  .post-actions { display: flex; padding-top: 6px; }
  .post-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 9px 0;
    font-size: 13px;
    font-weight: 500;
    color: #5B675F;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 8px;
  }
  .post-action:hover { background: #F6F4EE; }
  .post-action.liked { color: #B8503F; }

  .comments-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #E4EDE9;
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
    background: #1F5D50;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .comment-textarea {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #E4EDE9;
    border-radius: 12px;
    font-size: 13px;
    outline: none;
    font-family: 'Hind Siliguri', sans-serif;
    resize: none;
    min-height: 36px;
  }
  .comment-send-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #1F5D50;
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
    background: #F6F4EE;
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
  .comment-actions-row {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 5px;
    flex-wrap: wrap;
  }
  .comment-action {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    color: #5B675F;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
  }
  .comment-action:hover { background: #E4EDE9; }
  .comment-action.liked { color: #B8503F; }
  .comment-menu-wrapper {
    position: relative;
    display: inline-block;
  }
  .comment-three-dot {
    background: none;
    border: none;
    cursor: pointer;
    color: #8B9790;
    padding: 2px 6px;
    border-radius: 50%;
    display: flex;
    align-items: center;
  }
  .comment-three-dot:hover { background: #E4EDE9; }
  .comment-dropdown-menu {
    position: absolute;
    top: 0;
    left: 100%;
    margin-left: 8px;
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 10px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    min-width: 120px;
    z-index: 9999;
    overflow: hidden;
  }
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 14px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-family: 'Hind Siliguri', sans-serif;
    color: #16231F;
    text-align: left;
  }
  .dropdown-item:hover { background: #F6F4EE; }
  .delete-item { color: #B8503F; }
  .delete-item:hover { background: #FDF0ED; }

  .edit-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #1F5D50;
    border-radius: 8px;
    font-size: 13px;
    outline: none;
    font-family: 'Hind Siliguri', sans-serif;
    resize: none;
    margin-top: 4px;
  }
  .edit-actions {
    display: flex;
    gap: 6px;
    margin-top: 4px;
  }
  .save-edit-btn {
    padding: 4px 12px;
    background: #1F5D50;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
  }
  .cancel-edit-btn {
    padding: 4px 12px;
    background: #F6F4EE;
    color: #5B675F;
    border: 1px solid #E4EDE9;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
  }
  .reply-row {
    display: flex;
    gap: 8px;
    margin: 8px 0 0 38px;
  }
  .reply-bubble { padding: 7px 12px; }
  .nested-replies { margin-top: 4px; }
  .reply-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0 0 38px;
  }
  .cancel-reply-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #FDF0ED;
    color: #B8503F;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .no-comments {
    text-align: center;
    font-size: 12px;
    color: #8B9790;
    padding: 12px;
  }

  .empty-text {
    text-align: center;
    padding: 2rem;
    color: #5B675F;
  }

  .about-card {
    background: white;
    border-radius: 16px;
    padding: 20px;
    margin-top: 16px;
    border: 1px solid #E4EDE9;
  }
  .detail-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #F6F4EE;
  }
  .detail-item:last-child { border-bottom: none; }
  /* .detail-item svg { color: #1F5D50; flex-shrink: 0; margin-top: 3px; } */
  .detail-label {
    display: block;
    font-size: 12px;
    color: #8B9790;
  }
  .detail-value {
    font-size: 14px;
    font-weight: 500;
  }

  .photo-preview-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 2rem;
  }
  .photo-preview-container {
    position: relative;
    max-width: 500px;
    width: 100%;
    text-align: center;
  }
  .photo-preview-img {
    max-width: 100%;
    max-height: 55vh;
    border-radius: 16px;
    object-fit: contain;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  }
  .preview-placeholder {
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: #E4EDE9;
    color: #8B9790;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
  }
  .photo-preview-close {
    position: absolute;
    top: -20px;
    right: -20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: white;
    color: #16231F;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .photo-preview-close:hover {
    background: #FDF0ED;
    color: #B8503F;
  }
  .photo-preview-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 16px;
    flex-wrap: wrap;
  }
  .btn-danger {
    background: #FDF0ED;
    color: #B8503F;
    border: 1px solid #B8503F;
  }
  .btn-danger:hover {
    background: #B8503F;
    color: white;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }
  .modal-content {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    max-width: 28rem;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }
  .modal-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1rem;
    font-family: 'Baloo Da 2', sans-serif;
  }
  .form-group { margin-bottom: 1rem; }
  .modal-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.375rem;
    color: #16231F;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid #E4EDE9;
    border-radius: 10px;
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 0.9375rem;
    outline: none;
    transition: all 0.2s;
  }
  .form-input:focus {
    border-color: #1F5D50;
    box-shadow: 0 0 0 4px rgba(31,93,80,0.1);
  }
  .modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 1.5rem;
  }
  .menu-container { position: relative; }
  .three-dot-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #5B675F;
    padding: 4px 8px;
    border-radius: 50%;
    transition: all 0.2s;
    display: flex;
    align-items: center;
  }
  .three-dot-btn:hover { background: #F6F4EE; }
  .dropdown-menu {
    position: absolute;
    right: 0;
    top: 100%;
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    min-width: 140px;
    z-index: 50;
    overflow: hidden;
  }
  .edit-post-section { margin: 12px 0; }
  .edit-post-input {
    width: 100%;
    padding: 10px;
    border: 1px solid #E4EDE9;
    border-radius: 10px;
    font-size: 14px;
    resize: none;
    outline: none;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .edit-post-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
</style>