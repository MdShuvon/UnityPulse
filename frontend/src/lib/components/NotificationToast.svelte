<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { X, Bell, CheckCircle2, XCircle, Heart, Users, Briefcase, Mail, Target, AlertCircle, Inbox } from 'lucide-svelte';

  let toast = $state<any>(null);
  let isVisible = $state(false);

  function getIcon(type: string) {
    const map: Record<string, any> = {
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
    return map[type] || Bell;
  }

  function getIconColor(type: string): string {
    const map: Record<string, string> = {
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
    return map[type] || '#5B675F';
  }

  function getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      TASK_APPROVED:          'Task Approved',
      TASK_REJECTED:          'Task Rejected',
      TASK_SUBMITTED:         'Task Submission',
      TASK_ASSIGNED:          'New Task',
      DONATION_RECEIVED:      'Donation Received',
      CAUSE_JOIN_APPROVED:    'Cause Join Approved',
      CAUSE_JOIN_REJECTED:    'Cause Join Rejected',
      PROJECT_ISSUE_REPORTED: 'Project Issue',
      JOB_APPLICATION_STATUS: 'Application Update',
      GENERAL:                'Notification',
    };
    return map[type] || 'Notification';
  }

  function dismiss() {
    isVisible = false;
    setTimeout(() => {
      toast = null;
      const url = new URL(window.location.href);
      url.searchParams.delete('notifId');
      url.searchParams.delete('notifType');
      url.searchParams.delete('notifMsg');
      url.searchParams.delete('notifTitle');  // ← ADD
      goto(url.pathname + url.search, { replaceState: true, noScroll: true });
    }, 300);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') dismiss();
  }

  // URL query param থেকে toast data নাও
  $effect(() => {
    const params = $page.url.searchParams;
    const notifId = params.get('notifId');
    const notifType = params.get('notifType');
    const notifMsg = params.get('notifMsg');
    const notifTitle = params.get('notifTitle');

    if (notifId && notifType && notifMsg) {
      if (toast?.id === notifId && isVisible) return;

      toast = {
        id: notifId,
        type: notifType,
        message: decodeURIComponent(notifMsg),
        refTitle: notifTitle ? decodeURIComponent(notifTitle) : null,
      };
      isVisible = true;
    } else {
      // Query param নেই → toast hide
      if (toast) {
        isVisible = false;
        setTimeout(() => { toast = null; }, 300);
      }
    }
  });
</script>

{#if toast}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="notif-toast"
    class:visible={isVisible}
    role="alert"
    tabindex="-1"
    onkeydown={handleKeydown}
  >
    <div class="toast-icon" style={`background: ${getIconColor(toast.type)}15; color: ${getIconColor(toast.type)};`}>
      {#if getIcon(toast.type) === CheckCircle2}
        <CheckCircle2 size={20} />
      {:else if getIcon(toast.type) === XCircle}
        <XCircle size={20} />
      {:else if getIcon(toast.type) === Heart}
        <Heart size={20} />
      {:else if getIcon(toast.type) === Users}
        <Users size={20} />
      {:else if getIcon(toast.type) === Briefcase}
        <Briefcase size={20} />
      {:else if getIcon(toast.type) === Mail}
        <Mail size={20} />
      {:else if getIcon(toast.type) === Target}
        <Target size={20} />
      {:else if getIcon(toast.type) === AlertCircle}
        <AlertCircle size={20} />
      {:else if getIcon(toast.type) === Inbox}
        <Inbox size={20} />
      {:else}
        <Bell size={20} />
      {/if}
    </div>

    <div class="toast-content">
      <div class="toast-label" style={`color: ${getIconColor(toast.type)};`}>
        {getTypeLabel(toast.type)}
      </div>
      <div class="toast-message bangla">{toast.message}</div>
      {#if toast.refTitle}
        <div class="toast-context">
          <span class="bangla">{toast.refTitle}</span>
        </div>
      {/if}
    </div>

    <button class="toast-close" onclick={dismiss} aria-label="Dismiss">
      <X size={16} />
    </button>

    <!-- <div class="toast-progress"></div> -->
  </div>
{/if}

<style>
  .toast-context {
    display: inline-block;
    margin-top: 6px;
    padding: 4px 10px;
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
  .notif-toast {
    position: fixed;
    top: 84px;
    right: 24px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 40px 14px 14px;
    background: white;
    border: 1px solid #E4EDE9;
    border-radius: 14px;
    box-shadow: 0 12px 32px rgba(21,63,54,0.15), 0 2px 8px rgba(21,63,54,0.08);
    max-width: 380px;
    min-width: 300px;
    z-index: 9999;
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
    transition: opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    overflow: hidden;
  }

  .notif-toast.visible {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .toast-icon {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
  }

  .toast-content {
    flex: 1;
    min-width: 0;
  }

  .toast-label {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }

  .toast-message {
    font-family: 'Hind Siliguri', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #16231F;
    line-height: 1.45;
    word-break: break-word;
  }

  .toast-close {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: #8B9790;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s;
  }

  .toast-close:hover {
    background: #F6F4EE;
    color: #B8503F;
  }

  @media (max-width: 768px) {
    .notif-toast {
      top: auto;
      bottom: 80px;
      right: 12px;
      left: 12px;
      max-width: none;
      min-width: 0;
      transform: translateY(20px) scale(0.95);
    }
    .notif-toast.visible {
      transform: translateY(0) scale(1);
    }
  }
</style>