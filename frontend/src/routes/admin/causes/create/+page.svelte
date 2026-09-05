<!-- src/routes/admin/causes/create/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, ArrowLeft, Save, Image, Upload, X } from 'lucide-svelte';

  let isLoading = $state(false);
  let isUploading = $state(false);
  let title = $state('');
  let story = $state('');
  let coverImage = $state('');
  let coverPreview = $state('');
  let isFeatured = $state(false);
  let error = $state('');
  let success = $state('');

  async function handleImageUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // Validate
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      error = 'শুধু JPG, PNG, WebP ফাইল দিন';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      error = 'সর্বোচ্চ ১০MB';
      return;
    }

    isUploading = true;
    error = '';

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('http://localhost:3001/photos/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        coverImage = data.url;
        coverPreview = data.url;
      } else {
        error = data.error || 'ছবি upload করতে সমস্যা হয়েছে';
      }
    } catch (err) {
      error = 'ছবি upload করতে সমস্যা হয়েছে';
    } finally {
      isUploading = false;
    }
  }

  function removeImage() {
    coverImage = '';
    coverPreview = '';
  }

  async function handleSubmit() {
    if (!title.trim() || !story.trim()) {
      error = 'Title এবং Story আবশ্যক';
      return;
    }

    isLoading = true;
    error = '';
    success = '';

    try {
      const res = await fetch('http://localhost:3001/admin/causes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          story: story.trim(),
          coverImage: coverImage || undefined,
          isFeatured,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        success = 'Cause তৈরি হয়েছে!';
        setTimeout(() => goto('/admin/causes'), 1000);
      } else {
        error = data.error || 'Cause তৈরি করতে সমস্যা হয়েছে';
      }
    } catch (err) {
      error = 'সার্ভারে সমস্যা হয়েছে';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="admin-page">
  <button class="back-btn" onclick={() => goto('/admin/causes')}>
    <ArrowLeft size={16} /> Cause List-এ ফিরুন
  </button>

  <div class="page-header">
    <h1 class="page-title">নতুন Cause তৈরি করুন</h1>
  </div>

  <div class="form-card">
    <div class="form-group">
      <span class="form-label">Cover Image</span>
      
      {#if coverPreview}
        <div class="image-preview-wrap">
          <img src={coverPreview} alt="Cover Preview" class="image-preview" />
          <button class="remove-image-btn" onclick={removeImage} aria-label="Remove image">
            <X size={18} />
          </button>
        </div>
      {:else}
        <label class="upload-box">
          <Upload size={32} />
          <span class="upload-text">ছবি আপলোড করুন</span>
          <span class="upload-hint">JPG, PNG, WebP · সর্বোচ্চ ১০MB</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onchange={handleImageUpload} style="display:none;" />
        </label>
      {/if}

      {#if isUploading}
        <div class="uploading-indicator">
          <Loader2 size={16} class="spin-anim" /> আপলোড হচ্ছে...
        </div>
      {/if}
    </div>

    <div class="form-group">
      <label class="form-label" for="cause-title">Cause Title</label>
      <input id="cause-title" class="form-input bangla" placeholder="যেমন: নেপাল বন্যা ত্রাণ ২০২৬" bind:value={title} />
    </div>

    <div class="form-group">
      <label class="form-label" for="cause-story">Story / বিবরণ</label>
      <textarea id="cause-story" class="form-input bangla" rows="6" placeholder="Cause-এর বিস্তারিত গল্প লিখুন..." bind:value={story}></textarea>
    </div>

    <div class="form-group checkbox-group">
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={isFeatured} />
        <span>Home page-এ Featured হিসেবে দেখান</span>
      </label>
    </div>

    {#if error}
      <div class="error-box bangla">{error}</div>
    {/if}
    {#if success}
      <div class="success-box bangla">{success}</div>
    {/if}

    <button class="btn btn-primary submit-btn" onclick={handleSubmit} disabled={isLoading || isUploading}>
      {#if isLoading}
        <Loader2 size={16} class="spin-anim" /> তৈরি হচ্ছে...
      {:else}
        <Save size={16} /> Cause তৈরি করুন
      {/if}
    </button>
  </div>
</div>

<style>
  .admin-page { max-width: 600px; }
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
    margin-bottom: 10px;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .back-btn:hover { color: #1F5D50; }
  .page-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: #153F36;
    margin-bottom: 16px;
  }
  .form-card {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 14px;
    padding: 20px;
  }
  .form-group { margin-bottom: 18px; }
  .form-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #16231F;
    margin-bottom: 6px;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .form-input {
    width: 100%;
    padding: 10px 14px;
    border: 2px solid #E4EDE9;
    border-radius: 10px;
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 14px;
    outline: none;
  }
  .form-input:focus {
    border-color: #1F5D50;
    box-shadow: 0 0 0 3px rgba(31,93,80,0.1);
  }
  textarea.form-input { resize: vertical; min-height: 100px; }

  .upload-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 2rem;
    border: 2px dashed #E4EDE9;
    border-radius: 12px;
    cursor: pointer;
    color: #5B675F;
    transition: all 0.2s;
    text-align: center;
  }
  .upload-box:hover {
    border-color: #1F5D50;
    color: #1F5D50;
    background: #F6F4EE;
  }
  .upload-text { font-size: 14px; font-weight: 600; }
  .upload-hint { font-size: 11px; color: #8B9790; }

  .image-preview-wrap {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid #1F5D50;
  }
  .image-preview {
    width: 100%;
    height: 220px;
    object-fit: cover;
    display: block;
  }
  .remove-image-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(0,0,0,0.6);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .remove-image-btn:hover { background: #B8503F; }

  .uploading-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #1F5D50;
    margin-top: 8px;
    font-family: 'Hind Siliguri', sans-serif;
  }

  .checkbox-group { display: flex; align-items: center; }
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #16231F;
    cursor: pointer;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .error-box {
    background: #FDF0ED;
    border: 1px solid #F5C6CB;
    color: #B8503F;
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 12px;
    font-size: 13px;
  }
  .success-box {
    background: #EAF4EE;
    border: 1px solid #C8E6C9;
    color: #1F6E45;
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 12px;
    font-size: 13px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .btn-primary { background: #1F5D50; color: white; }
  .btn-primary:hover { background: #153F36; }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .submit-btn { width: 100%; justify-content: center; }
  /* .spin-anim { animation: spin 1s linear infinite; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>