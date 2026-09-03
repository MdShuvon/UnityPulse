<script>
  import { goto } from '$app/navigation';

  let email = $state('');
  let loading = $state(false);
  let error = $state('');
  let success = $state('');

  /** @param {SubmitEvent} e */
  async function handleForgotPassword(e) {
    e.preventDefault();
    error = '';
    success = '';

    if (!email.trim()) {
      error = 'Email দিতে হবে।';
      return;
    }

    loading = true;
    try {
      const res = await fetch('http://localhost:3001/auth/email-forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        credentials: 'include'
      });

      const data = await res.json();
      
      if (data.success) {
        success = data.message;
        setTimeout(() => {
          goto(`/verify-reset-otp?email=${encodeURIComponent(email.trim())}`);
        }, 1500);
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
  <title>Forgot Password — UnityPulse</title>
</svelte:head>

<div class="forgot-container">
  <div class="forgot-card">
    <div class="forgot-icon">🔐</div>
    <h1>Password ভুলে গেছেন?</h1>
    <p class="subtitle">চিন্তা করবেন না! আপনার email দিন, আমরা OTP পাঠাবো।</p>

    <form onsubmit={handleForgotPassword}>
      <div class="form-group">
        <label for="email">Email Address</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="example@email.com"
          autocomplete="email"
          required
        />
      </div>

      <button type="submit" class="submit-btn" disabled={loading}>
        {loading ? 'OTP পাঠানো হচ্ছে...' : 'OTP পাঠান'}
      </button>
    </form>

    {#if error}
      <div class="alert alert-error">⚠️ {error}</div>
    {/if}

    {#if success}
      <div class="alert alert-success">✅ {success}</div>
    {/if}

    <a href="/login" class="back-link">← Login-এ ফিরে যান</a>
  </div>
</div>

<style>
  .forgot-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f0f9f4 0%, #e8f5ee 100%);
    padding: 1rem;
    font-family: 'Hind Siliguri', 'Segoe UI', Tahoma, sans-serif;
  }

  .forgot-card {
    background: white;
    border-radius: 16px;
    padding: 2.5rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    text-align: center;
  }

  .forgot-icon {
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
    font-size: 1rem;
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

  .alert-success {
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  }

  .back-link {
    display: inline-block;
    margin-top: 1.5rem;
    color: #2ecc71;
    text-decoration: none;
    font-weight: 500;
  }

  .back-link:hover {
    text-decoration: underline;
  }
</style>