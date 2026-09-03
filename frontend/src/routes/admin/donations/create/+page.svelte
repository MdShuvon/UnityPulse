<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, PlusCircle, Save } from 'lucide-svelte';

  let title = $state('');
  let description = $state('');
  let goalAmount = $state<number | null>(null);
  let deadline = $state('');
  let noDeadline = $state(false);
  let coverImageFile = $state<File | null>(null);
  let coverPreviewUrl = $state('');
  let isUploadingImage = $state(false);
  let isEditMode = $state(false);
  let projectId = $state<string | null>(null);
  let isSubmitting = $state(false);
  let errors = $state<{ [field: string]: string }>({});
  let formError = $state('');
  let showToast = $state(false);
  let toastMessage = $state('');

  function validate(): boolean {
    const newErrors: { [field: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = 'শিরোনাম আবশ্যক';
    } else if (title.trim().length > 100) {
      newErrors.title = 'সর্বোচ্চ ১০০ অক্ষর';
    }

    if (!description.trim()) {
      newErrors.description = 'বিস্তারিত আবশ্যক';
    } else if (description.trim().length < 20) {
      newErrors.description = 'বিস্তারিত আবশ্যক (কমপক্ষে ২০ অক্ষর)';
    }

    if (goalAmount === null || goalAmount === undefined) {
      newErrors.goalAmount = 'Goal amount দিন';
    } else if (goalAmount < 1) {
      newErrors.goalAmount = 'কমপক্ষে ১';
    }

    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  function handleCoverSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('JPG, PNG, WebP only');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('সর্বোচ্চ ৫MB');
      return;
    }

    coverImageFile = file;
    coverPreviewUrl = URL.createObjectURL(file);
  }

  async function uploadCoverImage(): Promise<string | null> {
    if (!coverImageFile) return null;

    isUploadingImage = true;

    try {
      const presignRes = await fetch('http://localhost:3001/admin/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          purpose: 'donation-cover',
          contentType: coverImageFile.type,
        }),
      });

      if (!presignRes.ok) {
        throw new Error('Presign failed');
      }

      const presignData = await presignRes.json();

      const uploadRes = await fetch(presignData.uploadUrl, {
        method: 'PUT',
        body: coverImageFile,
        headers: { 'Content-Type': coverImageFile.type },
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      return presignData.publicUrl;
    } catch (err) {
      formError = 'ছবি upload করতে সমস্যা হয়েছে';
      return null;
    } finally {
      isUploadingImage = false;
    }
  }

  async function fetchProjectForEdit(id: string) {
    try {
      const res = await fetch('http://localhost:3001/admin/donations/projects', {
        credentials: 'include',
      });
      if (res.ok) {
        const projects = await res.json();
        const project = projects.find((p: any) => p.id === id);
        if (project) {
          title = project.title || '';
          description = project.description || '';
          goalAmount = project.goalAmount || null;
          if (project.deadline) {
            deadline = project.deadline.split('T')[0];
            noDeadline = false;
          } else {
            noDeadline = true;
            deadline = '';
          }
        }
      }
    } catch (err) { console.error(err); }
  }

  async function submitProject() {
    if (!validate() || isSubmitting) return;

    isSubmitting = true;
    formError = '';

    try {
      // Step 1: Upload cover image if new file selected
      let coverImageUrl: string | null = null;
      if (coverImageFile) {
        coverImageUrl = await uploadCoverImage();
        if (!coverImageUrl) {
          isSubmitting = false;
          return;
        }
      }

      // Step 2: Submit project data
      const body: any = {
        title: title.trim(),
        description: description.trim(),
        goalAmount: Number(goalAmount),
        deadline: noDeadline ? null : deadline || null,
      };

      if (coverImageUrl) {
        body.coverImage = coverImageUrl;
      }

      const url = isEditMode && projectId
        ? `http://localhost:3001/admin/donations/projects/${projectId}`
        : 'http://localhost:3001/admin/donations/projects';

      const res = await fetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast = true;
        toastMessage = isEditMode ? 'Project আপডেট হয়েছে' : 'Project তৈরি হয়েছে';
        setTimeout(() => goto('/admin/donations'), 1500);
      } else {
        const data = await res.json();
        formError = data.error || 'Server error';
      }
    } catch (err) {
      formError = 'Network error';
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      isEditMode = true;
      projectId = id;
      fetchProjectForEdit(id);
    }
  });
</script>

<div class="donation-form-page">
  <h1 class="page-title">{isEditMode ? 'Edit Project' : 'নতুন Donation Project'}</h1>
  <p class="page-sub bangla">{isEditMode ? 'Project তথ্য আপডেট করুন' : 'Campaign-এর তথ্য পূরণ করুন'}</p>

  <div class="form-card">
    {#if formError}
      <div class="error-banner bangla">{formError}</div>
    {/if}

    <div class="form-group">
      <span class="form-label">Cover Image</span>
      {#if coverPreviewUrl}
        <div class="upload-box has-image">
          <img src={coverPreviewUrl} alt="cover preview" class="upload-preview" />
        </div>
      {:else}
        <label class="upload-box">
          <div class="upload-placeholder bangla">ছবি আপলোড করুন</div>
          <div class="upload-hint bangla">JPG/PNG/WebP, সর্বোচ্চ ৫MB</div>
          <input type="file" accept="image/jpeg,image/png,image/webp" onchange={handleCoverSelect} style="display:none;" />
        </label>
      {/if}
      {#if isUploadingImage}
        <p class="upload-hint bangla">আপলোড হচ্ছে...</p>
      {/if}
    </div>

    <div class="form-group">
      <label class="form-label" for="proj-title">Title *</label>
      <input
        id="proj-title"
        class="form-input bangla"
        class:input-error={errors.title}
        bind:value={title}
        placeholder="শীতবস্ত্র বিতরণ ক্যাম্পেইন"
        maxlength="100"
      />
      {#if errors.title}
        <p class="error-text bangla">{errors.title}</p>
      {/if}
    </div>

    <div class="form-group">
      <label class="form-label" for="proj-desc">বিস্তারিত বিবরণ *</label>
      <textarea
        id="proj-desc"
        class="form-input bangla"
        class:input-error={errors.description}
        bind:value={description}
        rows="4"
        placeholder="এই campaign সম্পর্কে বিস্তারিত লিখুন..."
      ></textarea>
      {#if errors.description}
        <p class="error-text bangla">{errors.description}</p>
      {/if}
    </div>

    <div class="form-group">
      <label class="form-label" for="proj-goal">Goal Amount (৳) *</label>
      <input
        id="proj-goal"
        type="number"
        class="form-input mono"
        class:input-error={errors.goalAmount}
        bind:value={goalAmount}
        placeholder="100000"
        min="1"
        inputmode="numeric"
      />
      {#if errors.goalAmount}
        <p class="error-text bangla">{errors.goalAmount}</p>
      {/if}
    </div>

    <div class="form-group">
      <label class="form-label" for="proj-deadline">Deadline</label>
      <input
        id="proj-deadline"
        type="date"
        class="form-input"
        bind:value={deadline}
        disabled={noDeadline}
      />
      <div class="checkbox-row">
        <input type="checkbox" id="nodeadline" bind:checked={noDeadline} />
        <label for="nodeadline" class="bangla">চলমান Campaign, নির্দিষ্ট Deadline নেই</label>
      </div>
    </div>

    <button class="submit-btn" onclick={submitProject} disabled={isSubmitting || isUploadingImage}>
      {#if isSubmitting || isUploadingImage}
        <Loader2 size={18} class="spin-icon" /> Processing...
      {:else if isEditMode}
        <Save size={18} /> Update Project
      {:else}
        <PlusCircle size={18} /> Project তৈরি করুন
      {/if}
    </button>
  </div>

  {#if showToast}
    <div class="toast bangla">{toastMessage}</div>
  {/if}
</div>

<style>
  .donation-form-page { min-height: 100vh; }
  .page-title { font-family: 'Baloo Da 2', sans-serif; font-size: 22px; font-weight: 700; color: #153F36; }
  .page-sub { font-size: 13px; color: #5B675F; margin-top: 4px; }

  .form-card { background: #FFFFFF; border: 1px solid #E4EDE9; border-radius: 16px; padding: 22px; margin-top: 18px; }

  .error-banner { background: #FDF0ED; color: #B8503F; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }

  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 12.5px; font-weight: 600; color: #5B675F; margin-bottom: 6px; }
  .form-input { width: 100%; padding: 11px 14px; border: 1px solid #E4EDE9; border-radius: 10px; font-size: 13.5px; background: #F6F4EE; outline: none; font-family: 'Hind Siliguri', sans-serif; }
  .form-input:focus { border-color: #1F5D50; }
  .form-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .form-input.input-error { border-color: #B8503F; }
  textarea.form-input { resize: vertical; min-height: 80px; }
  .mono { font-family: 'DM Mono', monospace; }

  .error-text { color: #B8503F; font-size: 11.5px; margin-top: 4px; }

  .upload-box { display: block; border: 2px dashed #E4EDE9; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; background: #F6F4EE; margin-bottom: 8px; }
  .upload-box.has-image { padding: 0; border-style: solid; overflow: hidden; }
  .upload-preview { width: 100%; height: 150px; object-fit: cover; display: block; }
  .upload-placeholder { color: #5B675F; font-size: 12.5px; }
  .upload-hint { font-size: 11px; color: #5B675F; margin-top: 4px; }

  .checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #5B675F; margin: 10px 0 0; }
  .checkbox-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: #1F5D50; cursor: pointer; }

  .submit-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: #1F5D50; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .submit-btn:hover { background: #153F36; }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  /* .spin-icon { animation: spin 1s linear infinite; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .toast { position: fixed; bottom: 24px; right: 24px; background: #1F5D50; color: white; padding: 12px 20px; border-radius: 10px; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; animation: slideUp 0.3s ease; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

  @media (max-width: 768px) {
    .form-card { padding: 16px; }
  }
</style>