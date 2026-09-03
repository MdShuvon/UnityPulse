<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, CheckCircle2, XCircle, Leaf, User } from 'lucide-svelte';

  let isLoading = $state(true);
  let isVerifying = $state(false);
  let paymentStatus = $state<'verifying' | 'success' | 'failed'>('verifying');
  let paymentId = $state('');
  let amount = $state(0);
  let isFree = $state(false);
  let user = $state<any>(null);

  async function checkAuth() {
    try {
      const res = await fetch('http://localhost:3001/auth/me', { credentials: 'include' });
      if (res.ok) user = await res.json();
    } catch (err) { console.error(err); }
  }

  async function verifyPayment() {
    if (!paymentId) return;
    
    isVerifying = true;
    
    // Mock payment verify — call backend
    try {
      const res = await fetch('http://localhost:3001/career/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          paymentId,
          gatewayTrxId: `MOCK-${Date.now()}`,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.verified) {
        paymentStatus = 'success';
      } else {
        paymentStatus = 'failed';
      }
    } catch (err) {
      paymentStatus = 'failed';
    } finally {
      isVerifying = false;
      isLoading = false;
    }
  }

  onMount(() => {
    checkAuth();
    
    // URL params parse
    const params = new URLSearchParams(window.location.search);
    paymentId = params.get('paymentId') || '';
    amount = Number(params.get('amount')) || 0;
    isFree = params.get('free') === 'true';
    
    if (isFree) {
      paymentStatus = 'success';
      isLoading = false;
    } else if (paymentId) {
      // Auto-verify after 1 second (simulate IPN wait)
      setTimeout(() => verifyPayment(), 1000);
    } else {
      isLoading = false;
      paymentStatus = 'failed';
    }
  });
</script>

<div class="status-page">

  <main class="main-content">
    {#if paymentStatus === 'verifying'}
      <div class="status-card">
        <div class="spinner"></div>
        <h2 class="status-title">পেমেন্ট নিশ্চিত করা হচ্ছে...</h2>
        <p class="status-body bangla">দয়া করে এই পেজ বন্ধ করবেন না, কয়েক সেকেন্ড সময় লাগতে পারে।</p>
      </div>
    {:else if paymentStatus === 'success'}
      <div class="status-card success-card">
        <div class="success-icon"><CheckCircle2 size={32} color="white" /></div>
        <h2 class="status-title">আবেদন সফলভাবে জমা হয়েছে!</h2>
        <p class="status-body bangla">
          {#if amount > 0}
            আপনার পেমেন্ট ৳{amount} সফলভাবে গ্রহণ করা হয়েছে।
          {/if}
          আপনার আবেদন পর্যালোচনা করা হবে।
        </p>
        <div class="status-actions">
          <button class="btn btn-primary" onclick={() => goto('/career')}>আরও জব দেখুন</button>
          <button class="btn btn-secondary" onclick={() => goto('/profile')}>প্রোফাইলে যান</button>
        </div>
      </div>
    {:else}
      <div class="status-card failed-card">
        <div class="failed-icon"><XCircle size={32} color="white" /></div>
        <h2 class="status-title">পেমেন্ট ব্যর্থ হয়েছে</h2>
        <p class="status-body bangla">দুঃখিত, আপনার পেমেন্ট সম্পন্ন হয়নি। আবার চেষ্টা করুন।</p>
        <div class="status-actions">
          <button class="btn btn-primary" onclick={() => goto('/career')}>আবার চেষ্টা করুন</button>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&family=Hind+Siliguri:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  .status-page { min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #F6F4EE; color: #16231F; }
  .bangla { font-family: 'Hind Siliguri', sans-serif; }
  

  .main-content { max-width: 480px; margin: 0 auto; padding: 2rem 1rem; }
  .status-card { text-align: center; padding: 40px 20px; background: white; border: 1px solid #E4EDE9; border-radius: 16px; }
  
  .spinner { width: 36px; height: 36px; border: 3px solid #E4EDE9; border-top-color: #1F5D50; border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  
  .success-icon, .failed-icon { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
  .success-icon { background: #1F5D50; }
  .failed-icon { background: #B8503F; }
  
  .status-title { font-family: 'Baloo Da 2', sans-serif; font-size: 18px; font-weight: 700; color: #153F36; }
  .status-body { font-size: 13.5px; color: #5B675F; margin-top: 8px; }
  
  .status-actions { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
  .btn { font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 500; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer; }
  .btn-primary { background: #1F5D50; color: white; }
  .btn-primary:hover { background: #153F36; }
  .btn-secondary { background: white; color: #1F5D50; border: 1px solid #1F5D50; }

</style>