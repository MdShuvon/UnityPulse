<script>
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  onMount(() => {
    goto("/dashboard");
  });
</script>

<div style="text-align: center; padding: 50px;">
  <p>Redirecting...</p>
</div>
