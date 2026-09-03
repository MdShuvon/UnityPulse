<!-- src/lib/components/CommentItem.svelte -->
<script lang="ts">
  import { Heart, MessageCircle, X, Send } from 'lucide-svelte';
  import CommentItem from './CommentItem.svelte';

  let {
    comment,
    postId,
    currentUserId,
    likedComments,
    editingCommentId,
    editingCommentText,
    openCommentMenuId,
    replyTo,
    replyText,
    showReplyInput,
    depth = 0,
    onToggleLike,
    onStartReply,
    onSubmitReply,
    onCancelReply,
    onToggleMenu,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete
  }: {
    comment: any;
    postId: string;
    currentUserId: string;
    likedComments: Set<string>;
    editingCommentId: string | null;
    editingCommentText: string;
    openCommentMenuId: string | null;
    replyTo: { id: string; name: string } | null;
    replyText: string;
    showReplyInput: boolean;
    depth?: number;
    onToggleLike: (commentId: string) => void;
    onStartReply: (comment: any) => void;
    onSubmitReply: () => void;
    onCancelReply: () => void;
    onToggleMenu: (commentId: string) => void;
    onStartEdit: (comment: any) => void;
    onSaveEdit: (commentId: string, content: string) => void;
    onCancelEdit: () => void;
    onDelete: (commentId: string) => void;
  } = $props();

  function decodeHtml(html: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  }

  function getInitials(name: string): string {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  }
</script>

<div class="comment-item" style="margin-left: {depth > 0 ? '38px' : '0'};">
  <div class="comment-row">
    <div class="mini-avatar-sm">{getInitials(comment.user?.name || '?')}</div>
    <div class="comment-bubble" class:reply-bubble={depth > 0}>
      <span class="comment-name">{comment.user?.name}</span>
      
      {#if editingCommentId === comment.id}
        <textarea class="edit-input bangla" bind:value={editingCommentText} rows="2"></textarea>
        <div class="edit-actions">
          <button class="save-edit-btn" onclick={() => onSaveEdit(comment.id, editingCommentText)}>Save</button>
          <button class="cancel-edit-btn" onclick={onCancelEdit}>Cancel</button>
        </div>
      {:else}
        <p class="comment-text bangla" style="white-space: pre-wrap;">{decodeHtml(comment.content)}</p>
      {/if}
      
      <div class="comment-actions-row">
        <button class="comment-action" class:liked={likedComments.has(comment.id)}
          onclick={() => onToggleLike(comment.id)}>
          <Heart size={12} fill={likedComments.has(comment.id) ? '#B8503F' : 'none'} /> 
          Like ({comment._count?.likes || 0})
        </button>
        <button class="comment-action" onclick={() => onStartReply(comment)}>
          <MessageCircle size={12} /> Reply
        </button>
        {#if comment.user?.id === currentUserId}
          <button class="comment-three-dot" onclick={() => onToggleMenu(comment.id)}>⋯</button>
          {#if openCommentMenuId === comment.id}
            <div class="dropdown-menu comment-dropdown">
              <button class="dropdown-item" onclick={() => onStartEdit(comment)}>✏️ Edit</button>
              <button class="dropdown-item delete-item" onclick={() => onDelete(comment.id)}>🗑️ Delete</button>
            </div>
          {/if}
        {/if}
      </div>
      
      {#if showReplyInput && replyTo?.id === comment.id}
        <div class="reply-input-row">
          <div class="mini-avatar-sm">{getInitials(currentUserId)}</div>
          <textarea class="comment-textarea bangla" placeholder="রিপ্লাই লিখুন..." 
            bind:value={replyText} rows="1"
            onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmitReply(); } }}
          ></textarea>
          <button class="comment-send-btn" onclick={onSubmitReply}><Send size={14} /></button>
          <button class="cancel-reply-btn" onclick={onCancelReply}><X size={14} /></button>
        </div>
      {/if}
    </div>
  </div>
  
  {#if comment.replies?.length > 0}
    {#each comment.replies as reply}
      <CommentItem
        comment={reply}
        postId={postId}
        currentUserId={currentUserId}
        likedComments={likedComments}
        editingCommentId={editingCommentId}
        editingCommentText={editingCommentText}
        openCommentMenuId={openCommentMenuId}
        replyTo={replyTo}
        replyText={replyText}
        showReplyInput={showReplyInput}
        depth={depth + 1}
        onToggleLike={onToggleLike}
        onStartReply={onStartReply}
        onSubmitReply={onSubmitReply}
        onCancelReply={onCancelReply}
        onToggleMenu={onToggleMenu}
        onStartEdit={onStartEdit}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onDelete={onDelete}
      />
    {/each}
  {/if}
</div>

<style>
  .comment-item { position: relative; }
  .comment-row { display: flex; gap: 8px; margin-bottom: 10px; }
  .mini-avatar-sm {
    width: 30px; height: 30px; border-radius: 50%;
    background: #1F5D50; color: white;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Baloo Da 2', sans-serif; font-size: 12px; font-weight: 700; flex-shrink: 0;
  }
  .comment-bubble { flex: 1; background: #F6F4EE; border-radius: 14px; padding: 9px 14px; position: relative; }
  .reply-bubble { background: #F0F4F2; border-left: 3px solid #E9A23B; }
  .comment-name { font-size: 12.5px; font-weight: 700; display: block; }
  .comment-text { font-size: 13.5px; margin-top: 2px; }
  .comment-actions-row { display: flex; align-items: center; gap: 14px; margin-top: 5px; }
  .comment-action { display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: #5B675F; background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
  .comment-action:hover { background: #E4EDE9; }
  .comment-action.liked { color: #B8503F; }
  .comment-three-dot { background: none; border: none; cursor: pointer; font-size: 16px; color: #8B9790; padding: 2px 6px; border-radius: 50%; position: relative; }
  .comment-three-dot:hover { background: #E4EDE9; }
  .dropdown-menu { position: absolute; right: 0; top: 100%; background: white; border: 1px solid #E4EDE9; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); min-width: 120px; z-index: 100; }
  .dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 14px; background: none; border: none; cursor: pointer; font-size: 13px; font-family: 'Hind Siliguri', sans-serif; color: #16231F; }
  .dropdown-item:hover { background: #F6F4EE; }
  .delete-item { color: #B8503F; }
  .delete-item:hover { background: #FDF0ED; }
  .edit-input { width: 100%; padding: 8px 10px; border: 1px solid #1F5D50; border-radius: 8px; font-size: 13px; outline: none; font-family: 'Hind Siliguri', sans-serif; resize: none; margin-top: 4px; }
  .edit-actions { display: flex; gap: 6px; margin-top: 4px; }
  .save-edit-btn { padding: 4px 12px; background: #1F5D50; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; }
  .cancel-edit-btn { padding: 4px 12px; background: #F6F4EE; color: #5B675F; border: 1px solid #E4EDE9; border-radius: 6px; font-size: 12px; cursor: pointer; }
  .reply-input-row { display: flex; align-items: center; gap: 8px; margin: 8px 0 0 0; }
  .comment-textarea { flex: 1; padding: 8px 12px; border: 1px solid #E4EDE9; border-radius: 12px; font-size: 13px; outline: none; font-family: 'Hind Siliguri', sans-serif; resize: none; min-height: 36px; max-height: 100px; line-height: 1.5; }
  .comment-send-btn { width: 32px; height: 32px; border-radius: 50%; background: #1F5D50; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .cancel-reply-btn { width: 28px; height: 28px; border-radius: 50%; background: #FDF0ED; color: #B8503F; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .bangla { font-family: 'Hind Siliguri', sans-serif; }
</style>