<!-- src/routes/career/[jobId]/apply/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { 
    Loader2, Leaf, User, ArrowLeft, FileText, 
    Upload, AlertCircle, Lock
  } from 'lucide-svelte';

  let isLoading = $state(true);
  let job = $state<any>(null);
  let error = $state('');
  let user = $state<any>(null);
  let jobId = '';
  let isSubmitting = $state(false);
  let cvFile = $state<File | null>(null);
  let coverLetter = $state('');
  let fullName = $state('');
  let formError = $state('');

  function formatFee(amount: number): string {
    if (!amount || amount === 0) return 'ফ্রি';
    return `৳${amount}`;
  }

  async function fetchJobDetail() {
    try {
      const res = await fetch(`http://localhost:3001/career/jobs/${jobId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        job = await res.json();
      } else {
        error = 'জব পাওয়া যায়নি';
      }
    } catch (err) {
      error = 'জব লোড করতে সমস্যা হয়েছে';
    } finally {
      isLoading = false;
    }
  }

  async function checkAuth() {
    try {
      const res = await fetch('http://localhost:3001/auth/me', { credentials: 'include' });
      if (res.ok) {
        user = await res.json();
        fullName = user.name || '';
      } else {
        goto('/login');
      }
    } catch (err) { console.error(err); }
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      formError = 'শুধু PDF ফাইল আপলোড করা যাবে';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      formError = 'ফাইল সাইজ ৫MB-এর কম হতে হবে';
      return;
    }
    
    cvFile = file;
    formError = '';
  }

  async function submitApplication() {
    if (!cvFile) {
      formError = 'CV আপলোড করুন';
      return;
    }
    if (!fullName.trim()) {
      formError = 'নাম লিখুন';
      return;
    }
    
    isSubmitting = true;
    formError = '';
    
    try {
      const formData = new FormData();
      formData.append('cv', cvFile);
      if (coverLetter.trim()) {
        formData.append('coverLetter', coverLetter);
      }
      
      const res = await fetch(`http://localhost:3001/career/jobs/${jobId}/apply`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Application created, now initiate payment if fee > 0
        if (job.applicationFee > 0) {
          // Start payment
          const paymentRes = await fetch('http://localhost:3001/career/payment/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              applicationId: data.id,
              amount: job.applicationFee,
            }),
          });
          
          const paymentData = await paymentRes.json();
          
          if (paymentRes.ok && paymentData.gatewayUrl) {
            // Redirect to mock payment page
            goto(`/career/${jobId}/apply/status?paymentId=${paymentData.paymentId}&amount=${job.applicationFee}`);
          } else {
            formError = 'পেমেন্ট শুরু করতে সমস্যা হয়েছে';
          }
        } else {
          // Free application - directly success
          goto(`/career/${jobId}/apply/status?free=true`);
        }
      } else {
        formError = data.error || 'আবেদন জমা দিতে সমস্যা হয়েছে';
      }
    } catch (err) {
      formError = 'সার্ভারে সমস্যা হয়েছে';
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    jobId = window.location.pathname.split('/')[2] || '';
    checkAuth();
    fetchJobDetail();
  });
</script>

<div class="apply-page">

  <main class="main-content">
    <button class="back-btn" onclick={() => goto(`/career/${jobId}`)}>
      <ArrowLeft size={16} /> ফিরে যান
    </button>

    {#if isLoading}
      <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>লোড হচ্ছে...</p></div>
    {:else if job}
      <div class="apply-form-card">
        <h1 class="form-title">আবেদন করুন</h1>
        <p class="form-sub bangla">{job.title} · {job.department || 'UnityPulse Foundation'}</p>

        <div class="form-group">
          <label class="form-label" for="full-name">পূর্ণ নাম</label>
          <input id="full-name" class="form-input bangla" bind:value={fullName} placeholder="আপনার নাম" />
        </div>

        <div class="form-group">
          <label class="form-label" for="cv-upload">Resume / CV (PDF)</label>
          <label class="file-upload-box">
            <Upload size={20} />
            <span>{cvFile ? cvFile.name : 'PDF ফাইল আপলোড করুন'}</span>
            <input type="file" accept=".pdf" onchange={handleFileSelect} style="display:none;" />
          </label>
        </div>

        <div class="form-group">
          <label class="form-label" for="cover-letter">Cover Letter (ঐচ্ছিক)</label>
          <textarea class="form-input bangla" id="cover-letter" rows="4" bind:value={coverLetter} placeholder="কেন আপনি এই পদের জন্য উপযুক্ত..."></textarea>
        </div>

        {#if job.applicationFee > 0}
          <div class="fee-box">
            <div class="fee-row">
              <span class="bangla fee-label">আবেদন প্রসেসিং ফি</span>
              <span class="fee-amount mono">{formatFee(job.applicationFee)}</span>
            </div>
            <div class="fee-note bangla">
              <Lock size={12} /> এই ফি প্ল্যাটফর্ম পরিচালনায় ব্যবহৃত হয়। ফি <strong>অ-ফেরতযোগ্য</strong>।
            </div>
          </div>
        {/if}

        {#if formError}
          <div class="error-box">
            <AlertCircle size={16} /> {formError}
          </div>
        {/if}

        <button 
          class="btn btn-primary submit-btn" 
          onclick={submitApplication}
          disabled={isSubmitting}
        >
          {#if isSubmitting}
            <Loader2 size={18} class="spin-anim" /> জমা হচ্ছে...
          {:else if job.applicationFee > 0}
            ৳{job.applicationFee} পে করে আবেদন সম্পন্ন করুন
          {:else}
            ফ্রিতে আবেদন জমা দিন
          {/if}
        </button>
      </div>
    {/if}
  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&family=Hind+Siliguri:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  .apply-page { min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #F6F4EE; color: #16231F; }
  .bangla { font-family: 'Hind Siliguri', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }
  

  .main-content { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem; }
  .back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: #5B675F; font-size: 14px; cursor: pointer; padding: 8px 0; margin-bottom: 12px; }
  .back-btn:hover { color: #1F5D50; }
  

  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .loading-state { text-align: center; padding: 3rem; color: #5B675F; }
  
  .apply-form-card { background: white; border: 1px solid #E4EDE9; border-radius: 16px; padding: 24px; }
  .form-title { font-family: 'Baloo Da 2', sans-serif; font-size: 20px; font-weight: 700; color: #153F36; }
  .form-sub { font-size: 13px; color: #5B675F; margin-top: 4px; }
  
  .form-group { margin-top: 20px; }
  .form-label { display: block; font-size: 13px; font-weight: 600; color: #5B675F; margin-bottom: 6px; font-family: 'Hind Siliguri', sans-serif; }
  .form-input { width: 100%; padding: 11px 14px; border: 1px solid #E4EDE9; border-radius: 10px; font-family: 'Hind Siliguri', sans-serif; font-size: 14px; background: #F6F4EE; outline: none; }
  .form-input:focus { border-color: #1F5D50; box-shadow: 0 0 0 3px rgba(31,93,80,0.1); }
  textarea.form-input { resize: vertical; min-height: 90px; }
  
  .file-upload-box { display: flex; align-items: center; gap: 10px; padding: 14px; border: 2px dashed #E4EDE9; border-radius: 10px; cursor: pointer; color: #5B675F; font-family: 'Hind Siliguri', sans-serif; font-size: 13px; transition: all 0.2s; }
  .file-upload-box:hover { border-color: #1F5D50; color: #1F5D50; }
  
  .fee-box { background: #FBEBD0; border: 1px solid #F0D5A0; border-radius: 10px; padding: 14px 16px; margin-top: 20px; }
  .fee-row { display: flex; justify-content: space-between; align-items: center; }
  .fee-label { font-size: 13px; font-weight: 600; color: #8A5A17; }
  .fee-amount { font-size: 18px; font-weight: 700; color: #8A5A17; }
  .fee-note { display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: #8A5A17; margin-top: 6px; }
  
  .error-box { display: flex; align-items: center; gap: 8px; background: #FDF0ED; border: 1px solid #F5C6CB; color: #B8503F; border-radius: 10px; padding: 12px; margin-top: 16px; font-size: 13px; font-family: 'Hind Siliguri', sans-serif; }
  
  .submit-btn { width: 100%; padding: 12px; margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .btn { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 10px; border: none; cursor: pointer; }
  .btn-primary { background: #1F5D50; color: white; }
  .btn-primary:hover { background: #153F36; }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  

</style>