<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    Eye,
    EyeOff,
    Loader2,
    Leaf,
    AlertCircle,
    CheckCircle2,
  } from "lucide-svelte";

  // ─── State Management ──────────────────────────
  let email = $state("");
  let password = $state("");
  let showPassword = $state(false);
  let rememberMe = $state(false);
  let isLoading = $state(false);
  let isCheckingAuth = $state(true);
  let toastMessage = $state("");
  let toastType = $state<"success" | "error" | "info">("info");
  let showToast = $state(false);

  // ─── Form Errors ───────────────────────────────
  interface FieldErrors {
    email?: string;
    password?: string;
  }
  let errors = $state<FieldErrors>({});
  let touched = $state<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  // ─── Bengali Labels ────────────────────────────
  const labels = {
    brandName: "UNITYPULSE",
    tagline: "কমিউনিটি ইউনাইটেড ফর চেঞ্জ",
    welcome: "আবার স্বাগতম!",
    emailLabel: "ইমেইল",
    emailPlaceholder: "example@email.com",
    passwordLabel: "পাসওয়ার্ড",
    passwordPlaceholder: "আপনার পাসওয়ার্ড",
    loginButton: "লগইন করুন",
    loggingIn: "লগইন হচ্ছে...",
    forgotPassword: "পাসওয়ার্ড ভুলে গেছেন?",
    registerPrompt: "অ্যাকাউন্ট নেই?",
    registerLink: "রেজিস্টার করুন",
    rememberMe: "আমাকে মনে রাখুন",
    showPassword: "পাসওয়ার্ড দেখান",
    hidePassword: "পাসওয়ার্ড লুকান",

    // Error messages
    emailRequired: "ইমেইল দিন",
    emailInvalid: "সঠিক ইমেইল ফরম্যাট দিন (example@email.com)",
    passwordRequired: "পাসওয়ার্ড দিন",
    loginFailed: "ইমেইল বা পাসওয়ার্ড ভুল",
    networkError: "ইন্টারনেট সংযোগ পরীক্ষা করুন",
    serverError: "সার্ভারে সমস্যা হয়েছে, পরে চেষ্টা করুন",
    tooManyRequests: "অনেক বেশি চেষ্টা - ১ মিনিট অপেক্ষা করুন",
  };

  // ─── Check Auth on Mount ───────────────────────
  onMount(async () => {
    // Check for remembered email
    const remembered = localStorage.getItem("rememberedEmail");
    if (remembered) {
      email = remembered;
      rememberMe = true;
    }

    // Check if already logged in
    try {
      const response = await fetch('http://localhost:3001/auth/me', {
        credentials: "include",
      });

      if (response.ok) {
        const user = await response.json();
        const redirectTo = ["SUPER_ADMIN", "LOCAL_ADMIN"].includes(user.role)
          ? "/admin"
          : "/dashboard";
        await goto(redirectTo);
        return;
      }
    } catch (error) {
      // Not authenticated - stay on page
    } finally {
      isCheckingAuth = false;
    }
  });

  // ─── Toast Notification ────────────────────────
  function showToastMessage(
    message: string,
    type: "success" | "error" | "info" = "error",
  ) {
    toastMessage = message;
    toastType = type;
    showToast = true;

    const duration = type === "error" ? 5000 : 3000;
    setTimeout(() => {
      showToast = false;
    }, duration);
  }

  // ─── Field Validation ──────────────────────────
  function validateEmail(value: string): string | undefined {
    if (!value.trim()) return labels.emailRequired;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return labels.emailInvalid;
    return undefined;
  }

  function validatePassword(value: string): string | undefined {
    if (!value) return labels.passwordRequired;
    return undefined;
  }

  function validateField(field: "email" | "password") {
    if (field === "email") {
      errors.email = validateEmail(email);
    } else {
      errors.password = validatePassword(password);
    }
  }

  function validateForm(): boolean {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    errors = {
      email: emailError,
      password: passwordError,
    };

    touched = { email: true, password: true };

    return !emailError && !passwordError;
  }

  // ─── Handle Blur ───────────────────────────────
  function handleBlur(field: "email" | "password") {
    touched[field] = true;
    validateField(field);
  }

  // ─── Handle Input Change ───────────────────────
  function handleEmailInput(e: Event) {
    email = (e.target as HTMLInputElement).value;
    if (touched.email) {
      errors.email = validateEmail(email);
    }
  }

  function handlePasswordInput(e: Event) {
    password = (e.target as HTMLInputElement).value;
    if (touched.password) {
      errors.password = validatePassword(password);
    }
  }

  // ─── Form Submission ───────────────────────────
  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!validateForm() || isLoading) return;

    isLoading = true;

    try {
      const response = await fetch('http://localhost:3001/auth/login',{
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429) {
          throw new Error(labels.tooManyRequests);
        }
        throw new Error(data.error || data.message || labels.loginFailed);
      }

      // Remember email if checked
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // Show success briefly
      showToastMessage("লগইন সফল!", "success");

      // Redirect based on role
      setTimeout(async () => {
        const redirectTo = ["SUPER_ADMIN", "LOCAL_ADMIN"].includes(
          data.user.role,
        )
          ? "/admin"
          : "/dashboard";
        await goto(redirectTo);
      }, 500);
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        showToastMessage(labels.networkError, 'error');
      } else {
        const message = error instanceof Error ? error.message : labels.serverError;
        
        // Professional field-specific errors
        if (message.includes('Email') || message.includes('email') || message.includes('ইমেইল')) {
          if (message.includes('registered') || message.includes('account') || message.includes('পাওয়া') || message.includes('নেই')) {
            errors.email = 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি';
          } else {
            errors.email = message;
          }
          touched.email = true;
        } else if (message.includes('password') || message.includes('Password') || message.includes('পাসওয়ার্ড') || message.includes('ভুল')) {
          errors.password = 'পাসওয়ার্ড ভুল হয়েছে';
          touched.password = true;
        } else {
          showToastMessage(message, 'error');
        }
        
        const form = e.target as HTMLFormElement;
        form.classList.add('shake-animation');
        setTimeout(() => form.classList.remove('shake-animation'), 500);
      }
    } finally {
      isLoading = false;
    }
  }
  // ─── Forgot Password Handler ───────────────────
  function handleForgotPassword() {
    showToastMessage(
      "পাসওয়ার্ড রিসেট ফিচার খুব শীঘ্রই চালু হচ্ছে। ফোন নাম্বার দিয়ে OTP যাচাই করে পাসওয়ার্ড রিসেট করতে পারবেন।",
      "info",
    );
  }
</script>

<!-- ─── Loading State ──────────────────────────── -->
{#if isCheckingAuth}
  <div class="auth-check-loading">
    <div class="spinner-container">
      <Loader2 class="spinner-icon" size={32} />
      <p>চেক করা হচ্ছে...</p>
    </div>
  </div>
{:else}
  <!-- ─── Main Login Page ──────────────────────── -->
  <div class="login-page">
    <!-- Toast Notification -->
    {#if showToast}
      <div class="toast toast-{toastType}" role="alert">
        <span class="toast-icon">
          {#if toastType === "success"}
            <CheckCircle2 size={20} />
          {:else if toastType === "error"}
            <AlertCircle size={20} />
          {:else}
            <AlertCircle size={20} />
          {/if}
        </span>
        <span class="toast-message">{toastMessage}</span>
        <button
          class="toast-close"
          onclick={() => (showToast = false)}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    {/if}

    <!-- Brand Header -->
    <div class="brand-header">
      <div class="brand-logo">
        <Leaf class="logo-icon" size={32} />
        <span class="brand-name">{labels.brandName}</span>
      </div>
      <p class="brand-tagline">{labels.tagline}</p>
    </div>

    <!-- Login Card -->
    <div class="login-card">
      <h1 class="welcome-text">{labels.welcome}</h1>

      <form onsubmit={handleSubmit} novalidate>
        <!-- Email Field -->
        <div class="form-group">
          <label for="email" class="form-label">
            {labels.emailLabel}
          </label>
          <div class="input-wrapper">
            <input
              type="email"
              id="email"
              name="email"
              class="form-input"
              class:input-error={touched.email && errors.email}
              class:input-valid={touched.email &&
                !errors.email &&
                email.length > 0}
              placeholder={labels.emailPlaceholder}
              value={email}
              oninput={handleEmailInput}
              onblur={() => handleBlur("email")}
              disabled={isLoading}
              autocomplete="email"
              aria-invalid={touched.email && !!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {#if touched.email && !errors.email && email.length > 0}
              <CheckCircle2 class="input-valid-icon" size={18} />
            {/if}
          </div>
          {#if touched.email && errors.email}
            <p id="email-error" class="error-message" role="alert">
              <AlertCircle size={14} />
              {errors.email}
            </p>
          {/if}
        </div>

        <!-- Password Field -->
        <div class="form-group">
          <label for="password" class="form-label">
            {labels.passwordLabel}
          </label>
          <div class="input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              class="form-input"
              class:input-error={touched.password && errors.password}
              placeholder={labels.passwordPlaceholder}
              value={password}
              oninput={handlePasswordInput}
              onblur={() => handleBlur("password")}
              disabled={isLoading}
              autocomplete="current-password"
              aria-invalid={touched.password && !!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            <button
              type="button"
              class="password-toggle"
              onclick={() => (showPassword = !showPassword)}
              aria-label={showPassword
                ? labels.hidePassword
                : labels.showPassword}
              tabindex="-1"
            >
              {#if showPassword}
                <EyeOff size={18} />
              {:else}
                <Eye size={18} />
              {/if}
            </button>
          </div>
          {#if touched.password && errors.password}
            <p id="password-error" class="error-message" role="alert">
              <AlertCircle size={14} />
              {errors.password}
            </p>
          {/if}
        </div>

        <!-- Remember Me & Forgot Password -->
        <div class="form-options">
          <label class="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onchange={(e) =>
                (rememberMe = (e.target as HTMLInputElement).checked)}
              disabled={isLoading}
            />
            <span class="checkmark"></span>
            <span class="remember-text">{labels.rememberMe}</span>
          </label>

          <button
            type="button"
            class="forgot-password-btn"
            onclick={handleForgotPassword}
            disabled={isLoading}
          >
            {labels.forgotPassword}
          </button>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          class="submit-btn"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {#if isLoading}
            <Loader2 class="spinner-icon" size={20} />
            <span>{labels.loggingIn}</span>
          {:else}
            <span>{labels.loginButton}</span>
          {/if}
        </button>
      </form>

      <!-- Register Link -->
      <div class="register-link">
        <span>{labels.registerPrompt}</span>
        <a href="/register" class="register-btn">
          {labels.registerLink}
        </a>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ─── Auth Check Loading ────────────────────── */
  .auth-check-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #f0f7f0 0%, #e8f5e9 100%);
  }

  .spinner-container {
    text-align: center;
    color: var(--text-secondary, #5a7d6a);
  }

  .spinner-icon {
    animation: spin 1s linear infinite;
    color: var(--primary, #2ecc71);
    margin-bottom: 1rem;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* ─── Main Login Page ───────────────────────── */
  .login-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1.5rem;
    background: linear-gradient(135deg, #f0f7f0 0%, #e8f5e9 50%, #f0f7f0 100%);
    position: relative;
    overflow: hidden;
  }

  /* Subtle leaf pattern background */
  .login-page::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: radial-gradient(
        circle at 20% 80%,
        rgba(46, 204, 113, 0.05) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 80% 20%,
        rgba(26, 188, 156, 0.05) 0%,
        transparent 50%
      );
    pointer-events: none;
  }

  /* ─── Brand Header ──────────────────────────── */
  .brand-header {
    text-align: center;
    margin-bottom: 2rem;
    position: relative;
    z-index: 1;
  }

  .brand-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .logo-icon {
    color: var(--primary, #2ecc71);
    filter: drop-shadow(0 2px 4px rgba(46, 204, 113, 0.3));
  }

  .brand-name {
    font-family: "Plus Jakarta Sans", sans-serif;
    font-weight: 800;
    font-size: 1.875rem;
    color: var(--text-primary, #1a2e23);
    letter-spacing: -0.5px;
  }

  .brand-tagline {
    font-family: "Hind Siliguri", sans-serif;
    font-size: 0.875rem;
    color: var(--text-secondary, #5a7d6a);
    font-weight: 400;
    margin: 0;
  }

  /* ─── Login Card ─────────────────────────────── */
  .login-card {
    background: white;
    border-radius: var(--radius-xl, 16px);
    padding: 2rem;
    width: 100%;
    max-width: 28rem;
    box-shadow: var(--shadow-lg, 0 8px 24px rgba(46, 204, 113, 0.16));
    position: relative;
    z-index: 1;
    animation: slideUp 0.5s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .welcome-text {
    font-family: "Hind Siliguri", sans-serif;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary, #1a2e23);
    text-align: center;
    margin: 0 0 1.5rem 0;
  }

  /* ─── Form Elements ──────────────────────────── */
  form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-label {
    font-family: "Hind Siliguri", sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary, #1a2e23);
  }

  .input-wrapper {
    position: relative;
  }

  .form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    padding-right: 0.1rem;
    font-family: "Plus Jakarta Sans", sans-serif;
    font-size: 0.875rem;
    border: 2px solid var(--border, #d4ede0);
    border-radius: var(--radius-md, 8px);
    background: var(--bg-primary, #ffffff);
    color: var(--text-primary, #1a2e23);
    transition: all var(--transition-base, 200ms ease);
    outline: none;
  }

  .form-input::placeholder {
    color: var(--text-light, #8ba89a);
  }

  .form-input:focus {
    border-color: var(--primary, #2ecc71);
    box-shadow: 0 0 0 3px rgba(46, 204, 113, 0.1);
  }

  .form-input.input-error {
    border-color: var(--error, #e74c3c);
    box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
  }

  .form-input.input-valid {
    border-color: var(--primary, #2ecc71);
  }

  .form-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--bg-secondary, #f8faf9);
  }

  .input-valid-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--primary, #2ecc71);
  }

  /* Password Toggle */
  .password-toggle {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-light, #8ba89a);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color var(--transition-fast, 150ms ease);
  }

  .password-toggle:hover {
    color: var(--text-secondary, #5a7d6a);
  }

  /* ─── Error Message ──────────────────────────── */
  .error-message {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-family: "Hind Siliguri", sans-serif;
    font-size: 0.75rem;
    color: var(--error, #e74c3c);
    margin: 0;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ─── Form Options ───────────────────────────── */
  .form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .remember-me {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    position: relative;
  }

  .remember-me input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }

  .checkmark {
    width: 1.125rem;
    height: 1.125rem;
    border: 2px solid var(--border, #d4ede0);
    border-radius: 4px;
    transition: all var(--transition-fast, 150ms ease);
    display: inline-block;
    position: relative;
  }

  .remember-me input:checked ~ .checkmark {
    background: var(--primary, #2ecc71);
    border-color: var(--primary, #2ecc71);
  }

  .remember-me input:checked ~ .checkmark::after {
    content: "";
    position: absolute;
    left: 4px;
    top: 1px;
    width: 4px;
    height: 8px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .remember-text {
    font-family: "Hind Siliguri", sans-serif;
    font-size: 0.8125rem;
    color: var(--text-secondary, #5a7d6a);
  }

  .forgot-password-btn {
    font-family: "Hind Siliguri", sans-serif;
    font-size: 0.8125rem;
    color: var(--primary, #2ecc71);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: color var(--transition-fast, 150ms ease);
    padding: 0;
  }

  .forgot-password-btn:hover {
    color: var(--primary-dark, #27ae60);
    text-decoration: underline;
  }

  .forgot-password-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ─── Submit Button ──────────────────────────── */
  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.875rem;
    background: var(
      --gradient-primary,
      linear-gradient(135deg, #2ecc71, #27ae60)
    );
    color: white;
    font-family: "Plus Jakarta Sans", sans-serif;
    font-weight: 600;
    font-size: 1rem;
    border: none;
    border-radius: var(--radius-md, 8px);
    cursor: pointer;
    transition: all var(--transition-base, 200ms ease);
    box-shadow: var(--shadow-sm, 0 1px 3px rgba(46, 204, 113, 0.08));
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md, 0 4px 12px rgba(46, 204, 113, 0.12));
  }

  .submit-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  /* ─── Register Link ──────────────────────────── */
  .register-link {
    text-align: center;
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border-light, #e8f5ee);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
  }

  .register-link span {
    font-family: "Hind Siliguri", sans-serif;
    font-size: 0.875rem;
    color: var(--text-secondary, #5a7d6a);
  }

  .register-btn {
    font-family: "Hind Siliguri", sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--primary, #2ecc71);
    text-decoration: none;
    transition: color var(--transition-fast, 150ms ease);
  }

  .register-btn:hover {
    color: var(--primary-dark, #27ae60);
    text-decoration: underline;
  }

  /* ─── Toast Notification ─────────────────────── */
  .toast {
    position: fixed;
    top: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: var(--radius-md, 8px);
    box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.12));
    z-index: 1000;
    min-width: 20rem;
    max-width: 28rem;
    animation: slideInRight 0.3s ease-out;
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .toast-success {
    background: #1a2e23;
    color: #a8e6cf;
    border-left: 4px solid var(--primary, #2ecc71);
  }

  .toast-error {
    background: #1a2e23;
    color: #f5c6cb;
    border-left: 4px solid var(--error, #e74c3c);
  }

  .toast-info {
    background: #1a2e23;
    color: #bee5eb;
    border-left: 4px solid var(--info, #3498db);
  }

  .toast-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .toast-message {
    flex: 1;
    font-family: "Hind Siliguri", sans-serif;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .toast-close {
    background: none;
    border: none;
    color: inherit;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
    opacity: 0.7;
    transition: opacity var(--transition-fast, 150ms ease);
    flex-shrink: 0;
  }

  .toast-close:hover {
    opacity: 1;
  }

  /* ─── Shake Animation ────────────────────────── */
  .shake-animation {
    animation: shake 0.5s ease-in-out;
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    10%,
    30%,
    50%,
    70%,
    90% {
      transform: translateX(-4px);
    }
    20%,
    40%,
    60%,
    80% {
      transform: translateX(4px);
    }
  }

  /* ─── Responsive Design ──────────────────────── */
  @media (max-width: 480px) {
    .login-page {
      padding: 1rem;
    }

    .login-card {
      padding: 1.5rem;
    }

    .brand-name {
      font-size: 1.5rem;
    }

    .welcome-text {
      font-size: 1.25rem;
    }

    .form-options {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .toast {
      left: 1rem;
      right: 1rem;
      min-width: auto;
    }
  }

  @media (min-width: 768px) {
    .login-card {
      padding: 2.5rem;
    }
  }
</style>
