<!-- src/routes/tasks/[taskId]/submit/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    Loader2,
    Camera,
    FileText,
    ArrowLeft,
    Upload,
    AlertCircle,
    CheckCircle2,
  } from "lucide-svelte";

  let isLoading = $state(true);
  let task = $state<any>(null);
  let error = $state("");
  let user = $state<any>(null);
  let taskId = "";
  let isSubmitting = $state(false);
  let photoFiles = $state<File[]>([]);
  let textProof = $state("");
  let formError = $state("");
  let successMessage = $state("");

  async function fetchTaskDetail() {
    try {
      const res = await fetch(`http://localhost:3001/tasks/${taskId}`, {
        credentials: "include",
      });
      if (res.ok) {
        task = await res.json();
        if (
          task.mySubmission?.status === "PENDING" ||
          task.mySubmission?.status === "APPROVED"
        ) {
          goto(`/tasks/${taskId}`);
        }
      } else {
        error = "Task পাওয়া যায়নি";
      }
    } catch (err) {
      error = "Task লোড করতে সমস্যা হয়েছে";
    } finally {
      isLoading = false;
    }
  }

  async function checkAuth() {
    try {
      const res = await fetch("http://localhost:3001/auth/me", {
        credentials: "include",
      });
      if (res.ok) {
        user = await res.json();
      } else {
        goto(`/login?redirect=/tasks/${taskId}/submit`);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    for (const file of newFiles) {
      if (!file.type.startsWith("image/")) {
        formError = "শুধু ছবি ফাইল আপলোড করা যাবে";
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        formError = "প্রতিটি ছবি ৫MB-এর কম হতে হবে";
        continue;
      }
      if (photoFiles.length < 5) {
        photoFiles = [...photoFiles, file];
      } else {
        formError = "সর্বোচ্চ ৫টা ছবি দেওয়া যাবে";
        break;
      }
    }
    target.value = "";
  }

  function removePhoto(index: number) {
    photoFiles = photoFiles.filter((_, i) => i !== index);
  }

  async function submitTask() {
    formError = "";
    successMessage = "";

    // Validate based on proof type
    if (task.proofType === "PHOTO" || task.proofType === "BOTH") {
      if (photoFiles.length === 0) {
        formError = "কমপক্ষে ১টা ছবি আপলোড করুন";
        return;
      }
    }
    if (task.proofType === "TEXT" || task.proofType === "BOTH") {
      if (!textProof.trim()) {
        formError = "প্রমাণ লিখুন";
        return;
      }
    }

    isSubmitting = true;

    try {
      const formData = new FormData();

      if (task.proofType === "PHOTO" || task.proofType === "BOTH") {
        for (const file of photoFiles) {
          formData.append("photos", file);
        }
      }

      if (task.proofType === "TEXT" || task.proofType === "BOTH") {
        formData.append("textProof", textProof);
      }

      const res = await fetch(`http://localhost:3001/tasks/${taskId}/submit`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        successMessage = "আপনার কাজ জমা হয়েছে! Review-এর অপেক্ষায় আছেন।";
        setTimeout(() => {
          goto("/tasks/mine");
        }, 2000);
      } else {
        formError = data.error || "জমা দিতে সমস্যা হয়েছে";
      }
    } catch (err) {
      formError = "সার্ভারে সমস্যা হয়েছে";
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    taskId = window.location.pathname.split("/")[2] || "";
    checkAuth();
    fetchTaskDetail();
  });
</script>

<div class="submit-page">
  <main class="main-content">
    <button class="back-btn" onclick={() => goto(`/tasks/${taskId}`)}>
      <ArrowLeft size={16} /> ফিরে যান
    </button>

    {#if isLoading}
      <div class="loading-state">
        <Loader2 size={48} class="spin-anim" />
        <p>লোড হচ্ছে...</p>
      </div>
    {:else if error}
      <div class="loading-state"><p>{error}</p></div>
    {:else if task}
      <div class="submit-form-card">
        <h1 class="form-title">কাজ জমা দিন</h1>
        <p class="form-sub bangla">{task.title} · +{task.pointValue} pts</p>

        {#if task.proofType === "PHOTO" || task.proofType === "BOTH"}
          <div class="form-group">
            <label class="form-label" for="photos"
              >ছবি আপলোড করুন (সর্বোচ্চ ৫টা)</label
            >
            <label class="file-upload-box">
              <Upload size={20} />
              <span>ছবি নির্বাচন করুন</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onchange={handleFileSelect}
                style="display:none;"
              />
            </label>

            {#if photoFiles.length > 0}
              <div class="photo-preview-list">
                {#each photoFiles as file, i}
                  <div class="photo-preview">
                    <img src={URL.createObjectURL(file)} alt="Preview" />
                    <button class="remove-btn" onclick={() => removePhoto(i)}
                      >×</button
                    >
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        {#if task.proofType === "TEXT" || task.proofType === "BOTH"}
          <div class="form-group">
            <label class="form-label" for="text-proof">প্রমাণ লিখুন</label>
            <textarea
              class="form-input bangla"
              id="text-proof"
              rows="4"
              bind:value={textProof}
              placeholder="আপনার কাজের বর্ণনা..."
            ></textarea>
          </div>
        {/if}

        {#if formError}
          <div class="error-box">
            <AlertCircle size={16} />
            {formError}
          </div>
        {/if}

        {#if successMessage}
          <div class="success-box">
            <CheckCircle2 size={16} />
            {successMessage}
          </div>
        {/if}

        <button
          class="btn btn-primary submit-btn"
          onclick={submitTask}
          disabled={isSubmitting}
        >
          {#if isSubmitting}
            <Loader2 size={18} class="spin-anim" /> জমা হচ্ছে...
          {:else}
            জমা দিন
          {/if}
        </button>
      </div>
    {/if}
  </main>
</div>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&family=Hind+Siliguri:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap");
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  .submit-page {
    min-height: 100vh;
    font-family: "DM Sans", sans-serif;
    background: #f6f4ee;
    color: #16231f;
  }
  .bangla {
    font-family: "Hind Siliguri", sans-serif;
  }
  /* .mono { font-family: 'DM Mono', monospace; } */

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

  .submit-form-card {
    background: white;
    border: 1px solid #e4ede9;
    border-radius: 16px;
    padding: 24px;
  }
  .form-title {
    font-family: "Baloo Da 2", sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: #153f36;
  }
  .form-sub {
    font-size: 13px;
    color: #5b675f;
    margin-top: 4px;
  }

  .form-group {
    margin-top: 20px;
  }
  .form-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #5b675f;
    margin-bottom: 6px;
    font-family: "Hind Siliguri", sans-serif;
  }
  .form-input {
    width: 100%;
    padding: 11px 14px;
    border: 1px solid #e4ede9;
    border-radius: 10px;
    font-family: "Hind Siliguri", sans-serif;
    font-size: 14px;
    background: #f6f4ee;
    outline: none;
  }
  .form-input:focus {
    border-color: #1f5d50;
    box-shadow: 0 0 0 3px rgba(31, 93, 80, 0.1);
  }
  textarea.form-input {
    resize: vertical;
    min-height: 90px;
  }

  .file-upload-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px;
    border: 2px dashed #e4ede9;
    border-radius: 10px;
    cursor: pointer;
    color: #5b675f;
    font-family: "Hind Siliguri", sans-serif;
    font-size: 13px;
    transition: all 0.2s;
  }
  .file-upload-box:hover {
    border-color: #1f5d50;
    color: #1f5d50;
  }

  .photo-preview-list {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    flex-wrap: wrap;
  }
  .photo-preview {
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: 8px;
    overflow: hidden;
  }
  .photo-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .remove-btn {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    border: none;
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
  }

  .error-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fdf0ed;
    border: 1px solid #f5c6cb;
    color: #b8503f;
    border-radius: 10px;
    padding: 12px;
    margin-top: 16px;
    font-size: 13px;
    font-family: "Hind Siliguri", sans-serif;
  }
  .success-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #e8f5e9;
    border: 1px solid #c8e6c9;
    color: #2e7d32;
    border-radius: 10px;
    padding: 12px;
    margin-top: 16px;
    font-size: 13px;
    font-family: "Hind Siliguri", sans-serif;
  }

  .submit-btn {
    width: 100%;
    padding: 12px;
    margin-top: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .btn {
    font-family: "DM Sans", sans-serif;
    font-size: 14px;
    font-weight: 600;
    padding: 12px 24px;
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
  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
