<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, PlusCircle, Save } from 'lucide-svelte';

  let title = $state('');
  let description = $state('');
  let proofType = $state<'PHOTO' | 'TEXT' | 'BOTH'>('PHOTO');
  let pointsValue = $state<number>(0);
  let deadline = $state('');
  let noDeadline = $state(false);
  let isEditMode = $state(false);
  let taskId = $state<string | null>(null);
  let isSubmitting = $state(false);
  let errors = $state<{ [field: string]: string }>({});
  let formError = $state('');
  let showToast = $state(false);
  let toastMessage = $state('');

  const proofTypes = [
    { value: 'PHOTO', label: 'Photo Proof' },
    { value: 'TEXT', label: 'Text Proof' },
    { value: 'BOTH', label: 'Both' },
  ];

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

    if (pointsValue === null || pointsValue === undefined) {
      newErrors.pointsValue = 'পয়েন্ট দিন';
    } else if (!Number.isInteger(pointsValue)) {
      newErrors.pointsValue = 'পূর্ণসংখ্যা দিন';
    } else if (pointsValue < 1 || pointsValue > 500) {
      newErrors.pointsValue = '১ থেকে ৫০০-এর মধ্যে একটি সংখ্যা দিন';
    }

    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  async function fetchTaskForEdit(id: string) {
    try {
      const res = await fetch(`http://localhost:3001/admin/tasks`, {
        credentials: 'include',
      });
      if (res.ok) {
        const tasks = await res.json();
        const task = tasks.find((t: any) => t.id === id);
        if (task) {
          title = task.title || '';
          description = task.description || '';
          proofType = task.proofType || 'PHOTO';
          pointsValue = task.pointValue || null;
          if (task.date) {
            deadline = task.date.split('T')[0];
            noDeadline = false;
          } else {
            noDeadline = true;
            deadline = '';
          }
        }
      }
    } catch (err) { console.error(err); }
  }

  async function submitTask() {
    if (!validate() || isSubmitting) return;

    isSubmitting = true;
    formError = '';

    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        proofType,
        pointValue: Number(pointsValue),
        deadline: noDeadline ? null : deadline || null,
      };

      const url = isEditMode && taskId
        ? `http://localhost:3001/admin/tasks/${taskId}`
        : 'http://localhost:3001/admin/tasks';

      const res = await fetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast = true;
        toastMessage = isEditMode ? 'Task আপডেট হয়েছে' : 'Task তৈরি হয়েছে';
        setTimeout(() => goto('/admin/tasks'), 1500);
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
      taskId = id;
      fetchTaskForEdit(id);
    }
  });
</script>

<div class="task-form-page">
  <h1 class="page-title">{isEditMode ? 'Edit Task' : 'নতুন Task'}</h1>
  <p class="page-sub bangla">{isEditMode ? 'Task তথ্য আপডেট করুন' : 'Community task তৈরি করুন'}</p>

  <div class="form-card">
    {#if formError}
      <div class="error-banner bangla">{formError}</div>
    {/if}

    <div class="form-group">
      <label class="form-label" for="task-title">Title *</label>
      <input
        id="task-title"
        class="form-input"
        class:input-error={errors.title}
        bind:value={title}
        placeholder="১০টি চারাগাছ রোপণ করুন"
        maxlength="100"
      />
      {#if errors.title}
        <p class="error-text bangla">{errors.title}</p>
      {/if}
    </div>

    <div class="form-group">
      <label class="form-label" for="task-description">Description *</label>
      <textarea
        id="task-description"
        class="form-input bangla"
        class:input-error={errors.description}
        bind:value={description}
        rows="4"
        placeholder="Task-এর বিস্তারিত বর্ণনা লিখুন..."
      ></textarea>
      {#if errors.description}
        <p class="error-text bangla">{errors.description}</p>
      {/if}
    </div>

    <div class="form-group">
      <span class="form-label">Proof Type</span>
      <div class="segmented-control">
        {#each proofTypes as pt}
          <button
            type="button"
            class="segment-btn"
            class:active={proofType === pt.value}
            onclick={() => proofType = pt.value as 'PHOTO' | 'TEXT' | 'BOTH'}
          >
            {pt.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="task-points">Points Value *</label>
      <input
        id="task-points"
        type="number"
        class="form-input mono"
        class:input-error={errors.pointsValue}
        bind:value={pointsValue}
        placeholder="30"
        min="1"
        max="500"
        inputmode="numeric"
      />
      {#if errors.pointsValue}
        <p class="error-text bangla">{errors.pointsValue}</p>
      {/if}
    </div>

    <div class="form-group">
      <label class="form-label" for="task-deadline">Deadline</label>
      <input
        id="task-deadline"
        type="date"
        class="form-input"
        bind:value={deadline}
        disabled={noDeadline}
      />
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={noDeadline} />
        <span class="bangla">নির্দিষ্ট Deadline নেই</span>
      </label>
    </div>

    <button class="submit-btn" onclick={submitTask} disabled={isSubmitting}>
      {#if isSubmitting}
        <Loader2 size={18} class="spin-icon" /> Processing...
      {:else if isEditMode}
        <Save size={18} /> Update Task
      {:else}
        <PlusCircle size={18} /> Task তৈরি করুন
      {/if}
    </button>
  </div>

  {#if showToast}
    <div class="toast bangla">{toastMessage}</div>
  {/if}
</div>

<style>
  .task-form-page { min-height: 100vh; }
  .page-title { font-family: 'Baloo Da 2', sans-serif; font-size: 22px; font-weight: 700; color: #153F36; }
  .page-sub { font-size: 13px; color: #5B675F; margin-top: 4px; }

  .form-card { background: #FFFFFF; border: 1px solid #E4EDE9; border-radius: 16px; padding: 22px; margin-top: 20px; }

  .error-banner { background: #FDF0ED; color: #B8503F; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }

  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 13px; font-weight: 600; color: #5B675F; margin-bottom: 6px; }
  .form-input { width: 100%; padding: 11px 14px; border: 1px solid #E4EDE9; border-radius: 10px; font-size: 13.5px; background: #F6F4EE; outline: none; font-family: 'Hind Siliguri', sans-serif; }
  .form-input:focus { border-color: #1F5D50; box-shadow: 0 0 0 3px rgba(31,93,80,0.1); }
  .form-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .form-input.input-error { border-color: #B8503F; }
  textarea.form-input { resize: vertical; min-height: 100px; }
  .mono { font-family: 'DM Mono', monospace; }

  .error-text { color: #B8503F; font-size: 11.5px; margin-top: 4px; }

  .segmented-control { display: flex; gap: 0; border: 1px solid #E4EDE9; border-radius: 10px; overflow: hidden; }
  .segment-btn { flex: 1; padding: 10px; font-size: 13px; font-weight: 500; background: white; color: #5B675F; border: none; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
  .segment-btn + .segment-btn { border-left: 1px solid #E4EDE9; }
  .segment-btn.active { background: #1F5D50; color: white; }

  .checkbox-label { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 12.5px; color: #5B675F; cursor: pointer; }
  .checkbox-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: #1F5D50; cursor: pointer; }

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