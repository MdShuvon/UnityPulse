<script lang="ts">
  let { 
    href, 
    children 
  }: { 
    href: string; 
    children?: import('svelte').Snippet;
  } = $props();
</script>

<a {href} data-sveltekit-preload-data="hover">
  {#if children}
    {@render children()}
  {/if}
</a>