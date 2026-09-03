<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, PlusCircle } from 'lucide-svelte';

  let isSubmitting = $state(false);
  let formError = $state('');
  let successMessage = $state('');
  let isEditMode = $state(false);
  let editJobId = $state('');
  
  let formData = $state({
    title: '',
    department: '',
    location: '',
    jobType: 'full-time',
    description: '',
    requirements: '',
    experience: '',
    applicationFee: 0,
    deadline: '',
  });

  async function fetchJobForEdit(jobId: string) {
    try {
      const res = await fetch(`http://localhost:3001/career/jobs/${jobId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const job = await res.json();
        formData = {
          title: job.title || '',
          department: job.department || '',
          location: job.location || '',
          jobType: job.jobType || 'full-time',
          description: job.description || '',
          requirements: job.requirements || '',
          experience: job.experience || '',
          applicationFee: job.applicationFee || 0,
          deadline: job.deadline ? job.deadline.split('T')[0] : '',
        };
      }
    } catch (err) { console.error(err); }
  }

  async function submitJob() {
    if (!formData.title.trim()) { formError = 'Title দিন'; return; }
    if (!formData.department.trim()) { formError = 'Department দিন'; return; }
    if (!formData.location.trim()) { formError = 'Location দিন'; return; }
    if (!formData.description.trim()) { formError = 'Description দিন'; return; }
    if (!formData.requirements.trim()) { formError = 'Requirements দিন'; return; }
    
    isSubmitting = true;
    formError = '';
    successMessage = '';
    
    try {
      if (isEditMode && editJobId) {
        const res = await fetch(`http://localhost:3001/admin/career/jobs/${editJobId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            deadline: formData.deadline || undefined,
          }),
        });
        
        if (res.ok) {
          successMessage = 'Job updated successfully';
          setTimeout(() => goto('/admin/career/jobs'), 1500);
        } else {
          const data = await res.json();
          formError = data.error || 'Update failed';
        }
      } else {
        const res = await fetch('http://localhost:3001/admin/career/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...formData,
            applicationFee: Number(formData.applicationFee) || 0,
            deadline: formData.deadline || undefined,
          }),
        });
        
        if (res.ok) {
          successMessage = 'Job created successfully';
          formData = {
            title: '', department: '', location: '', jobType: 'full-time',
            description: '', requirements: '', experience: '', applicationFee: 0, deadline: '',
          };
          setTimeout(() => goto('/admin/career/jobs'), 1500);
        } else {
          const data = await res.json();
          formError = data.error || 'Create failed';
        }
      }
    } catch (err) {
      formError = 'Server error';
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
      isEditMode = true;
      editJobId = editId;
      fetchJobForEdit(editId);
    }
  });
</script>

<div class="admin-create-page">
  <h1 class="page-title">{isEditMode ? 'Edit Job' : 'নতুন Job Posting'}</h1>
  <p class="page-sub bangla">{isEditMode ? 'Job তথ্য আপডেট করুন' : 'নতুন চাকরির বিজ্ঞাপন তৈরি করুন'}</p>

  <div class="form-card">
    <div class="form-group">
      <label class="form-label" for = "job-title">Job Title *</label>
      <input id="job-title" class="form-input bangla" bind:value={formData.title} placeholder="কমিউনিটি আউটরিচ কো-অর্ডিনেটর" />
    </div>

    <div class="form-row">
      <div class="form-group half">
        <label class="form-label" for="job-department">Department *</label>
        <input id="job-department" class="form-input bangla" bind:value={formData.department} placeholder="Community" />
      </div>
      <div class="form-group half">
        <label class="form-label" for="job-location">Location *</label>
        <input id="job-location" class="form-input bangla" bind:value={formData.location} placeholder="Cox's Bazar" />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group half">
        <label class="form-label" for="job-type">Job Type</label>
        <select id="job-type" class="form-input" bind:value={formData.jobType}>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="on-site">On-site</option>
        </select>
      </div>
      <div class="form-group half">
        <label class="form-label" for="job-experience">Experience</label>
        <input id="job-experience" class="form-input bangla" bind:value={formData.experience} placeholder="2+ বছর" />
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="job-description">Description *</label>
      <textarea id="job-description" class="form-input bangla" rows="4" bind:value={formData.description} placeholder="চাকরির বিবরণ..."></textarea>
    </div>

    <div class="form-group">
      <label class="form-label" for="job-requirements">Requirements *</label>
      <textarea id="job-requirements" class="form-input bangla" rows="3" bind:value={formData.requirements} placeholder="প্রয়োজনীয় দক্ষতা..."></textarea>
    </div>

    <div class="form-row">
      <div class="form-group half">
        <label class="form-label" for="job-fee">Application Fee (৳)</label>
        <input id="job-fee" type="number" class="form-input" bind:value={formData.applicationFee} min="0" placeholder="0" />
      </div>
      <div class="form-group half">
        <label class="form-label" for="job-deadline">Deadline</label>
        <input id="job-deadline" type="date" class="form-input" bind:value={formData.deadline} />
      </div>
    </div>

    {#if formError}
      <div class="error-box bangla">{formError}</div>
    {/if}

    {#if successMessage}
      <div class="success-box bangla">{successMessage}</div>
    {/if}

    <button class="submit-btn" onclick={submitJob} disabled={isSubmitting}>
      {#if isSubmitting}
        <Loader2 size={18} class="spin-icon" /> প্রসেসিং...
      {:else}
        <PlusCircle size={18} /> {isEditMode ? 'Update Job' : 'Job তৈরি করুন'}
      {/if}
    </button>
  </div>
</div>

<style>
  .admin-create-page { min-height: 100vh; }
  .page-title { font-family: 'Baloo Da 2', sans-serif; font-size: 22px; font-weight: 700; color: #153F36; }
  .page-sub { font-size: 13px; color: #5B675F; margin-top: 4px; }
  
  .form-card { background: white; border: 1px solid #E4EDE9; border-radius: 16px; padding: 24px; margin-top: 20px; }
  .form-group { margin-bottom: 16px; }
  .form-row { display: flex; gap: 12px; }
  .half { flex: 1; }
  .form-label { display: block; font-size: 13px; font-weight: 600; color: #5B675F; margin-bottom: 6px; font-family: 'Hind Siliguri', sans-serif; }
  .form-input { width: 100%; padding: 10px 14px; border: 1px solid #E4EDE9; border-radius: 10px; font-family: 'Hind Siliguri', sans-serif; font-size: 14px; background: #F6F4EE; outline: none; }
  .form-input:focus { border-color: #1F5D50; box-shadow: 0 0 0 3px rgba(31,93,80,0.1); }
  textarea.form-input { resize: vertical; min-height: 80px; }
  
  .error-box { background: #FDF0ED; color: #B8503F; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-top: 12px; }
  .success-box { background: #EAF4EE; color: #1F6E45; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-top: 12px; }
  
  .submit-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: #1F5D50; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .submit-btn:hover { background: #153F36; }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  /* .spin-icon { animation: spin 1s linear infinite; } */
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  
  @media (max-width: 768px) {
    .form-row { flex-direction: column; gap: 0; }
  }
</style>