<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Loader2, Search, Shield, User } from 'lucide-svelte';

  let isLoading = $state(true);
  let users = $state<any[]>([]);
  let error = $state('');
  let searchQuery = $state('');
  let activeRole = $state('ALL');
  let currentPage = $state(1);
  let totalPages = $state(1);
  let totalUsers = $state(0);
  let pageSize = $state(20);
  let currentUser = $state<any>(null);
  
  // Suspend modal
  let showSuspendModal = $state(false);
  let suspendTarget = $state<any>(null);
  let suspendReason = $state('');
  let isProcessing = $state(false);

  const roles = ['ALL', 'SUPER_ADMIN', 'LOCAL_ADMIN', 'MEMBER'];

  function getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'SUPER_ADMIN': return 'role-super';
      case 'LOCAL_ADMIN': return 'role-local';
      default: return 'role-member';
    }
  }

  function getInitials(name: string): string {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function fetchUsers() {
    isLoading = true;
    try {
      const params = new URLSearchParams({
        role: activeRole,
        page: String(currentPage),
        pageSize: String(pageSize),
      });
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery);
      }

      const res = await fetch(`http://localhost:3001/admin/users?${params}`, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        users = data.data;
        totalUsers = data.pagination.total;
        totalPages = Math.ceil(data.pagination.total / pageSize);
      }
    } catch (err) {
      error = 'Users লোড করতে সমস্যা হয়েছে';
    } finally {
      isLoading = false;
    }
  }

  async function fetchCurrentUser() {
    try {
      const res = await fetch('http://localhost:3001/auth/me', { credentials: 'include' });
      if (res.ok) currentUser = await res.json();
    } catch (err) { console.error(err); }
  }

  function handleSearch(e: Event) {
    const target = e.target as HTMLInputElement;
    searchQuery = target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { currentPage = 1; fetchUsers(); }, 300);
  }
  let searchTimeout: any;

  function filterByRole(role: string) {
    activeRole = role;
    currentPage = 1;
    fetchUsers();
  }

  function openSuspendModal(user: any) {
    suspendTarget = user;
    suspendReason = '';
    showSuspendModal = true;
  }

  async function submitSuspend() {
    if (!suspendReason.trim()) { alert('Suspend reason required'); return; }
    if (!suspendTarget || isProcessing) return;
    
    isProcessing = true;
    try {
      const res = await fetch(`http://localhost:3001/admin/users/${suspendTarget.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'SUSPENDED', reason: suspendReason }),
      });
      
      if (res.ok) {
        showSuspendModal = false;
        suspendReason = '';
        suspendTarget = null;
        fetchUsers();
      }
    } catch (err) { alert('Server error'); }
    finally { isProcessing = false; }
  }

  async function reactivateUser(userId: string) {
    if (isProcessing) return;
    isProcessing = true;
    try {
      const res = await fetch(`http://localhost:3001/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      if (res.ok) fetchUsers();
    } catch (err) { alert('Server error'); }
    finally { isProcessing = false; }
  }

  async function changeRole(userId: string, newRole: string) {
    if (isProcessing) return;
    
    const confirmed = confirm(`Role পরিবর্তন করে ${newRole} করবেন?`);
    if (!confirmed) return;
    
    isProcessing = true;
    try {
      const res = await fetch(`http://localhost:3001/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) fetchUsers();
    } catch (err) { alert('Server error'); }
    finally { isProcessing = false; }
  }

  onMount(() => {
    fetchCurrentUser();
    fetchUsers();
  });
</script>

<div class="users-page">
  <div class="page-top">
    <h1 class="page-title">Users</h1>
    <p class="page-sub bangla">প্ল্যাটফর্মের সব সদস্য ব্যবস্থাপনা করুন</p>
  </div>

  <div class="toolbar">
    <div class="search-box">
      <Search size={16} />
      <input class="search-input bangla" placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..." value={searchQuery} oninput={handleSearch} />
    </div>
    <div class="chips">
      {#each roles as role}
        <button class="chip" class:active={activeRole === role} onclick={() => filterByRole(role)}>
          {role === 'ALL' ? 'সব Role' : role}
        </button>
      {/each}
    </div>
  </div>

  {#if isLoading}
    <div class="loading-state"><Loader2 size={48} class="spin-anim" /><p>Loading...</p></div>
  {:else if error}
    <div class="loading-state"><p>{error}</p></div>
  {:else if users.length > 0}
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Points</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each users as user}
            <tr>
              <td>
                <div class="user-cell">
                  <div class="av">
                    {#if user.profilePhoto}
                      <img src={user.profilePhoto} alt={user.name} class="avatar-img" />
                    {:else}
                      {getInitials(user.name)}
                    {/if}
                  </div>
                  <div>
                    <div class="u-name">{user.name}</div>
                    <div class="u-org">{user.area?.name || 'N/A'}</div>
                  </div>
                </div>
              </td>
              <td class="mono email-cell">{user.email}</td>
              <td>
                <span class="role-badge {getRoleBadgeClass(user.role)}">{user.role}</span>
              </td>
              <td class="mono">{user.totalPoints || 0}</td>
              <td>
                <span class="status-badge" class:suspended={user.accountStatus === 'SUSPENDED'}>
                  {user.accountStatus === 'SUSPENDED' ? 'Suspended' : 'Active'}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  {#if currentUser?.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN'}
                    <button class="icon-btn" onclick={() => changeRole(user.id, user.role === 'MEMBER' ? 'LOCAL_ADMIN' : 'MEMBER')}>
                      Role
                    </button>
                  {/if}
                  {#if user.role !== 'SUPER_ADMIN'}
                    {#if user.accountStatus === 'SUSPENDED'}
                      <button class="icon-btn" onclick={() => reactivateUser(user.id)}>Reactivate</button>
                    {:else}
                      <button class="icon-btn suspend" onclick={() => openSuspendModal(user)}>Suspend</button>
                    {/if}
                  {/if}
                </div>
              </td>
            </tr>
            {#if user.accountStatus === 'SUSPENDED' && user.suspensionReason}
              <tr class="suspension-row">
                <td colspan="6">
                  <div class="suspension-box">
                    <span class="suspension-label">Suspend Reason:</span>
                    <span class="suspension-text bangla">{user.suspensionReason}</span>
                    {#if user.suspendedAt}
                      <span class="suspension-date mono">{formatDate(user.suspendedAt)}</span>
                    {/if}
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>

    <div class="pagination">
      {#each Array(totalPages) as _, i}
        <button class="page-btn" class:active={currentPage === i + 1} onclick={() => { currentPage = i + 1; fetchUsers(); }}>
          {i + 1}
        </button>
      {/each}
    </div>
  {:else}
    <div class="empty-state"><p class="bangla">কোনো user পাওয়া যায়নি</p></div>
  {/if}

  {#if showSuspendModal && suspendTarget}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={() => showSuspendModal = false} onkeydown={(e) => e.key === 'Escape' && (showSuspendModal = false)} role="dialog" tabindex="-1">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="modal-content" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <div class="modal-title">{suspendTarget.name}-কে Suspend করবেন?</div>
        <div class="modal-body bangla">এই ইউজার আর লগইন করতে পারবে না, যতক্ষণ না Reactivate করা হয়।</div>
        <textarea class="modal-textarea bangla" bind:value={suspendReason} placeholder="Suspend করার কারণ লিখুন (আবশ্যক)..."></textarea>
        <div class="modal-actions">
          <button class="btn-cancel" onclick={() => showSuspendModal = false}>বাতিল</button>
          <button class="btn-confirm-suspend" onclick={submitSuspend} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Suspend নিশ্চিত করুন'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
:root {
  --forest: #1F5D50;
  --forest-dark: #153F36;
  --marigold: #E9A23B;
  --marigold-light: #FBEBD0;
  --paper: #F6F4EE;
  --mist: #E4EDE9;
  --ink: #16231F;
  --ink-soft: #5B675F;
  --rose: #B8503F;
  --white: #fff;
  --green-badge: #EAF4EE;
  --green-text: #1F6E45;
  --rose-badge: #F6E4E1;
}

.users-page { min-height: 100vh; }
.page-title { font-family: 'Baloo Da 2', sans-serif; font-size: 22px; font-weight: 700; color: var(--forest-dark); }
.page-sub { font-size: 13px; color: var(--ink-soft); margin-top: 4px; }

.toolbar { display: flex; gap: 10px; margin-top: 18px; align-items: center; flex-wrap: wrap; }
.search-box { flex: 1; position: relative; display: flex; align-items: center; min-width: 200px; }
.search-input { width: 100%; padding: 10px 14px 10px 34px; border: 1px solid var(--mist); border-radius: 10px; font-size: 13px; background: var(--white); font-family: 'Hind Siliguri', sans-serif; outline: none; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { font-size: 12px; font-weight: 500; padding: 7px 14px; border-radius: 20px; border: 1px solid var(--mist); background: var(--white); color: var(--ink-soft); cursor: pointer; white-space: nowrap; }
.chip.active { background: var(--forest); border-color: var(--forest); color: var(--white); }

.spin-anim { animation: spin 1s linear infinite; color: var(--forest); }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.loading-state { text-align: center; padding: 3rem; color: var(--ink-soft); }

.table-container { background: var(--white); border-radius: 14px; border: 1px solid var(--mist); overflow: hidden; margin-top: 16px; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-soft); padding: 12px 14px; background: var(--paper); border-bottom: 1px solid var(--mist); }
td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid var(--mist); vertical-align: middle; }
tr:last-child td { border-bottom: none; }

.user-cell { display: flex; align-items: center; gap: 10px; }
.av { width: 32px; height: 32px; border-radius: 50%; background: var(--forest); color: var(--white); display: flex; align-items: center; justify-content: center; font-family: 'Baloo Da 2', sans-serif; font-size: 12px; font-weight: 700; overflow: hidden; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.u-name { font-weight: 600; font-size: 13px; white-space: nowrap; }
.u-org { font-size: 11px; color: var(--ink-soft); white-space: nowrap; }
.email-cell { font-size: 12px; color: var(--ink-soft); white-space: nowrap; }

.role-badge { font-size: 10.5px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
.role-super { background: var(--marigold-light); color: #8A5A17; }
.role-local { background: var(--green-badge); color: var(--green-text); }
.role-member { background: var(--mist); color: var(--ink-soft); }

.status-badge { font-size: 10.5px; font-weight: 600; background: var(--green-badge); color: var(--green-text); padding: 3px 10px; border-radius: 20px; }
.status-badge.suspended { background: var(--rose-badge); color: var(--rose); }

.row-actions { display: flex; gap: 6px; }
.icon-btn { font-size: 11px; font-weight: 500; padding: 5px 10px; border-radius: 7px; border: 1px solid var(--mist); background: var(--white); color: var(--forest); cursor: pointer; }
.icon-btn.suspend { color: var(--rose); }

.pagination { display: flex; justify-content: center; gap: 6px; margin-top: 18px; }
.page-btn { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--mist); background: var(--white); font-size: 12.5px; cursor: pointer; }
.page-btn.active { background: var(--forest); color: var(--white); border-color: var(--forest); }

.empty-state { text-align: center; padding: 48px 20px; background: var(--white); border: 1px dashed var(--mist); border-radius: 16px; margin-top: 16px; }

.suspension-row td {
  background: #FDF6F5;
  padding: 0;
  border-bottom: 1px solid var(--rose-badge);
}
.suspension-box {
  padding: 10px 16px;
  border-left: 3px solid var(--rose);
  background: #FDF6F5;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.suspension-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--rose);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.suspension-text {
  font-size: 13px;
  color: var(--ink-soft);
  flex: 1;
}
.suspension-date {
  font-size: 11px;
  color: #8B9790;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--white);
  border: 1px solid var(--rose);
  border-radius: 14px;
  padding: 20px;
  max-width: 380px;
  width: 100%;
}

.modal-title {
  font-family: 'Baloo Da 2', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--rose);
}

.modal-body {
  font-family: 'Hind Siliguri', sans-serif;
  font-size: 12.5px;
  color: var(--ink-soft);
  margin-top: 6px;
}

.modal-textarea {
  width: 100%;
  margin-top: 12px;
  border: 1px solid var(--mist);
  border-radius: 8px;
  padding: 9px 12px;
  font-family: 'Hind Siliguri', sans-serif;
  font-size: 12.5px;
  min-height: 60px;
  outline: none;
  resize: vertical;
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.btn-confirm-suspend {
  flex: 1;
  background: var(--rose);
  color: var(--white);
  border: none;
  padding: 9px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}
.btn-confirm-suspend:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  flex: 1;
  background: var(--white);
  color: var(--ink-soft);
  border: 1px solid var(--mist);
  padding: 9px;
  border-radius: 8px;
  font-size: 12.5px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .toolbar { flex-direction: column; }
  .search-box { width: 100%; }
}
</style>