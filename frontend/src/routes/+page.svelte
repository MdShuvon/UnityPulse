<script>
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  onMount(() => {
    goto("/home");
  });
</script>

<div style="text-align: center; padding: 50px;">
  <p>Redirecting...</p>
</div>
