<!-- src/routes/about/+page.svelte -->
<script lang="ts">
  import { Leaf, Heart, Users, Globe, Target, Shield, HandHeart, ArrowRight } from 'lucide-svelte';

  const values = [
    {
      icon: Heart,
      title: 'সহমর্মিতা',
      desc: 'আমরা বিশ্বাস করি প্রতিটি মানুষের প্রতি সহমর্মিতা ও ভালোবাসাই সমাজ বদলের মূল চাবিকাঠি।',
      color: '#B8503F'
    },
    {
      icon: Users,
      title: 'কমিউনিটি',
      desc: 'একা নয়, একসাথে — কমিউনিটির শক্তিতেই আমরা বড় পরিবর্তন আনতে পারি।',
      color: '#1F5D50'
    },
    {
      icon: Target,
      title: 'স্বচ্ছতা',
      desc: 'প্রতিটি টাকার হিসাব, প্রতিটি কাজের অগ্রগতি — সবকিছু প্রকাশ্য ও স্বচ্ছ।',
      color: '#E9A23B'
    },
    {
      icon: Shield,
      title: 'বিশ্বস্ততা',
      desc: 'আপনার আস্থাই আমাদের সবচেয়ে বড় সম্পদ — আমরা তা রক্ষা করতে প্রতিশ্রুতিবদ্ধ।',
      color: '#153F36'
    }
  ];

  const stats = [
    { number: '৫০০+', label: 'সক্রিয় সদস্য' },
    { number: '২০+', label: 'সংগঠন' },
    { number: '৳৫০ লক্ষ+', label: 'সংগৃহীত ডোনেশন' },
    { number: '১০০+', label: 'সম্পন্ন প্রজেক্ট' }
  ];
</script>

<div class="about-page">
  <main class="main-content">
    <!-- Hero Section -->
    <div class="page-hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-badge">
          <Leaf size={14} /> UnityPulse
        </div>
        <h1 class="hero-title">একসাথে গড়ি সুন্দর আগামী</h1>
        <p class="hero-sub bangla">
          UnityPulse একটি কমিউনিটি-চালিত প্ল্যাটফর্ম — যেখানে সংগঠন, স্বেচ্ছাসেবক ও দাতারা একসাথে কাজ করে সমাজে ইতিবাচক পরিবর্তন আনতে।
        </p>
        <div class="hero-actions">
          <a href="/register" class="hero-btn primary">যোগ দিন</a>
          <a href="/donate" class="hero-btn secondary">ডোনেট করুন</a>
        </div>
      </div>
    </div>

    <!-- Mission Section -->
    <div class="mission-card">
      <div class="mission-icon">
        <HandHeart size={32} />
      </div>
      <div class="mission-content">
        <h2 class="mission-title">আমাদের লক্ষ্য</h2>
        <p class="mission-text bangla">
          UnityPulse-এর লক্ষ্য হলো এমন একটি প্ল্যাটফর্ম তৈরি করা যেখানে প্রতিটি মানুষ তার সামর্থ্য অনুযায়ী সমাজের উন্নয়নে অবদান রাখতে পারে — কাজের মাধ্যমে, ডোনেশনের মাধ্যমে, নয়তো স্বেচ্ছাসেবার মাধ্যমে। আমরা বিশ্বাস করি, ছোট ছোট প্রচেষ্টাই একদিন বিশাল পরিবর্তন আনে।
        </p>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      {#each stats as stat}
        <div class="stat-card">
          <span class="stat-number">{stat.number}</span>
          <span class="stat-label bangla">{stat.label}</span>
        </div>
      {/each}
    </div>

    <!-- Values -->
    <div class="values-section">
      <h2 class="section-title">আমাদের মূল্যবোধ</h2>
      <div class="values-grid">
        {#each values as value}
          <div class="value-card">
            <div class="value-icon" style={`background: ${value.color}20; color: ${value.color};`}>
              <value.icon size={24} />
            </div>
            <h3 class="value-title">{value.title}</h3>
            <p class="value-desc bangla">{value.desc}</p>
          </div>
        {/each}
      </div>
    </div>

    <!-- CTA -->
    <div class="cta-card">
      <h2 class="cta-title">আজই শুরু করুন</h2>
      <p class="cta-text bangla">UnityPulse-এ যোগ দিন এবং আপনার কমিউনিটিতে পরিবর্তন আনুন।</p>
      <a href="/register" class="cta-btn">
        ফ্রি রেজিস্টার করুন <ArrowRight size={16} />
      </a>
    </div>
  </main>
</div>

<style>
  .about-page {
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    color: #16231F;
    background: linear-gradient(180deg, #E8F5E9 0%, #F6F4EE 30%, #F6F4EE 70%, #E8F0ED 100%);
  }
  .bangla { font-family: 'Hind Siliguri', sans-serif; }

  .main-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 2rem;
  }

  /* ─── Hero ─── */
  .page-hero {
    position: relative;
    border-radius: 30px 46px 30px 30px;
    overflow: hidden;
    min-height: 45vh;
    background: linear-gradient(135deg, #1F5D50, #0F2E27);
    display: flex;
    align-items: flex-end;
    margin-bottom: 24px;
  }
  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(10,16,13,0.8) 0%, rgba(10,16,13,0.1) 80%);
  }
  .hero-content {
    position: relative;
    z-index: 1;
    padding: 32px;
    max-width: 600px;
  }
  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(10px);
    color: #E9A23B;
    font-size: 12px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 20px;
    margin-bottom: 14px;
  }
  .hero-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 36px;
    font-weight: 800;
    color: white;
    line-height: 1.2;
  }
  .hero-sub {
    font-size: 14px;
    color: rgba(255,255,255,0.85);
    margin-top: 10px;
    line-height: 1.7;
  }
  .hero-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
    flex-wrap: wrap;
  }
  .hero-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    font-family: 'Hind Siliguri', sans-serif;
    transition: all 0.2s;
  }
  .hero-btn.primary {
    background: #E9A23B;
    color: #4A2E08;
  }
  .hero-btn.primary:hover { background: #F0B54C; }
  .hero-btn.secondary {
    background: rgba(255,255,255,0.15);
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
  }
  .hero-btn.secondary:hover { background: rgba(255,255,255,0.25); }

  /* ─── Mission ─── */
  .mission-card {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 20px;
    padding: 28px;
    display: flex;
    gap: 20px;
    margin-bottom: 24px;
  }
  .mission-icon {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: #FBEBD0;
    color: #8A5A17;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .mission-content { flex: 1; }
  .mission-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: #153F36;
    margin-bottom: 8px;
  }
  .mission-text {
    font-size: 14px;
    color: #5B675F;
    line-height: 1.8;
  }

  /* ─── Stats ─── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }
  .stat-card {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 16px;
    padding: 20px;
    text-align: center;
  }
  .stat-number {
    display: block;
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 28px;
    font-weight: 800;
    color: #1F5D50;
  }
  .stat-label {
    font-size: 12px;
    color: #5B675F;
    margin-top: 4px;
  }

  /* ─── Values ─── */
  .values-section { margin-bottom: 28px; }
  .section-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: #153F36;
    margin-bottom: 16px;
  }
  .values-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .value-card {
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 16px;
    padding: 20px;
  }
  .value-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
  }
  .value-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: #153F36;
  }
  .value-desc {
    font-size: 13px;
    color: #5B675F;
    line-height: 1.6;
    margin-top: 6px;
  }

  /* ─── CTA ─── */
  .cta-card {
    background: linear-gradient(135deg, #1F5D50, #153F36);
    border-radius: 30px 46px 30px 30px;
    padding: 32px;
    text-align: center;
  }
  .cta-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 24px;
    font-weight: 800;
    color: white;
  }
  .cta-text {
    font-size: 13px;
    color: rgba(255,255,255,0.85);
    margin-top: 8px;
  }
  .cta-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding: 12px 28px;
    background: #E9A23B;
    color: #4A2E08;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
    font-family: 'Hind Siliguri', sans-serif;
  }
  .cta-btn:hover { background: #F0B54C; }

  /* ─── Responsive ─── */
  @media (max-width: 768px) {
    .main-content { max-width: 100%; padding: 1rem; }
    .page-hero { min-height: 35vh; }
    .hero-title { font-size: 26px; }
    .hero-content { padding: 20px; }
    .mission-card { flex-direction: column; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .values-grid { grid-template-columns: 1fr; }
  }
</style>