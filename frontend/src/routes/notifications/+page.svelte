<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    Loader2, Bell, CheckCircle2, XCircle, Heart, Users,
    Briefcase, Mail, Award, Target, AlertCircle, Inbox,
    CheckCheck, ChevronLeft, ChevronRight,
  } from 'lucide-svelte';

  let isLoading = $state(true);
  let notifications = $state<any[]>([]);
  let pagination = $state<any>({ page: 1, limit: 20, total: 0, hasMore: false });
  let unreadCount = $state(0);
  let currentFilter = $state<'all' | 'unread'>('all');
  let isMarkingAll = $state(false);

  // Initialize from URL query params
  $effect(() => {
    const params = $page.url.searchParams;
    const filterParam = params.get('filter');
    const pageParam = params.get('page');
    currentFilter = filterParam === 'unread' ? 'unread' : 'all';
    // Pagination is derived from URL, triggering fetch
    fetchNotifications(
      parseInt(pageParam || '1', 10),
      currentFilter,
    );
  });

  async function fetchNotifications(pageNum = 1, filter: 'all' | 'unread' = 'all') {
    isLoading = true;
    try {
      const res = await fetch(
        `https://localhost:3001/notifications?page=${pageNum}&limit=20&filter=${filter}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        notifications = data.data || [];
        pagination = data.pagination || pagination;
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      isLoading = false;
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await fetch('https://localhost:3001/notifications/count', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        unreadCount = data.unreadCount || 0;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function markAsRead(notif: any) {
    if (notif.isRead) return;
    try {
      const res = await fetch(`https://localhost:3001/notifications/${notif.id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) {
        notifications = notifications.map(n =>
          n.id === notif.id ? { ...n, isRead: true } : n
        );
        unreadCount = Math.max(0, unreadCount - 1);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function markAllAsRead() {
    if (isMarkingAll || unreadCount === 0) return;
    isMarkingAll = true;
    try {
      const res = await fetch('https://localhost:3001/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) {
        notifications = notifications.map(n => ({ ...n, isRead: true }));
        unreadCount = 0;
      }
    } catch (err) {
      console.error(err);
    } finally {
      isMarkingAll = false;
    }
  }

  function handleNotificationClick(notif: any) {
    markAsRead(notif);

    const target = getNotificationTarget(notif.type, notif.refId);

    if (target) {
      const separator = target.includes('?') ? '&' : '?';
      const query = new URLSearchParams({
        notifId: notif.id,
        notifType: notif.type,
        notifMsg: notif.message,
      });
      
      if (notif.refTitle) {
        query.set('notifTitle', notif.refTitle);
      }
      
      goto(`${target}${separator}${query.toString()}`);
    }
  }

  function getNotificationTarget(type: string, refId: string | null): string | null {
    const map: Record<string, string> = {
      DONATION_RECEIVED:      '/admin/donations',
      TASK_SUBMITTED:         '/admin/tasks',
      TASK_APPROVED:          '/tasks/mine',
      TASK_REJECTED:          '/tasks/mine',
      TASK_ASSIGNED:          refId ? `/tasks/${refId}` : '/tasks',
      CAUSE_JOIN_APPROVED:    '/admin/causes',
      CAUSE_JOIN_REJECTED:    '/admin/causes',
      PROJECT_ISSUE_REPORTED: '/admin/donations',
      JOB_APPLICATION_STATUS: '/career/mine',
    };
    return map[type] || null;
  }

  function switchFilter(filter: 'all' | 'unread') {
    if (filter === currentFilter) return;
    goto(`/notifications?filter=${filter}&page=1`, { replaceState: false });
  }

  function goToPage(pageNum: number) {
    goto(`/notifications?filter=${currentFilter}&page=${pageNum}`, { replaceState: false });
  }

  function getNotificationIcon(type: string) {
    const iconMap: Record<string, any> = {
      TASK_APPROVED:          CheckCircle2,
      TASK_REJECTED:          XCircle,
      TASK_SUBMITTED:         Inbox,
      TASK_ASSIGNED:          Target,
      DONATION_RECEIVED:      Heart,
      CAUSE_JOIN_APPROVED:    Users,
      CAUSE_JOIN_REJECTED:    Users,
      PROJECT_ISSUE_REPORTED: AlertCircle,
      JOB_APPLICATION_STATUS: Briefcase,
      GENERAL:                Mail,
    };
    return iconMap[type] || Bell;
  }

  function getIconColor(type: string): string {
    const colorMap: Record<string, string> = {
      TASK_APPROVED:          '#1F6E45',
      TASK_REJECTED:          '#B8503F',
      TASK_SUBMITTED:         '#1F5D50',
      TASK_ASSIGNED:          '#1F5D50',
      DONATION_RECEIVED:      '#E9A23B',
      CAUSE_JOIN_APPROVED:    '#1F6E45',
      CAUSE_JOIN_REJECTED:    '#B8503F',
      PROJECT_ISSUE_REPORTED: '#E9A23B',
      JOB_APPLICATION_STATUS: '#8A5A17',
      GENERAL:                '#5B675F',
    };
    return colorMap[type] || '#5B675F';
  }

  function timeAgo(dateString: string): string {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (diff < 1) return 'এইমাত্র';
    if (diff < 60) return `${diff} মিনিট আগে`;
    if (diff < 1440) return `${Math.floor(diff / 60)} ঘণ্টা আগে`;
    if (diff < 43200) return `${Math.floor(diff / 1440)} দিন আগে`;
    return new Date(dateString).toLocaleDateString('bn-BD', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('bn-BD', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  // Total pages for pagination
  let totalPages = $derived(Math.max(1, Math.ceil(pagination.total / pagination.limit)));

  // Page numbers array for UI (show max 7)
  let pageNumbers = $derived.by(() => {
    const current = pagination.page;
    const total = totalPages;
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 4) pages.push('...');
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 3) pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  onMount(() => {
    fetchUnreadCount();
  });
</script>

<div class="notifications-page">
  <main class="main-content">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Notifications</h1>
        <p class="page-sub bangla">আপনার সব আপডেট এখানে</p>
      </div>
      {#if unreadCount > 0}
        <button
          class="mark-all-btn"
          onclick={markAllAsRead}
          disabled={isMarkingAll}
        >
          {#if isMarkingAll}
            <Loader2 size={14} class="spin-anim" /> Marking...
          {:else}
            <CheckCheck size={14} /> সব পড়া হয়েছে
          {/if}
        </button>
      {/if}
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button
        class="tab-btn"
        class:active={currentFilter === 'all'}
        onclick={() => switchFilter('all')}
      >
        সব
        {#if pagination.total > 0 && currentFilter === 'all'}
          <span class="tab-count">{pagination.total}</span>
        {/if}
      </button>
      <button
        class="tab-btn"
        class:active={currentFilter === 'unread'}
        onclick={() => switchFilter('unread')}
      >
        অপঠিত
        {#if unreadCount > 0}
          <span class="tab-count unread">{unreadCount}</span>
        {/if}
      </button>
    </div>

    <!-- Notifications List -->
    <div class="notif-list">
      {#if isLoading}
        <div class="loading-state">
          <Loader2 size={40} class="spin-anim" />
          <p class="bangla">লোড হচ্ছে...</p>
        </div>
      {:else if notifications.length === 0}
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <Bell size={32} />
          </div>
          <h3 class="empty-title bangla">
            {currentFilter === 'unread' ? 'কোনো অপঠিত notification নেই' : 'কোনো notification নেই'}
          </h3>
          <p class="empty-body bangla">
            {currentFilter === 'unread'
              ? 'সব পড়া হয়ে গেছে!'
              : 'আপনার notification এখানে দেখাবে।'}
          </p>
        </div>
      {:else}
        {#each notifications as notif (notif.id)}
          <button
            class="notif-item"
            class:unread={!notif.isRead}
            onclick={() => handleNotificationClick(notif)}
          >
            {#if !notif.isRead}
              <span class="unread-bar"></span>
            {/if}
            <div class="notif-icon" style={`color: ${getIconColor(notif.type)}; background: ${getIconColor(notif.type)}15;`}>
              {#if getNotificationIcon(notif.type) === CheckCircle2}
                <CheckCircle2 size={20} />
              {:else if getNotificationIcon(notif.type) === XCircle}
                <XCircle size={20} />
              {:else if getNotificationIcon(notif.type) === Heart}
                <Heart size={20} />
              {:else if getNotificationIcon(notif.type) === Users}
                <Users size={20} />
              {:else if getNotificationIcon(notif.type) === Briefcase}
                <Briefcase size={20} />
              {:else if getNotificationIcon(notif.type) === Mail}
                <Mail size={20} />
              {:else if getNotificationIcon(notif.type) === Target}
                <Target size={20} />
              {:else if getNotificationIcon(notif.type) === AlertCircle}
                <AlertCircle size={20} />
              {:else if getNotificationIcon(notif.type) === Inbox}
                <Inbox size={20} />
              {:else}
                <Bell size={20} />
              {/if}
            </div>
            <div class="notif-content">
              <p class="notif-message bangla">{notif.message}</p>
              {#if notif.refTitle}
                <div class="notif-context">
                  <Target size={12} />
                  <span class="bangla">{notif.refTitle}</span>
                </div>
              {/if}
              <span class="notif-time">{timeAgo(notif.createdAt)}</span>
            </div>
            {#if !notif.isRead}
              <span class="notif-dot"></span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>

    <!-- Pagination -->
    {#if !isLoading && totalPages > 1}
      <nav class="pagination">
        <button
          class="page-btn"
          onclick={() => goToPage(pagination.page - 1)}
          disabled={pagination.page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {#each pageNumbers as p}
          {#if p === '...'}
            <span class="page-ellipsis">...</span>
          {:else}
            <button
              class="page-btn"
              class:active={p === pagination.page}
              onclick={() => goToPage(p as number)}
            >
              {p}
            </button>
          {/if}
        {/each}

        <button
          class="page-btn"
          onclick={() => goToPage(pagination.page + 1)}
          disabled={pagination.page === totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </nav>
    {/if}
  </main>
</div>

<style>
  .notif-context {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 5px;
    padding: 3px 8px;
    background: #F6F4EE;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    color: #1F5D50;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .notifications-page {
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    background: #F6F4EE;
    color: #16231F;
  }
  .bangla { font-family: 'Hind Siliguri', sans-serif; }

  .main-content {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 2rem 3rem;
  }
  @media (max-width: 768px) {
    .main-content {
      max-width: 100%;
      padding: 1.5rem 1rem 3rem;
    }
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
  }
  .page-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #153F36;
  }
  .page-sub {
    font-size: 13px;
    color: #5B675F;
    margin-top: 4px;
  }

  .mark-all-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: white;
    border: 1px solid #1F5D50;
    color: #1F5D50;
    border-radius: 9px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Hind Siliguri', sans-serif;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .mark-all-btn:hover:not(:disabled) {
    background: #1F5D50;
    color: white;
  }
  .mark-all-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .filter-tabs {
    display: flex;
    gap: 4px;
    background: #E4EDE9;
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 16px;
    width: fit-content;
  }
  .tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: transparent;
    border: none;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    color: #5B675F;
    cursor: pointer;
    font-family: 'Hind Siliguri', sans-serif;
    transition: all 0.15s;
  }
  .tab-btn.active {
    background: white;
    color: #153F36;
    box-shadow: 0 1px 3px rgba(21,63,54,0.1);
  }
  .tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    background: #E4EDE9;
    color: #5B675F;
    font-family: 'DM Sans', sans-serif;
  }
  .tab-btn.active .tab-count {
    background: #F6F4EE;
    color: #153F36;
  }
  .tab-count.unread {
    background: #B8503F;
    color: white;
  }

  .notif-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .notif-item {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    width: 100%;
    padding: 16px 18px;
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
    font-family: inherit;
  }
  .notif-item:hover {
    border-color: #1F5D50;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(31,93,80,0.08);
  }
  .notif-item.unread {
    background: #FAFEFB;
    border-color: #D7EDE0;
  }

  .unread-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: #1F5D50;
    border-radius: 12px 0 0 12px;
  }

  .notif-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    transition: transform 0.15s;
  }
  .notif-item:hover .notif-icon {
    transform: scale(1.08);
  }

  .notif-content {
    flex: 1;
    min-width: 0;
  }
  .notif-message {
    font-size: 13.5px;
    font-weight: 500;
    color: #16231F;
    line-height: 1.5;
    margin: 0;
    word-break: break-word;
  }
  .notif-item.unread .notif-message {
    font-weight: 600;
    color: #153F36;
  }
  .notif-time {
    display: block;
    font-size: 11.5px;
    color: #8B9790;
    margin-top: 5px;
  }

  .notif-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    background: #1F5D50;
    border-radius: 50%;
    margin-top: 8px;
  }

  .loading-state {
    text-align: center;
    padding: 4rem 1rem;
    color: #5B675F;
  }
  .loading-state p {
    margin-top: 12px;
    font-size: 14px;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    background: white;
    border: 1px dashed #E4EDE9;
    border-radius: 16px;
  }
  .empty-icon-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #F6F4EE;
    color: #8B9790;
    margin-bottom: 16px;
  }
  .empty-title {
    font-family: 'Baloo Da 2', sans-serif;
    font-size: 17px;
    font-weight: 700;
    color: #153F36;
    margin-bottom: 6px;
  }
  .empty-body {
    font-size: 13.5px;
    color: #5B675F;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    margin-top: 24px;
    flex-wrap: wrap;
  }
  .page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    padding: 0 10px;
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 8px;
    color: #5B675F;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
  }
  .page-btn:hover:not(:disabled):not(.active) {
    background: #F6F4EE;
    border-color: #1F5D50;
    color: #1F5D50;
  }
  .page-btn.active {
    background: #1F5D50;
    color: white;
    border-color: #1F5D50;
  }
  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .page-ellipsis {
    padding: 0 4px;
    color: #8B9790;
    font-weight: 600;
  }
</style>