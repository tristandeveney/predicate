<script>
    import {
        personData as allPersonData,
        applicationData,
        schoolData,
        addressData,
    } from "./data.js";

    // --- MOCK DATA SETUP ---
    const personData = allPersonData.slice(0, 4);

    // --- STATE MANAGEMENT ---
    let selectedPersonId = personData[0]?.id || 1;
    let activeTabId = "profile"; // Can be 'profile' or an application ID
    let profileSubTab = "overview"; // 'overview', 'schools', or 'addresses'

    // --- DERIVED DATA ---
    $: selectedPerson = personData.find((p) => p.id === selectedPersonId);

    $: personSchools = schoolData.filter(
        (s) => s.personId === selectedPersonId,
    );
    $: personApplications = applicationData.filter(
        (a) => a.personId === selectedPersonId,
    );
    $: personAddresses = addressData.filter(
        (a) => a.personId === selectedPersonId,
    );

    // When changing person, reset to their profile view to avoid dangling application state
    $: if (selectedPersonId) {
        activeTabId = "profile";
        profileSubTab = "overview";
    }

    // Logic for the status indicator
    $: displayStatus =
        personApplications.length > 0 ? "Applicant" : selectedPerson.status;

    // Finds the specific application to display when an application tab is active
    $: activeApplication = applicationData.find(
        (app) => app.id === activeTabId,
    );

    // Dynamically sets the profile panel color based on the active sub-tab
    $: activeProfileColor = (() => {
        switch (profileSubTab) {
            case "schools":
                return "var(--color-schools)";
            case "addresses":
                return "var(--color-addresses)";
            case "overview":
            default:
                return "var(--color-persons)";
        }
    })();

    // --- UTILITY FUNCTIONS ---
    function toTitleCase(str) {
        if (!str) return "";
        return str
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (char) => char.toUpperCase());
    }
</script>

<div class="explainer-container">
    <div class="top-bar">
        <div class="person-selector">
            <span class="control-label">Select a Person</span>
            <div class="segmented-control">
                {#each personData as person (person.id)}
                    <button
                        class:active={selectedPersonId === person.id}
                        on:click={() => (selectedPersonId = person.id)}
                        >{person.name}</button
                    >
                {/each}
            </div>
        </div>
    </div>

    <div class="main-tabs">
        <div class="tabs-group">
            <button
                class:active={activeTabId === "profile"}
                style={activeTabId === "profile"
                    ? `border-bottom-color: var(--color-persons)`
                    : ""}
                on:click={() => (activeTabId = "profile")}>Profile</button
            >
            {#each personApplications as app (app.id)}
                <button
                    class:active={activeTabId === app.id}
                    style={activeTabId === app.id
                        ? `border-bottom-color: var(--color-apps)`
                        : ""}
                    on:click={() => (activeTabId = app.id)}>{app.term}</button
                >
            {/each}
        </div>
        <div class="status-indicator">
            <span class="status-label">{displayStatus}</span>
            <span class="ref-id">Ref ID: {selectedPerson.id}</span>
        </div>
    </div>

    <div class="tab-content-wrapper">
        {#if activeTabId === "profile"}
            <div class="profile-grid">
                <div
                    class="profile-content-area panel"
                    style="--list-color: {activeProfileColor};"
                >
                    {#key profileSubTab}
                        <div>
                            {#if profileSubTab === "overview"}
                                <h3>Biographic</h3>
                                <p>
                                    <strong>Name:</strong>
                                    {selectedPerson.name}<br />
                                    <strong>Email:</strong>
                                    {selectedPerson.email}<br />
                                    <strong>DOB:</strong>
                                    {selectedPerson.dob}
                                </p>
                                <hr />
                                <h3>Contact</h3>
                                {#each personAddresses as address}
                                    <p>
                                        <strong>{address.type} Address:</strong
                                        ><br />
                                        {address.street}<br />
                                        {address.city}, {address.state}
                                    </p>
                                {/each}
                            {:else if profileSubTab === "schools"}
                                <h3>Academic History</h3>
                                <table class="results-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Level</th>
                                            <th>Code</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each personSchools as school (school.id)}
                                            <tr>
                                                <td>{school.name}</td>
                                                <td>{school.levelOfStudy}</td>
                                                <td>{school.code}</td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            {:else if profileSubTab === "addresses"}
                                <h3>Addresses</h3>
                                <table class="results-table">
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>Street</th>
                                            <th>City</th>
                                            <th>State</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each personAddresses as address (address.id)}
                                            <tr>
                                                <td>{address.type}</td>
                                                <td>{address.street}</td>
                                                <td>{address.city}</td>
                                                <td>{address.state}</td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            {/if}
                        </div>
                    {/key}
                </div>
                <div class="profile-sub-nav">
                    <button
                        class:active={profileSubTab === "overview"}
                        style={profileSubTab === "overview"
                            ? `background-color: var(--color-persons)`
                            : ""}
                        on:click={() => (profileSubTab = "overview")}
                        >Overview</button
                    >
                    <button
                        class:active={profileSubTab === "schools"}
                        style={profileSubTab === "schools"
                            ? `background-color: var(--color-schools)`
                            : ""}
                        on:click={() => (profileSubTab = "schools")}
                        >Schools</button
                    >
                    <button
                        class:active={profileSubTab === "addresses"}
                        style={profileSubTab === "addresses"
                            ? `background-color: var(--color-addresses)`
                            : ""}
                        on:click={() => (profileSubTab = "addresses")}
                        >Addresses</button
                    >
                </div>
            </div>
        {:else if activeApplication}
            <div
                class="application-content panel"
                style="--list-color: var(--color-apps);"
            >
                <h3>Application Details</h3>
                <table class="results-table">
                    <tbody>
                        {#each Object.entries(activeApplication) as [key, value]}
                            {#if key !== "personId" && key !== "id"}
                                <tr>
                                    <th>{toTitleCase(key)}</th>
                                    <td>{value}</td>
                                </tr>
                            {/if}
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>

<style>
    .explainer-container {
        max-width: 1200px;
        margin: 2rem auto;
        font-family: var(--font-body);
        --color-persons: #eef2ff; /* Light Indigo */
        --color-apps: #f0fdf4; /* Light Green */
        --color-schools: #fefce8; /* Light Yellow */
        --color-addresses: #fdf2f8; /* Light Violet */
    }
    .panel {
        background-color: var(--list-color, var(--color-background-alt));
        border-radius: 8px;
        border: none;
        padding: 1.5rem;
    }
    .top-bar {
        margin-bottom: 2rem;
    }
    .status-indicator {
        color: var(--color-text-light);
        font-size: 0.9rem;
        white-space: nowrap;
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
    }
    .status-label {
        font-weight: 600;
        color: var(--color-text);
        font-size: 1.1rem;
    }
    .control-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--color-text-light);
        display: block;
        margin-bottom: 0.75rem;
    }
    .segmented-control {
        display: inline-flex;
        background-color: #e2e8f0;
        border-radius: 6px;
        padding: 4px;
    }
    .segmented-control button {
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        background: transparent;
        cursor: pointer;
        font-weight: 500;
        color: var(--color-text);
        white-space: nowrap;
    }
    .segmented-control button.active {
        background-color: white;
        color: var(--color-primary);
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .main-tabs {
        border-bottom: 1px solid var(--color-accent-light);
        margin-bottom: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .tabs-group {
        display: flex;
    }
    .main-tabs button {
        padding: 0.75rem 1.25rem;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 1.1rem;
        font-weight: 500;
        color: var(--color-text-light);
        border-bottom: 3px solid transparent;
        margin-bottom: -1px;
    }
    .main-tabs button.active {
        color: var(--color-primary);
        font-weight: 600;
    }
    .profile-grid {
        display: grid;
        grid-template-columns: 1fr 200px;
        gap: 1.5rem;
        align-items: start;
    }
    .profile-content-area {
        grid-column: 1 / 2;
    }
    .profile-sub-nav {
        grid-column: 2 / 3;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .profile-sub-nav button {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid transparent;
        border-radius: 5px;
        background: none;
        cursor: pointer;
        text-align: left;
        font-size: 0.95rem;
        color: var(--color-text);
    }
    .profile-sub-nav button:hover {
        background-color: #f0f4f8;
    }
    .profile-sub-nav button.active {
        font-weight: 600;
        color: var(--color-text-dark);
    }
    .application-content {
        max-width: 800px;
    }
    .results-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
    }
    .results-table th,
    .results-table td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid var(--color-accent-light);
    }
    .results-table thead th {
        font-weight: 600;
        background-color: var(--list-color, var(--color-background-alt));
    }
    .results-table tbody tr th {
        font-weight: 600;
        width: 25%;
    }
</style>
