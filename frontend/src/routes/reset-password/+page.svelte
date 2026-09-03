<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let newPassword = $state('');
  let confirmPassword = $state('');
  let showPassword = $state(false);
  let loading = $state(false);
  let error = $state('');
  let success = $state('');
  let userId = $state('');
  let resetToken = $state('');

  $effect(() => {
    userId = $page.url.searchParams.get('userId') || '';
    resetToken = $page.url.searchParams.get('token') || '';
  });

  /** @param {SubmitEvent} e */
  async function handleReset(e) {
    e.preventDefault();
    error = '';
    success = '';

    if (newPassword.length < 8) {
      error = 'Password কমপক্ষে ৮ অক্ষর হতে হবে।';
      return;
    }

    if (newPassword !== confirmPassword) {
      error = 'Password match করেনি।';
      return;
    }

    loading = true;
    try {
      const res = await fetch('http://localhost:3001/auth/reset-password-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          resetToken, 
          newPassword 
        }),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success) {
        success = data.message;
        setTimeout(() => goto('/login'), 2000);
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
  <title>Reset Password — UnityPulse</title>
</svelte:head>

<div class="reset-container">
  <div class="reset-card">
    <div class="reset-icon">🔑</div>
    <h1>নতুন Password Set করুন</h1>
    <p class="subtitle">নতুন password লিখুন এবং confirm করুন</p>

    <form onsubmit={handleReset}>
      <div class="form-group">
        <label for="new-password">New Password</label>
        <input
          id="new-password"
          type={showPassword ? 'text' : 'password'}
          bind:value={newPassword}
          placeholder="কমপক্ষে ৮ অক্ষর"
          minlength="8"
          required
        />
      </div>

      <div class="form-group">
        <label for="confirm-password">Confirm Password</label>
        <input
          id="confirm-password"
          type={showPassword ? 'text' : 'password'}
          bind:value={confirmPassword}
          placeholder="আবার password লিখুন"
          minlength="8"
          required
        />
      </div>

      <button type="button" class="toggle-btn" onclick={() => showPassword = !showPassword}>
        {showPassword ? '🙈 Password লুকান' : '👁️ Password দেখুন'}
      </button>

      <button type="submit" class="submit-btn" disabled={loading}>
        {loading ? 'Reset হচ্ছে...' : 'Password Reset করুন'}
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
  .reset-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f0f9f4 0%, #e8f5ee 100%);
    padding: 1rem;
    font-family: 'Hind Siliguri', 'Segoe UI', Tahoma, sans-serif;
  }

  .reset-card {
    background: white;
    border-radius: 16px;
    padding: 2.5rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    text-align: center;
  }

  .reset-icon {
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

  .toggle-btn {
    background: none;
    border: none;
    color: #2ecc71;
    cursor: pointer;
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  .toggle-btn:hover {
    text-decoration: underline;
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