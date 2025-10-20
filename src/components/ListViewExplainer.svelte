<script>
    import {
        personData as allPersonData,
        applicationData,
        schoolData,
        addressData,
    } from "./data.js";

    const personData = allPersonData.slice(0, 4);
    let currentView = personData[0].id;

    $: personsToShow =
        currentView === "all"
            ? personData
            : personData.filter((p) => p.id === currentView);

    $: applicationsToShow =
        currentView === "all"
            ? applicationData.filter((a) =>
                  personData.some((p) => p.id === a.personId),
              )
            : applicationData.filter((a) => a.personId === currentView);

    $: schoolsToShow =
        currentView === "all"
            ? schoolData.filter((s) =>
                  personData.some((p) => p.id === s.personId),
              )
            : schoolData.filter((s) => s.personId === currentView);

    $: addressesToShow =
        currentView === "all"
            ? addressData.filter((ad) =>
                  personData.some((p) => p.id === ad.personId),
              )
            : addressData.filter((ad) => ad.personId === currentView);

    $: selectedPerson = personData.find((p) => p.id === currentView);

    $: dataScopeLabel =
        currentView === "all"
            ? `for All ${personData.length} People`
            : `for ${selectedPerson?.name}`;
</script>

<div class="explainer-container">
    <div class="controls-bar panel">
        <div class="control-group">
            <span class="control-label">Select a View</span>
            <div class="segmented-control">
                {#each personData as person (person.id)}
                    <button
                        class:active={currentView === person.id}
                        on:click={() => (currentView = person.id)}
                    >
                        {person.name}
                    </button>
                {/each}

                <button
                    class:active={currentView === "all"}
                    on:click={() => (currentView = "all")}
                    class="all-button"
                >
                    All {personData.length} People
                </button>
            </div>
        </div>
    </div>

    <div class="list-view-grid">
        <div
            class="results-panel panel"
            style="--list-color: var(--color-persons);"
        >
            <h3 class="panel-header">
                Persons <small>{dataScopeLabel}</small>
            </h3>
            <div class="results-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each personsToShow as person (person.id)}
                            <tr>
                                <td>{person.id}</td>
                                <td>{person.name}</td>
                                <td>{person.email}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>

        <div
            class="results-panel panel"
            style="--list-color: var(--color-apps);"
        >
            <h3 class="panel-header">
                Applications <small>{dataScopeLabel}</small>
            </h3>
            <div class="results-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            {#if currentView === "all"}<th>Person ID</th>{/if}
                            <th>Major</th>
                            <th>Term</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each applicationsToShow as item (item.id)}
                            <tr>
                                {#if currentView === "all"}<td
                                        >{item.personId}</td
                                    >{/if}
                                <td>{item.major}</td>
                                <td>{item.term}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>

        <div
            class="results-panel panel"
            style="--list-color: var(--color-schools);"
        >
            <h3 class="panel-header">
                Schools <small>{dataScopeLabel}</small>
            </h3>
            <div class="results-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            {#if currentView === "all"}<th>Person ID</th>{/if}
                            <th>School Name</th>
                            <th>Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each schoolsToShow as school (school.id)}
                            <tr>
                                {#if currentView === "all"}<td
                                        >{school.personId}</td
                                    >{/if}
                                <td>{school.name}</td>
                                <td>{school.levelOfStudy}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>

        <div
            class="results-panel panel"
            style="--list-color: var(--color-addresses);"
        >
            <h3 class="panel-header">
                Addresses <small>{dataScopeLabel}</small>
            </h3>
            <div class="results-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            {#if currentView === "all"}<th>Person ID</th>{/if}
                            <th>Type</th>
                            <th>City</th>
                            <th>State</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each addressesToShow as address (address.id)}
                            <tr>
                                {#if currentView === "all"}<td
                                        >{address.personId}</td
                                    >{/if}
                                <td>{address.type}</td>
                                <td>{address.city}</td>
                                <td>{address.state}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<style>
    .explainer-container {
        max-width: 1200px;
        margin: 2rem auto;
        font-family: system-ui, sans-serif;
        --color-persons: #eef2ff;
        --color-apps: #f0fdf4;
        --color-schools: #fefce8;
        --color-addresses: #fdf2f8;
    }
    .panel {
        background-color: #fff;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    }
    .controls-bar {
        padding: 1.5rem;
        margin-bottom: 2rem;
    }
    .control-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .control-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: #64748b;
    }
    /* UPDATED: Buttons are now grouped in a single visual block */
    .segmented-control {
        display: inline-flex; /* Shrinks container to fit content */
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
        color: #334155;
        white-space: nowrap;
    }
    .segmented-control button.active {
        background-color: white;
        color: #334155;
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    /* UPDATED: "All" button is now styled consistently with a subtle separator */
    .all-button {
        border-left: 1px solid #cbd5e1;
        margin-left: 6px;
        padding-left: 12px;
        border-radius: 5px; /* Ensures consistent radius */
    }
    .list-view-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
        align-items: start;
    }
    @media (max-width: 900px) {
        .list-view-grid {
            grid-template-columns: 1fr;
        }
    }
    .results-panel {
        padding: 1.5rem;
        background-color: var(--list-color, #fff);
        border: none;
    }
    .panel-header {
        margin-top: 0;
        margin-bottom: 1rem;
    }
    .panel-header small {
        font-weight: 400;
        color: #64748b;
    }
    .results-container {
        overflow-x: auto;
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
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        white-space: nowrap;
    }
    .results-table thead th {
        font-weight: 600;
    }
</style>
