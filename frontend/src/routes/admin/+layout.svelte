<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { 
    Leaf, FileText, Briefcase, Plus, Users, DollarSign, 
    CheckSquare, LayoutDashboard, Shield
  } from 'lucide-svelte';

  let { children } = $props();
  let user = $state<any>(null);
  let currentPath = $state('');

  onMount(async () => {
    currentPath = window.location.pathname;
    
    try {
      const res = await fetch('http://localhost:3001/auth/me', { credentials: 'include' });
      if (res.ok) {
        user = await res.json();
        if (!['SUPER_ADMIN', 'LOCAL_ADMIN'].includes(user.role)) {
          goto('/login');
        }
      } else {
        goto('/login');
      }
    } catch (err) {
      goto('/login');
    }
  });
</script>

<div class="admin-shell">
  <!-- Sidebar -->
  <aside class="sidebar">
    <a href="/admin" class="brand">
      <Leaf size={24} />
      <span>UnityPulse Admin</span>
    </a>
    
    <div class="nav-section-label">Career</div>
    <a href="/admin/career/applications" class="nav-item" class:active={currentPath.includes('/admin/career/applications')}>
      <FileText size={16} />
      <span>Applications</span>
    </a>
    <a href="/admin/career/jobs" class="nav-item" class:active={currentPath.includes('/admin/career/jobs')}>
      <Briefcase size={16} />
      <span>Job Postings</span>
    </a>
    <a href="/admin/career/create" class="nav-item" class:active={currentPath.includes('/admin/career/create')}>
      <Plus size={16} />
      <span>নতুন Job</span>
    </a>
    
    <div class="nav-section-label">Platform</div>
    <a href="/admin/users" class="nav-item" class:active={currentPath.includes('/admin/users')}>
      <Users size={16} />
      <span>Users</span>
    </a>
    <a href="/admin/donations" class="nav-item" class:active={currentPath.includes('/admin/donations')}>
      <DollarSign size={16} />
      <span>Donations</span>
    </a>
    <a href="/admin/tasks" class="nav-item" class:active={currentPath.includes('/admin/tasks')}>
      <CheckSquare size={16} />
      <span>Tasks</span>
    </a>
    
    <div class="nav-section-label">Cause</div>
    <a href="/admin/causes" class="nav-item" class:active={currentPath.includes('/admin/causes')}>
      <Leaf size={16} />
      <span>Causes</span>
    </a>
    
    <div class="role-chip">
      <Shield size={12} />
      {user?.role || 'ADMIN'}
    </div>
  </aside>

  <!-- Main Content -->
  <main class="admin-main">
    {@render children()}
  </main>
</div>

<style>
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  
  .admin-shell {
    display: flex;
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    background: #F6F4EE;
  }
  
  .sidebar {
    width: 240px;
    background: #153F36;
    color: white;
    flex-shrink: 0;
    padding: 20px 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    position: sticky;
    top: 0;
    height: 100vh;
  }
  
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 17px;
    font-weight: 700;
    color: white;
    text-decoration: none;
    padding: 6px 10px 20px;
  }
  .brand:hover { opacity: 0.85; }
  
  .nav-section-label {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.4);
    margin: 16px 0 6px 12px;
    font-weight: 700;
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 13.5px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.75);
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s;
  }
  
  .nav-item:hover {
    background: rgba(255, 255, 255, 0.08);
    color: white;
  }
  
  .nav-item.active {
    background: rgba(255, 255, 255, 0.12);
    color: white;
  }
  
  .role-chip {
    margin-top: auto;
    background: #E9A23B;
    color: #5C3A0E;
    font-size: 11px;
    font-weight: 700;
    padding: 8px 12px;
    border-radius: 20px;
    text-align: center;
    font-family: 'DM Mono', monospace;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  
  .admin-main {
    flex: 1;
    padding: 28px 32px;
    max-width: 800px;
  }
  
  @media (max-width: 768px) {
    .sidebar {
      width: 60px;
      padding: 20px 8px;
    }
    .brand span { display: none; }
    .nav-item span { display: none; }
    .nav-item { justify-content: center; padding: 12px; }
    .nav-section-label { display: none; }
    .role-chip { font-size: 9px; padding: 6px; }
    /* .role-chip svg { display: none; } */
    .admin-main { padding: 16px; }
  }
</style>