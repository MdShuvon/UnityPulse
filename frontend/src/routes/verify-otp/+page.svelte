<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  
  // ─────────────────────────────────────
  // 🎯 Svelte 5 Reactive State ($state)
  // ─────────────────────────────────────
  let phone = $state('');
  let purpose = $state<'register' | 'reset'>('register');
  let otp = $state(['', '', '', '', '', '']);
  let error = $state('');
  let successMessage = $state('');
  let loading = $state(false);
  let countdown = $state(30);
  let canResend = $state(false);
  let resendLoading = $state(false);
  
  // ─────────────────────────────────────
  // 🔄 Derived Values ($derived)
  // ─────────────────────────────────────
  const purposeText = $derived(purpose === 'register' ? 'রেজিস্ট্রেশন' : 'পাসওয়ার্ড রিসেট');
  
  // ─────────────────────────────────────
  // ⏱️ Timer Function (Define BEFORE use)
  // ─────────────────────────────────────
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  
  const startResendTimer = () => {
    if (timerInterval) clearInterval(timerInterval);
    countdown = 30;
    canResend = false;
    
    timerInterval = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        canResend = true;
      }
    }, 1000);
  };
  
  // ─────────────────────────────────────
// 🔍 Initialize on Mount (Browser Only)
// ─────────────────────────────────────
$effect(() => {
  if (browser) {
    const params = new URLSearchParams(window.location.search);
    const phoneParam = params.get('phone');
    if (phoneParam) phone = phoneParam;
    
    const p = params.get('purpose');
    if (p === 'reset') purpose = 'reset';
    
    // Now this works perfectly inside $effect
    if (!phone) {
      error = 'ফোন নম্বর পাওয়া যায়নি। অনুগ্রহ করে আবার রেজিস্ট্রেশন করুন।';
    }
    
    startResendTimer();
    
    setTimeout(() => {
      const firstInput = document.getElementById('otp-0') as HTMLInputElement;
      firstInput?.focus();
    }, 100);
  }
});
  // ─────────────────────────────────────
  // 🎯 OTP Input Handlers
  // ─────────────────────────────────────
  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    otp[index] = value;
    
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }
    
    if (error) error = '';
    
    if (otp.every(digit => digit !== '') && !loading) {
      handleSubmit();
    }
  };
  
  const handleKeyDown = (index: number, e: KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  };
  
  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);
    
    if (digits.length === 6) {
      otp = digits.split('');
      
      setTimeout(() => {
        const lastInput = document.getElementById('otp-5') as HTMLInputElement;
        lastInput?.focus();
      }, 0);
      
      if (!loading) {
        setTimeout(() => handleSubmit(), 100);
      }
    }
  };
  
  // ─────────────────────────────────────
  // 🚀 Submit Handler - ✅ FIXED: Capture $state values locally
  // ─────────────────────────────────────
  const handleSubmit = async () => {
    // ✅ Capture current $state values to avoid closure warnings
    const currentPhone = phone;
    const currentPurpose = purpose;
    const currentOtp = [...otp];
    const otpValue = currentOtp.join('');
    
    if (otpValue.length !== 6) {
      error = '৬ ডিজিটের OTP দিন';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      const response = await fetch('http://localhost:3001/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: currentPhone,      // ✅ Use captured value
          otp: otpValue,            // ✅ Use captured value
          purpose: currentPurpose   // ✅ Use captured value
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || result.message || 'OTP ভেরিফিকেশন ব্যর্থ হয়েছে');
      }
      
      // ✅ Success - Redirect based on purpose
      if (currentPurpose === 'register') {
        successMessage = '✅ আপনার অ্যাকাউন্ট ভেরিফাইড হয়েছে! এখন লগইন করুন।';
        setTimeout(async () => {
          await goto('/login?message=' + encodeURIComponent('অ্যাকাউন্ট ভেরিফাইড হয়েছে! লগইন করুন'));
        }, 1500);
      } else if (currentPurpose === 'reset') {
        successMessage = '✅ OTP ভেরিফাইড হয়েছে! এখন নতুন পাসওয়ার্ড দিন।';
        setTimeout(async () => {
          await goto('/auth/reset-password?phone=' + encodeURIComponent(currentPhone));
        }, 1500);
      }
      
    } catch (err: any) {
      error = err.message || 'OTP ভুল অথবা মেয়াদ শেষ হয়েছে';
      otp = ['', '', '', '', '', ''];
      setTimeout(() => {
        const firstInput = document.getElementById('otp-0') as HTMLInputElement;
        firstInput?.focus();
      }, 100);
    } finally {
      loading = false;
    }
  };
  
  // ─────────────────────────────────────
  // 🔄 Resend OTP Handler - ✅ FIXED: Capture $state values locally
  // ─────────────────────────────────────
  const handleResend = async () => {
    if (!canResend || resendLoading) return;
    
    // ✅ Fix: capture in closure
    const currentPhone = phone;
    const currentPurpose = purpose;
    
    resendLoading = true;
    error = '';
    
    try {
      const response = await fetch('http://localhost:3001/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: currentPhone,      // ✅ Use captured value
          purpose: currentPurpose   // ✅ Use captured value
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || result.message || 'OTP পাঠানো যায়নি');
      }
      
      successMessage = '📱 নতুন OTP পাঠানো হয়েছে';
      otp = ['', '', '', '', '', ''];
      startResendTimer();
      
      setTimeout(() => {
        successMessage = '';
      }, 3000);
      
    } catch (err: any) {
      error = err.message || 'OTP পাঠানো যায়নি। আবার চেষ্টা করুন।';
    } finally {
      resendLoading = false;
    }
  };
  
  // ─────────────────────────────────────
  // 🔗 Navigation Helper
  // ─────────────────────────────────────
  const navigate = (path: string) => {
    goto(path);
  };
  
  const getBackPath = () => {
    const currentPurpose = purpose; // Capture locally
    return currentPurpose === 'register' ? '/register' : '/auth/forgot-password';
  };
</script>

<!-- 🎨 Template (No changes needed - same as before) -->
<div class="otp-wrapper">
  <div class="otp-container">
    
    <div class="otp-header">
      <div class="icon-wrapper">
        <span class="icon">📱</span>
      </div>
      <h1>OTP ভেরিফিকেশন</h1>
      <p class="subtitle">
        <strong>{phone}</strong> নম্বরে {purposeText} এর জন্য ৬ ডিজিটের কোড পাঠানো হয়েছে
      </p>
    </div>
    
    {#if error}
      <div class="alert alert-error" role="alert">
        <span class="alert-icon">!</span>
        {error}
      </div>
    {/if}
    
    {#if successMessage}
      <div class="alert alert-success" role="alert">
        <span class="alert-icon">✓</span>
        {successMessage}
      </div>
    {/if}
    
    <div class="otp-inputs" onpaste={handlePaste}>
      {#each Array(6) as _, index}
        <input
          id="otp-{index}"
          type="text"
          inputmode="numeric"
          maxlength="1"
          bind:value={otp[index]}
          oninput={(e) => handleOtpInput(index, (e.currentTarget as HTMLInputElement).value)}
          onkeydown={(e) => handleKeyDown(index, e)}
          class="otp-input {error ? 'input-error' : ''}"
          disabled={loading || resendLoading}
          autocomplete="one-time-code"
        />
      {/each}
    </div>
    
    <div class="instructions">
      <p>📌 কোডটি ৫ মিনিটের জন্য বৈধ</p>
      <p>📌 SMS চেক করুন</p>
      <p>📌 কোড কাউকে দেবেন না</p>
    </div>
    
    <div class="otp-actions">
      <button 
        type="button" 
        class="btn btn-primary btn-block" 
        onclick={handleSubmit}
        disabled={loading || otp.some(d => d === '') || resendLoading}
      >
        {#if loading}
          <span class="spinner"></span>
          <span>ভেরিফাই হচ্ছে...</span>
        {:else}
          <span>✅ ভেরিফাই করুন</span>
        {/if}
      </button>
      
      <button
        type="button"
        class="btn btn-outline btn-block"
        onclick={handleResend}
        disabled={!canResend || resendLoading}
      >
        {#if resendLoading}
          <span class="spinner spinner-small"></span>
          <span>পাঠানো হচ্ছে...</span>
        {:else if canResend}
          <span>🔄 নতুন কোড পাঠান</span>
        {:else}
          <span>🔄 আবার পাঠান ({countdown}s)</span>
        {/if}
      </button>
    </div>
    
    <div class="otp-footer">
      <p>
        ভুল নম্বর? 
        <a 
          href={getBackPath()} 
          onclick={(e) => { e.preventDefault(); navigate(getBackPath()); }}
          class="link-primary"
        >
          ফিরে যান
        </a>
      </p>
    </div>
    
    <div class="security-note">
      <span>🛡️</span>
      <p>আপনার নিরাপত্তা আমাদের অগ্রাধিকার</p>
    </div>
    
  </div>
</div>

<!-- 🎨 Styles (Same as before) -->
<style>
  :global(:root) {
    --color-primary: #4f46e5;
    --color-primary-hover: #4338ca;
    --color-primary-light: #eef2ff;
    --color-bg: #f8fafc;
    --color-surface: #ffffff;
    --color-text: #1e293b;
    --color-text-muted: #64748b;
    --color-border: #e2e8f0;
    --color-error: #ef4444;
    --color-error-bg: #fef2f2;
    --color-success: #22c55e;
    --color-success-bg: #f0fdf4;
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --font-sans: 'Segoe UI', 'SolaimanLipi', 'Kalpurush', system-ui, sans-serif;
    --text-sm: 0.875rem;
    --text-base: 1rem;
    --text-lg: 1.125rem;
    --text-xl: 1.5rem;
    --text-2xl: 1.875rem;
    --radius-sm: 0.375rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
    --transition: all 0.2s ease-in-out;
  }
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  .otp-wrapper {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    padding: var(--space-md);
    font-family: var(--font-sans);
  }
  
  .otp-container {
    width: 100%;
    max-width: 480px;
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    padding: var(--space-xl);
    animation: slideUp 0.3s ease-out;
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .otp-header { text-align: center; margin-bottom: var(--space-lg); }
  
  .icon-wrapper {
    width: 80px;
    height: 80px;
    margin: 0 auto var(--space-md);
    background: var(--color-primary-light);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  .icon { font-size: 2.5rem; }
  .otp-header h1 { font-size: var(--text-xl); font-weight: 600; color: var(--color-text); margin-bottom: var(--space-sm); }
  .subtitle { color: var(--color-text-muted); font-size: var(--text-sm); line-height: 1.6; }
  .subtitle strong { color: var(--color-primary); font-weight: 600; }
  
  .alert {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
    font-size: var(--text-sm);
    animation: shake 0.5s ease-in-out;
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  
  .alert-icon { font-weight: 600; flex-shrink: 0; }
  .alert-error { background: var(--color-error-bg); color: #991b1b; border: 1px solid #fecaca; }
  .alert-success { background: var(--color-success-bg); color: #166534; border: 1px solid #bbf7d0; }
  
  .otp-inputs {
    display: flex;
    justify-content: center;
    gap: var(--space-sm);
    margin: var(--space-lg) 0;
    flex-wrap: wrap;
  }
  
  .otp-input {
    width: 50px;
    height: 60px;
    text-align: center;
    font-size: var(--text-2xl);
    font-weight: 600;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    transition: var(--transition);
  }
  
  .otp-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 4px var(--color-primary-light);
    transform: translateY(-2px);
  }
  
  .otp-input:disabled { background: var(--color-bg); cursor: not-allowed; opacity: 0.6; }
  .otp-input.input-error { border-color: var(--color-error); background: var(--color-error-bg); animation: shake 0.5s ease-in-out; }
  
  @media (max-width: 480px) {
    .otp-input { width: 42px; height: 52px; font-size: var(--text-xl); }
  }
  
  .instructions {
    background: var(--color-bg);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-lg);
  }
  
  .instructions p {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: var(--space-xs) 0;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }
  
  .otp-actions { display: flex; flex-direction: column; gap: var(--space-md); margin-bottom: var(--space-lg); }
  
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-md) var(--space-lg);
    font-size: var(--text-base);
    font-weight: 500;
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition);
    min-height: 48px;
  }
  
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-primary { background: var(--color-primary); color: white; border-color: var(--color-primary); }
  .btn-primary:hover:not(:disabled) { background: var(--color-primary-hover); border-color: var(--color-primary-hover); }
  .btn-outline { background: transparent; color: var(--color-primary); border-color: var(--color-primary); }
  .btn-outline:hover:not(:disabled) { background: var(--color-primary-light); }
  .btn-block { width: 100%; }
  
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  .spinner-small {
    width: 16px;
    height: 16px;
    border-color: rgba(79, 70, 229, 0.3);
    border-top-color: var(--color-primary);
  }
  
  @keyframes spin { to { transform: rotate(360deg); } }
  
  .otp-footer {
    text-align: center;
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
    margin-bottom: var(--space-md);
  }
  
  .otp-footer p { font-size: var(--text-sm); color: var(--color-text-muted); }
  .link-primary { color: var(--color-primary); text-decoration: none; font-weight: 500; }
  .link-primary:hover { text-decoration: underline; }
  
  .security-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }
  
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
  
  .otp-input:focus-visible,
  .btn:focus-visible,
  .link-primary:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>