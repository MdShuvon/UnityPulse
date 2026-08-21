<!-- src/routes/register/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Eye, EyeOff, Loader2, Leaf, AlertCircle, CheckCircle2, XCircle, Shield, ShieldCheck, ShieldAlert } from 'lucide-svelte';
  
  // ─── Import Google Fonts ────────────────────────
  // Add this to your app.html head or we'll load it here
  
  // ─── State Management ──────────────────────────
  let fullName = $state('');
  let phone = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);
  let acceptTerms = $state(false);
  let isLoading = $state(false);
  let isCheckingAuth = $state(true);
  
  // ─── Toast/Modal Notification ──────────────────
  let showModal = $state(false);
  let modalMessage = $state('');
  let modalType = $state<'success' | 'error'>('success');
  let modalTitle = $state('');
  
  // ─── Form Errors ───────────────────────────────
  interface FieldErrors {
    fullName?: string;
    phone?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }
  let errors = $state<FieldErrors>({});
  let touched = $state({
    fullName: false,
    phone: false,
    email: false,
    password: false,
    confirmPassword: false
  });
  
  // ─── Password Strength ─────────────────────────
  interface PasswordChecks {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  }
  
  let passwordChecks = $state<PasswordChecks>({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecial: false
  });
  
  let passwordStrength = $derived.by(() => {
    const score = Object.values(passwordChecks).filter(Boolean).length;
    if (score <= 1) return { label: 'দুর্বল', color: '#e74c3c', percent: 20 };
    if (score <= 3) return { label: 'মাঝারি', color: '#f39c12', percent: 50 };
    if (score <= 4) return { label: 'ভালো', color: '#3498db', percent: 75 };
    return { label: 'শক্তিশালী', color: '#2ecc71', percent: 100 };
  });
  
  // ─── Show Modal ────────────────────────────────
  function showModalMessage(title: string, message: string, type: 'success' | 'error') {
    modalTitle = title;
    modalMessage = message;
    modalType = type;
    showModal = true;
  }
  
  // ─── Check Auth on Mount ───────────────────────
  onMount(async () => {
    try {
      const response = await fetch('http://localhost:3001/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const user = await response.json();
        const redirectTo = ['SUPER_ADMIN', 'LOCAL_ADMIN'].includes(user.role) 
          ? '/admin' 
          : '/dashboard';
        await goto(redirectTo);
        return;
      }
    } catch (error) {
      // Not authenticated - stay on page
    } finally {
      isCheckingAuth = false;
    }
  });
  
  // ─── Phone Formatting ──────────────────────────
  function formatPhone(value: string): string {
    let digits = value.replace(/\D/g, '');
    if (digits.length > 0 && !digits.startsWith('01')) {
      digits = '01' + digits;
    }
    digits = digits.slice(0, 11);
    if (digits.length > 4) {
      return digits.slice(0, 5) + ' ' + digits.slice(5);
    }
    return digits;
  }
  
  // ─── Field Validation ──────────────────────────
  function validateFullName(value: string): string | undefined {
    if (!value.trim()) return 'পূর্ণ নাম দিন';
    if (value.trim().length < 2) return 'নাম কমপক্ষে ২ অক্ষর হতে হবে';
    return undefined;
  }
  
  function validatePhone(value: string): string | undefined {
    const digits = value.replace(/\D/g, '');
    if (!digits) return 'মোবাইল নম্বর দিন';
    if (digits.length !== 11) return 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)';
    if (!/^01[3-9]/.test(digits)) return 'মোবাইল নম্বর 013-019 দিয়ে শুরু হতে হবে';
    return undefined;
  }
  
  function validateEmail(value: string): string | undefined {
    if (!value.trim()) return 'ইমেইল দিন';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'সঠিক ইমেইল ফরম্যাট দিন';
    return undefined;
  }
  
  function validatePassword(value: string): string | undefined {
    if (!value) return 'পাসওয়ার্ড দিন';
    if (value.length < 8) return 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে';
    return undefined;
  }
  
  function validateConfirmPassword(value: string): string | undefined {
    if (!value) return 'পাসওয়ার্ড নিশ্চিত করুন';
    if (value !== password) return 'পাসওয়ার্ড মিলছে না';
    return undefined;
  }
  
  function checkPasswordStrength(value: string) {
    passwordChecks = {
      minLength: value.length >= 8,
      hasUpperCase: /[A-Z]/.test(value),
      hasLowerCase: /[a-z]/.test(value),
      hasNumber: /[0-9]/.test(value),
      hasSpecial: /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)
    };
  }
  
  function validateField(field: keyof typeof touched) {
    switch (field) {
      case 'fullName': errors.fullName = validateFullName(fullName); break;
      case 'phone': errors.phone = validatePhone(phone); break;
      case 'email': errors.email = validateEmail(email); break;
      case 'password':
        errors.password = validatePassword(password);
        if (confirmPassword) errors.confirmPassword = validateConfirmPassword(confirmPassword);
        break;
      case 'confirmPassword': errors.confirmPassword = validateConfirmPassword(confirmPassword); break;
    }
  }
  
  function validateForm(): boolean {
    const fullNameError = validateFullName(fullName);
    const phoneError = validatePhone(phone);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword);
    const termsError = !acceptTerms ? 'শর্তাবলী মেনে চলতে রাজি হতে হবে' : undefined;
    
    errors = {
      fullName: fullNameError,
      phone: phoneError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
      terms: termsError
    };
    
    touched = {
      fullName: true, phone: true, email: true,
      password: true, confirmPassword: true
    };
    
    return !fullNameError && !phoneError && !emailError && 
           !passwordError && !confirmPasswordError && !termsError;
  }
  
  function handleBlur(field: keyof typeof touched) {
    touched[field] = true;
    validateField(field);
  }
  
  // ─── Handle Input Changes ──────────────────────
  function handleFullNameInput(e: Event) {
    fullName = (e.target as HTMLInputElement).value;
    if (touched.fullName) errors.fullName = validateFullName(fullName);
  }
  
  function handlePhoneInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const cursorPosition = input.selectionStart || 0;
    phone = formatPhone(input.value);
    requestAnimationFrame(() => input.setSelectionRange(cursorPosition, cursorPosition));
    if (touched.phone) errors.phone = validatePhone(phone);
  }
  
  function handleEmailInput(e: Event) {
    email = (e.target as HTMLInputElement).value;
    if (touched.email) errors.email = validateEmail(email);
  }
  
  function handlePasswordInput(e: Event) {
    password = (e.target as HTMLInputElement).value;
    checkPasswordStrength(password);
    if (touched.password) errors.password = validatePassword(password);
    if (confirmPassword && touched.confirmPassword) errors.confirmPassword = validateConfirmPassword(confirmPassword);
  }
  
  function handleConfirmPasswordInput(e: Event) {
    confirmPassword = (e.target as HTMLInputElement).value;
    if (touched.confirmPassword) errors.confirmPassword = validateConfirmPassword(confirmPassword);
  }
  
  // ─── Form Submission ───────────────────────────
  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    if (!validateForm() || isLoading) return;
    
    isLoading = true;
    
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      
      console.log('Sending registration request:', {
        name: fullName.trim(),
        email: email.trim(),
        phone: cleanPhone,
        password: '***'
      });
      
      const response = await fetch('http://localhost:3001/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim(),
            phone: cleanPhone,
            password: password
          })
        });
        
        // First get the raw text to see what backend is returning
        const rawText = await response.text();
        console.log('Raw response:', rawText);
        
        let data;
        try {
          data = JSON.parse(rawText);
        } catch {
          data = { error: rawText };
        }
        
        console.log('Registration response:', { status: response.status, data });
          
      if (!response.ok) {
        if (response.status === 429) {
          showModalMessage('সতর্কতা', 'অনেক বেশি চেষ্টা - ১ মিনিট অপেক্ষা করুন', 'error');
          return;
        }
        
        const errorMessage = data.error || data.message || '';
        
        if (errorMessage.includes('Email') || errorMessage.includes('email')) {
          errors.email = 'এই ইমেইলটি ইতিমধ্যে নিবন্ধিত';
          return;
        }
        if (errorMessage.includes('phone') || errorMessage.includes('Phone')) {
          errors.phone = 'এই মোবাইল নম্বরটি ইতিমধ্যে নিবন্ধিত';
          return;
        }
        
        showModalMessage('ত্রুটি', errorMessage || 'সার্ভারে সমস্যা হয়েছে', 'error');
        return;
      }
      
      // Success
      showModalMessage(
        'সফল!',
        'OTP পাঠানো হয়েছে! ভেরিফিকেশন পেজে নিয়ে যাওয়া হচ্ছে...',
        'success'
      );
      
      setTimeout(async () => {
        showModal = false;
        await goto(`/verify-otp?phone=${cleanPhone}&purpose=register`);
      }, 2000);
      
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        showModalMessage(
          'সংযোগ ত্রুটি',
          'সার্ভারের সাথে সংযোগ করা যাচ্ছে না। দয়া করে নিশ্চিত করুন:\n\n• সার্ভার চালু আছে (localhost:3001)\n• ইন্টারনেট সংযোগ আছে',
          'error'
        );
      } else {
        showModalMessage('ত্রুটি', 'অপ্রত্যাশিত সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
      }
    } finally {
      isLoading = false;
    }
  }
</script>

{#if isCheckingAuth}
  <div class="auth-check-loading">
    <Loader2 class="spinner-icon" size={40} />
    <p>চেক করা হচ্ছে...</p>
  </div>
{:else}
  <div class="register-page">
    
    <!-- CENTERED MODAL -->
    {#if showModal}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={() => showModal = false} onkeydown={(e) => e.key === 'Escape' && (showModal = false)} role="dialog" tabindex="-1">
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
    <div class="modal-content modal-{modalType}">
      <div class="modal-icon">
        {#if modalType === 'success'}
          <CheckCircle2 size={48} color="#2ecc71" />
        {:else}
          <AlertCircle size={48} color="#e74c3c" />
        {/if}
      </div>
      <h2 class="modal-title">{modalTitle}</h2>
      <p class="modal-message">{modalMessage}</p>
      <button class="modal-close-btn" onclick={() => showModal = false}>
        {modalType === 'success' ? 'ঠিক আছে' : 'বন্ধ করুন'}
      </button>
    </div>
    </div>
    {/if}
    
    <!-- Brand Header -->
    <div class="brand-header">
      <div class="brand-logo">
        <span class="logo-text">🌿</span>
        <span class="brand-name">UNITYPULSE</span>
      </div>
      <p class="brand-tagline">কমিউনিটি ইউনাইটেড ফর চেঞ্জ</p>
    </div>
    
    <!-- Register Card -->
    <div class="register-card">
      <h1 class="heading">অ্যাকাউন্ট খুলুন</h1>
      <p class="subheading">UnityPulse-এ স্বাগতম</p>
      
      <form onsubmit={handleSubmit} novalidate>
        
        <!-- Full Name -->
        <div class="form-group">
          <label for="fullName" class="form-label">👤 পূর্ণ নাম</label>
          <input
            type="text"
            id="fullName"
            class="form-input"
            class:input-error={touched.fullName && errors.fullName}
            class:input-valid={touched.fullName && !errors.fullName && fullName.length > 0}
            placeholder="আপনার পূর্ণ নাম লিখুন"
            bind:value={fullName}
            oninput={handleFullNameInput}
            onblur={() => handleBlur('fullName')}
            disabled={isLoading}
            autocomplete="name"
          />
          {#if touched.fullName && errors.fullName}
            <p class="error-text"><AlertCircle size={14} /> {errors.fullName}</p>
          {/if}
        </div>
        
        <!-- Phone -->
        <div class="form-group">
          <label for="phone" class="form-label">📱 মোবাইল নম্বর</label>
          <input
            type="tel"
            id="phone"
            class="form-input"
            class:input-error={touched.phone && errors.phone}
            class:input-valid={touched.phone && !errors.phone && phone.length > 0}
            placeholder="01XXXXXXXXX"
            bind:value={phone}
            oninput={handlePhoneInput}
            onblur={() => handleBlur('phone')}
            disabled={isLoading}
            autocomplete="tel"
            maxlength="12"
          />
          <p class="hint-text">উদাহরণ: 01712345678</p>
          {#if touched.phone && errors.phone}
            <p class="error-text"><AlertCircle size={14} /> {errors.phone}</p>
          {/if}
        </div>
        
        <!-- Email -->
        <div class="form-group">
          <label for="email" class="form-label">📧 ইমেইল অ্যাড্রেস</label>
          <input
            type="email"
            id="email"
            class="form-input"
            class:input-error={touched.email && errors.email}
            class:input-valid={touched.email && !errors.email && email.length > 0}
            placeholder="আপনার ইমেইল দিন"
            bind:value={email}
            oninput={handleEmailInput}
            onblur={() => handleBlur('email')}
            disabled={isLoading}
            autocomplete="email"
          />
          {#if touched.email && errors.email}
            <p class="error-text"><AlertCircle size={14} /> {errors.email}</p>
          {/if}
        </div>
        
        <!-- Password -->
        <div class="form-group">
          <label for="password" class="form-label">🔒 পাসওয়ার্ড</label>
          <div class="input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              class="form-input"
              class:input-error={touched.password && errors.password}
              class:input-valid={touched.password && !errors.password && password.length > 0}
              placeholder="কমপক্ষে ৮ অক্ষর"
              bind:value={password}
              oninput={handlePasswordInput}
              onblur={() => handleBlur('password')}
              disabled={isLoading}
              autocomplete="new-password"
            />
            <button type="button" class="toggle-btn" onclick={() => showPassword = !showPassword} tabindex="-1">
              {#if showPassword}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
            </button>
          </div>
          
          {#if password.length > 0}
            <!-- Strength Meter -->
            <div class="strength-meter">
              <div class="strength-bar-bg">
                <div class="strength-bar-fill" style="width: {passwordStrength.percent}%; background: {passwordStrength.color};"></div>
              </div>
              <span class="strength-label" style="color: {passwordStrength.color};">
                {#if passwordStrength.label === 'দুর্বল'}
                <ShieldAlert size={14} />
              {:else if passwordStrength.label === 'মাঝারি'}
                <Shield size={14} />
              {:else}
                <ShieldCheck size={14} />
              {/if}
                {passwordStrength.label}
              </span>
            </div>
            
            <!-- Checklist -->
            <div class="checklist">
              <div class="checklist-item" class:met={passwordChecks.minLength}>
                {#if passwordChecks.minLength}<CheckCircle2 size={14} />{:else}<XCircle size={14} />{/if}
                <span>কমপক্ষে ৮ অক্ষর</span>
              </div>
              <div class="checklist-item" class:met={passwordChecks.hasUpperCase}>
                {#if passwordChecks.hasUpperCase}<CheckCircle2 size={14} />{:else}<XCircle size={14} />{/if}
                <span>বড় হাতের অক্ষর (A-Z)</span>
              </div>
              <div class="checklist-item" class:met={passwordChecks.hasLowerCase}>
                {#if passwordChecks.hasLowerCase}<CheckCircle2 size={14} />{:else}<XCircle size={14} />{/if}
                <span>ছোট হাতের অক্ষর (a-z)</span>
              </div>
              <div class="checklist-item" class:met={passwordChecks.hasNumber}>
                {#if passwordChecks.hasNumber}<CheckCircle2 size={14} />{:else}<XCircle size={14} />{/if}
                <span>সংখ্যা (0-9)</span>
              </div>
              <div class="checklist-item" class:met={passwordChecks.hasSpecial}>
                {#if passwordChecks.hasSpecial}<CheckCircle2 size={14} />{:else}<XCircle size={14} />{/if}
                <span>বিশেষ চিহ্ন (@#$%^&*)</span>
              </div>
            </div>
          {/if}
          
          {#if touched.password && errors.password}
            <p class="error-text"><AlertCircle size={14} /> {errors.password}</p>
          {/if}
        </div>
        
        <!-- Confirm Password -->
        <div class="form-group">
          <label for="confirmPassword" class="form-label">🔐 পাসওয়ার্ড নিশ্চিত করুন</label>
          <div class="input-wrapper">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              class="form-input"
              class:input-error={touched.confirmPassword && errors.confirmPassword}
              class:input-valid={touched.confirmPassword && !errors.confirmPassword && confirmPassword.length > 0}
              placeholder="পাসওয়ার্ড আবার দিন"
              bind:value={confirmPassword}
              oninput={handleConfirmPasswordInput}
              onblur={() => handleBlur('confirmPassword')}
              disabled={isLoading}
              autocomplete="new-password"
            />
            <button type="button" class="toggle-btn" onclick={() => showConfirmPassword = !showConfirmPassword} tabindex="-1">
              {#if showConfirmPassword}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
            </button>
          </div>
          {#if touched.confirmPassword && confirmPassword.length > 0 && !errors.confirmPassword}
            <p class="success-text"><CheckCircle2 size={14} /> পাসওয়ার্ড মিলেছে</p>
          {/if}
          {#if touched.confirmPassword && errors.confirmPassword}
            <p class="error-text"><AlertCircle size={14} /> {errors.confirmPassword}</p>
          {/if}
        </div>
        
        <!-- Terms -->
        <div class="terms-group">
          <label class="terms-label">
            <input type="checkbox" bind:checked={acceptTerms} disabled={isLoading} />
            <span class="checkmark-box"></span>
            <span class="terms-text">
              আমি <a href="/terms" target="_blank">শর্তাবলী</a> ও <a href="/privacy" target="_blank">গোপনীয়তা নীতি</a> মেনে চলতে রাজি আছি
            </span>
          </label>
          {#if errors.terms}
            <p class="error-text"><AlertCircle size={14} /> {errors.terms}</p>
          {/if}
        </div>
        
        <!-- Submit Button -->
        <button type="submit" class="register-btn" disabled={isLoading}>
          {#if isLoading}
            <Loader2 class="btn-spinner" size={20} />
            <span>রেজিস্ট্রেশন হচ্ছে...</span>
          {:else}
            <span>📝 রেজিস্ট্রেশন করুন</span>
          {/if}
        </button>
      </form>
      
      <!-- Login Link -->
      <div class="login-link">
        <span>ইতিমধ্যে অ্যাকাউন্ট আছে?</span>
        <a href="/login">লগইন করুন</a>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ─── Global Font Import ────────────────────── */
  @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  
  /* ─── Auth Check Loading ────────────────────── */
  .auth-check-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #f0f7f0 0%, #e8f5e9 100%);
    gap: 1rem;
  }
  .auth-check-loading p {
    font-family: 'Hind Siliguri', sans-serif;
    color: #5a7d6a;
    font-size: 1rem;
  }
  
  /* ─── Main Page ─────────────────────────────── */
  .register-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1.5rem;
    background: linear-gradient(135deg, #f0f7f0 0%, #e8f5e9 50%, #f0f7f0 100%);
    font-family: 'Hind Siliguri', sans-serif;
  }
  
  /* ─── Brand Header ──────────────────────────── */
  .brand-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  .brand-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  .logo-text { font-size: 2rem; }
  .brand-name {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 800;
    font-size: 1.75rem;
    color: #1a2e23;
    letter-spacing: -0.5px;
  }
  .brand-tagline {
    font-size: 0.875rem;
    color: #5a7d6a;
    margin: 0;
  }
  
  /* ─── Register Card ─────────────────────────── */
  .register-card {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    width: 100%;
    max-width: 28rem;
    box-shadow: 0 8px 32px rgba(46, 204, 113, 0.12);
    animation: slideUp 0.4s ease-out;
    max-height: 90vh;
    overflow-y: auto;
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .heading {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a2e23;
    text-align: center;
    margin: 0 0 0.25rem 0;
  }
  .subheading {
    font-size: 0.875rem;
    color: #5a7d6a;
    text-align: center;
    margin: 0 0 1.5rem 0;
  }
  
  /* ─── Form ───────────────────────────────────── */
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1a2e23;
    margin-bottom: 0.125rem;
  }
  .input-wrapper {
    position: relative;
  }
  
  .form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    padding-right: 2.5rem;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.875rem;
    border: 2px solid #d4ede0;
    border-radius: 8px;
    background: #ffffff;
    color: #1a2e23;
    transition: all 0.2s ease;
    outline: none;
    box-sizing: border-box;
  }
  .form-input::placeholder {
    color: #8ba89a;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .form-input:focus {
    border-color: #2ecc71;
    box-shadow: 0 0 0 3px rgba(46, 204, 113, 0.1);
  }
  .form-input.input-error {
    border-color: #e74c3c;
    background: #fef5f5;
  }
  .form-input.input-valid {
    border-color: #2ecc71;
    background: #f8fdf9;
  }
  .form-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: #f8faf9;
  }
  
  .toggle-btn {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #8ba89a;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
  }
  .toggle-btn:hover { color: #5a7d6a; }
  
  /* ─── Messages ───────────────────────────────── */
  .hint-text {
    font-size: 0.75rem;
    color: #8ba89a;
    margin: 0.25rem 0 0 0.25rem;
  }
  .error-text {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: #e74c3c;
    margin: 0.25rem 0 0 0.25rem;
  }
  .success-text {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: #2ecc71;
    margin: 0.25rem 0 0 0.25rem;
  }
  
  /* ─── Password Strength ──────────────────────── */
  .strength-meter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .strength-bar-bg {
    flex: 1;
    height: 6px;
    background: #e8f5ee;
    border-radius: 3px;
    overflow: hidden;
  }
  .strength-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  .strength-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }
  
  .checklist {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: #f8faf9;
    border-radius: 8px;
    border: 1px solid #e8f5ee;
  }
  .checklist-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    color: #8ba89a;
    transition: color 0.2s;
  }
  .checklist-item.met { color: #2ecc71; }
  
  /* ─── Terms ──────────────────────────────────── */
  .terms-group { margin-top: 0.25rem; }
  .terms-label {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    cursor: pointer;
  }
  .terms-label input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .checkmark-box {
    width: 1.125rem;
    height: 1.125rem;
    border: 2px solid #d4ede0;
    border-radius: 4px;
    flex-shrink: 0;
    margin-top: 0.125rem;
    transition: all 0.2s;
    position: relative;
  }
  .terms-label input:checked ~ .checkmark-box {
    background: #2ecc71;
    border-color: #2ecc71;
  }
  .terms-label input:checked ~ .checkmark-box::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 5px;
    height: 9px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  .terms-text {
    font-size: 0.8125rem;
    color: #5a7d6a;
    line-height: 1.5;
  }
  .terms-text a {
    color: #2ecc71;
    text-decoration: none;
    font-weight: 500;
  }
  .terms-text a:hover { text-decoration: underline; }
  
  /* ─── REGISTER BUTTON ────────────────────────── */
  .register-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.875rem 1.5rem;
    background: linear-gradient(135deg, #2ecc71, #27ae60);
    color: white;
    font-family: 'Hind Siliguri', sans-serif;
    font-weight: 600;
    font-size: 1.0625rem;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
    margin-top: 0.5rem;
    letter-spacing: 0.3px;
  }
  .register-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #27ae60, #219a52);
    box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4);
    transform: translateY(-1px);
  }
  .register-btn:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(46, 204, 113, 0.3);
  }
  .register-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  .btn-spinner {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* ─── Login Link ─────────────────────────────── */
  .login-link {
    text-align: center;
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid #e8f5ee;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    font-size: 0.875rem;
  }
  .login-link span { color: #5a7d6a; }
  .login-link a {
    color: #2ecc71;
    font-weight: 600;
    text-decoration: none;
  }
  .login-link a:hover { text-decoration: underline; }
  
  /* ─── CENTERED MODAL ─────────────────────────── */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
    padding: 1rem;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .modal-content {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    max-width: 25rem;
    width: 100%;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    animation: popIn 0.3s ease;
  }
  @keyframes popIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  
  .modal-success { border-top: 4px solid #2ecc71; }
  .modal-error { border-top: 4px solid #e74c3c; }
  
  .modal-icon { margin-bottom: 1rem; }
  
  .modal-title {
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #1a2e23;
    margin: 0 0 0.5rem 0;
  }
  
  .modal-message {
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 0.9375rem;
    color: #5a7d6a;
    line-height: 1.6;
    margin: 0 0 1.5rem 0;
    white-space: pre-line;
  }
  
  .modal-close-btn {
    padding: 0.75rem 2rem;
    border-radius: 8px;
    border: none;
    font-family: 'Hind Siliguri', sans-serif;
    font-weight: 600;
    font-size: 0.9375rem;
    cursor: pointer;
    transition: all 0.2s;
    background: #f0f7f0;
    color: #1a2e23;
  }
  .modal-success .modal-close-btn { background: #e8f8f0; color: #27ae60; }
  .modal-error .modal-close-btn { background: #fef5f5; color: #e74c3c; }
  .modal-close-btn:hover { opacity: 0.8; }
  
  /* ─── Scrollbar ──────────────────────────────── */
  .register-card::-webkit-scrollbar { width: 6px; }
  .register-card::-webkit-scrollbar-track { background: transparent; }
  .register-card::-webkit-scrollbar-thumb { background: #d4ede0; border-radius: 3px; }
</style>