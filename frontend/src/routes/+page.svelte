<script lang="ts">
  import { onMount } from "svelte";

  let users: any[] = $state([]);
  let loading = $state(true);
  let error = $state("");
  let newEmail = $state("");
  let newName = $state("");
  let addError = $state("");

  onMount(async () => {
    await fetchUsers();
  });

  async function fetchUsers() {
    try {
      const res = await fetch("http://localhost:3001/users");
      if (!res.ok) throw new Error("Failed");
      users = await res.json();
    } catch (e) {
      error = "⚠️ Backend not running? Start it first on port 3001";
    } finally {
      loading = false;
    }
  }

  async function addUser() {
    if (!newEmail) {
      addError = "Email is required";
      return;
    }

    addError = "";

    try {
      const res = await fetch("http://localhost:3001/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: "123456",
          name: newName,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server returned ${res.status}: ${errText}`);
      }

      newEmail = "";
      newName = "";
      await fetchUsers();
    } catch (e: any) {
      console.error("Add user failed:", e);
      addError = e.message || "Failed to add user";
    }
  }
</script>

<main class="container">
  <h1>⚡ UnityPulse Dashboard</h1>

  <div class="card">
    <h2>➕ Add New User</h2>
    
    {#if addError}
      <p class="error">❌ {addError}</p>
    {/if}
    
    <input type="email" placeholder="Email" bind:value={newEmail} />
    <input type="text" placeholder="Name (optional)" bind:value={newName} />
    <button onclick={addUser}>Add User</button>
  </div>

  <div class="card">
    <h2>👥 Users ({users.length})</h2>

    {#if loading}
      <p>Loading users...</p>
    {:else if error}
      <p class="error">{error}</p>
    {:else if users.length === 0}
      <p>No users found. Add one above!</p>
    {:else}
      <ul>
        {#each users as user}
          <li>
            <strong>{user.email}</strong>
            {#if user.name} — {user.name}{/if}
            <span class="date">{new Date(user.createdAt).toLocaleDateString()}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</main>

<style>
  .container {
    max-width: 600px;
    margin: 40px auto;
    padding: 20px;
    font-family: system-ui;
  }
  .card {
    background: #f5f5f5;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 20px;
  }
  h1 {
    color: #333;
    text-align: center;
  }
  h2 {
    margin-top: 0;
    color: #555;
  }
  input {
    padding: 10px;
    margin-right: 8px;
    border: 1px solid #ddd;
    border-radius: 6px;
    width: 200px;
  }
  button {
    padding: 10px 20px;
    background: #007acc;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  button:hover {
    background: #005fa3;
  }
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    padding: 12px;
    background: white;
    margin-bottom: 8px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
  }
  .date {
    color: #888;
    font-size: 0.9em;
  }
  .error {
    color: #d32f2f;
    background: #ffebee;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 10px;
  }
</style>