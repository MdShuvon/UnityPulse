<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let email = $state('');
  let otp = $state('');
  let loading = $state(false);
  let error = $state('');

  $effect(() => {
    email = $page.url.searchParams.get('email') || '';
  });

  /** @param {SubmitEvent} e */
  async function handleVerify(e) {
    e.preventDefault();
    error = '';

    if (!otp.trim()) {
      error = 'OTP দিতে হবে।';
      return;
    }

    if (otp.trim().length !== 6) {
      error = 'OTP ৬ digit হতে হবে।';
      return;
    }

    loading = true;
    try {
      const res = await fetch('http://localhost:3001/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          otp: otp.trim() 
        }),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success) {
        goto(`/reset-password?userId=${data.userId}&token=${data.resetToken}`);
      } else {
        error = data.message;
      }
    } catch (err) {
      error = 'Server error। আবার চেষ্টা করুন।';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Verify OTP — UnityPulse</title>
</svelte:head>

<div class="verify-container">
  <div class="verify-card">
    <div class="verify-icon">📧</div>
    <h1>OTP Verify করুন</h1>
    <p class="subtitle">আপনার email-এ পাঠানো ৬ digit OTP লিখুন</p>

    <form onsubmit={handleVerify}>
      <div class="form-group">
        <label for="otp">OTP Code</label>
        <input
          id="otp"
          type="text"
          bind:value={otp}
          placeholder="______"
          maxlength="6"
          inputmode="numeric"
          pattern="[0-9]*"
          required
        />
      </div>

      <button type="submit" class="submit-btn" disabled={loading}>
        {loading ? 'Verify হচ্ছে...' : 'Verify করুন'}
      </button>
    </form>

    {#if error}
      <div class="alert alert-error">⚠️ {error}</div>
    {/if}

    <button onclick={() => goto('/forgot-password')} class="back-link">
      ← আবার OTP পাঠান
    </button>
  </div>
</div>

<style>
  .verify-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f0f9f4 0%, #e8f5ee 100%);
    padding: 1rem;
    font-family: 'Hind Siliguri', 'Segoe UI', Tahoma, sans-serif;
  }

  .verify-card {
    background: white;
    border-radius: 16px;
    padding: 2.5rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    text-align: center;
  }

  .verify-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  h1 {
    color: #1a2e23;
    font-size: 1.75rem;
    margin: 0 0 0.5rem;
  }

  .subtitle {
    color: #5a7d6a;
    margin: 0 0 2rem;
    line-height: 1.5;
  }

  .form-group {
    text-align: left;
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #1a2e23;
    font-weight: 600;
    font-size: 0.9rem;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #d4ede0;
    border-radius: 8px;
    font-size: 1.5rem;
    text-align: center;
    letter-spacing: 4px;
    outline: none;
    transition: border-color 0.2s;
  }

  input:focus {
    border-color: #2ecc71;
  }

  .submit-btn {
    width: 100%;
    padding: 0.75rem;
    background: #2ecc71;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .submit-btn:hover:not(:disabled) {
    background: #27ae60;
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .alert {
    padding: 0.75rem;
    border-radius: 8px;
    margin: 1rem 0;
    font-size: 0.9rem;
  }

  .alert-error {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .back-link {
    display: inline-block;
    margin-top: 1.5rem;
    color: #2ecc71;
    text-decoration: none;
    font-weight: 500;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .back-link:hover {
    text-decoration: underline;
  }
</style>