<script>
    import { personData, schoolData, addressData } from "./data.js";
    import { fade, fly } from "svelte/transition";
    import { tick } from "svelte";

    // --- CONFIG & UTILS ---
    const COLOR_MAP = {
        Person: "var(--color-persons)",
        School: "var(--color-schools)",
        Address: "var(--color-addresses)",
    };

    // --- STATE MANAGEMENT ---
    let selectedPersonId = 1; // Start with Ben
    let activeJoins = {
        School: false,
        Address: false,
    };

    // --- DOM REFS for SVG ---
    let containerEl;
    let personCardEl;
    let schoolRowRefs = [];
    let addressRowRefs = [];
    let connectorPaths = [];

    // --- DERIVED DATA ---
    $: selectedPerson = personData.find((p) => p.id === selectedPersonId);
    $: personSchools = schoolData.filter(
        (s) => s.personId === selectedPersonId,
    );
    $: personAddresses = addressData.filter(
        (a) => a.personId === selectedPersonId,
    );

    // --- REACTIVE LOGIC ---

    // Reset joins when person changes
    $: if (selectedPersonId) {
        activeJoins = { School: false, Address: false };
    }

    // Reset refs array when data changes to avoid stale elements
    $: if (personSchools) schoolRowRefs = [];
    $: if (personAddresses) addressRowRefs = [];

    // Determine the single "top" record for each joined table
    $: joinedRecords = {
        ...(activeJoins.School &&
            personSchools.length > 0 && { School: personSchools[0] }),
        ...(activeJoins.Address &&
            personAddresses.length > 0 && { Address: personAddresses[0] }),
    };

    $: previewItems = (() => {
        let items = [];
        const personPrefix = "person";
        for (const [key, value] of Object.entries(selectedPerson)) {
            items.push({
                key: `${personPrefix}.${key}`,
                value,
                origin: "Person",
            });
        }
        for (const [origin, record] of Object.entries(joinedRecords)) {
            if (record) {
                const prefix = origin.toLowerCase();
                for (const [key, value] of Object.entries(record)) {
                    if (key !== "id" && key !== "personId") {
                        items.push({
                            key: `${prefix}.${key}`,
                            value,
                            origin,
                        });
                    }
                }
            }
        }
        return items;
    })();

    // --- SVG CONNECTOR LOGIC ---

    function getConnectorPath(sourceEl, targetEl, color) {
        if (!sourceEl || !targetEl || !containerEl) return null;
        const containerRect = containerEl.getBoundingClientRect();
        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const startX = sourceRect.right - containerRect.left;
        const startY =
            sourceRect.top - containerRect.top + sourceRect.height / 2;
        const endX = targetRect.left - containerRect.left;
        const endY = targetRect.top - containerRect.top + targetRect.height / 2;
        const handleOffset = (endX - startX) * 0.5;
        const d = `M ${startX} ${startY} C ${
            startX + handleOffset
        } ${startY}, ${endX - handleOffset} ${endY}, ${endX} ${endY}`;
        return { d, color };
    }

    $: {
        const updatePaths = async () => {
            await tick();
            const newPaths = [];
            if (activeJoins.School && schoolRowRefs[0]) {
                const path = getConnectorPath(
                    personCardEl,
                    schoolRowRefs[0],
                    COLOR_MAP.School,
                );
                if (path) newPaths.push(path);
            }
            if (activeJoins.Address && addressRowRefs[0]) {
                const path = getConnectorPath(
                    personCardEl,
                    addressRowRefs[0],
                    COLOR_MAP.Address,
                );
                if (path) newPaths.push(path);
            }
            connectorPaths = newPaths;
        };
        if (personCardEl) {
            updatePaths();
        }
    }

    // --- HANDLERS ---
    function toggleJoin(tableName) {
        activeJoins = {
            ...activeJoins,
            [tableName]: !activeJoins[tableName],
        };
    }
</script>

<div class="explainer-container" bind:this={containerEl}>
    <svg class="connector-svg">
        {#each connectorPaths as path (path.d)}
            <path
                class="connector-path"
                d={path.d}
                style="--path-color: {path.color};"
                in:fade={{ duration: 300 }}
            />
        {/each}
    </svg>

    <div class="live-preview-container panel">
        <h3 class="panel-header">Available Data</h3>
        <div class="preview-grid">
            {#each previewItems as item (item.key)}
                <div
                    class="preview-item"
                    style="background-color: {COLOR_MAP[item.origin]};"
                    in:fly={{ y: 10, duration: 200 }}
                >
                    <div class="preview-key">{item.key}</div>
                    <div class="preview-value">{item.value}</div>
                </div>
            {/each}
        </div>
    </div>

    <div class="controls-bar">
        <span class="control-label">Select a Person</span>
        <div class="segmented-control">
            {#each personData.slice(0, 2) as person (person.id)}
                <button
                    class:active={selectedPersonId === person.id}
                    on:click={() => (selectedPersonId = person.id)}
                    >{person.name}</button
                >
            {/each}
        </div>
    </div>

    <div class="data-view-grid">
        <div
            class="results-panel panel base-record"
            style="--list-color: var(--color-persons);"
        >
            <h3 class="panel-header">Person Record</h3>
            <div class="person-card" bind:this={personCardEl}>
                <strong>Name:</strong>
                {selectedPerson.name}<br />
                <strong>Email:</strong>
                {selectedPerson.email}<br />
                <strong>DOB:</strong>
                {selectedPerson.dob}
            </div>
        </div>

        <div class="related-data">
            <div
                class="results-panel panel"
                style="--list-color: var(--color-schools);"
            >
                <div class="panel-header-flex">
                    <h3 class="panel-header">Schools</h3>
                    <button
                        class="btn join-btn"
                        class:active={activeJoins.School}
                        on:click={() => toggleJoin("School")}
                    >
                        {#if activeJoins.School}Joined{:else}Join{/if}
                    </button>
                </div>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each personSchools as school, i (school.id)}
                            <tr
                                class:highlighted={activeJoins.School &&
                                    i === 0}
                                bind:this={schoolRowRefs[i]}
                            >
                                <td>{school.name}</td>
                                <td>{school.levelOfStudy}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <div
                class="results-panel panel"
                style="--list-color: var(--color-addresses);"
            >
                <div class="panel-header-flex">
                    <h3 class="panel-header">Addresses</h3>
                    <button
                        class="btn join-btn"
                        class:active={activeJoins.Address}
                        on:click={() => toggleJoin("Address")}
                    >
                        {#if activeJoins.Address}Joined{:else}Join{/if}
                    </button>
                </div>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>City</th>
                            <th>State</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each personAddresses as address, i (address.id)}
                            <tr
                                class:highlighted={activeJoins.Address &&
                                    i === 0}
                                bind:this={addressRowRefs[i]}
                            >
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
    /* --- Base Styles (Shared) --- */
    .explainer-container {
        position: relative;
        max-width: 1200px;
        margin: 2rem auto;
        font-family: var(--font-body);
        --color-persons: #eef2ff;
        --color-apps: #f0fdf4;
        --color-schools: #fefce8;
        --color-addresses: #fdf2f8;
    }
    .panel {
        background-color: var(--color-background-alt);
        border-radius: 8px;
        border: 1px solid var(--color-accent-light);
    }
    .panel-header {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
    }
    .results-panel {
        padding: 1.5rem;
        background-color: var(--list-color, var(--color-background-alt));
        border: none;
    }
    .results-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
        margin-top: 1rem;
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
    /* --- SVG Connector Styles --- */
    .connector-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
    }
    .connector-path {
        stroke: color-mix(in srgb, var(--path-color) 80%, black);
        stroke-width: 2.5px;
        fill: none;
        stroke-dasharray: 6 4;
        animation: dash 10s linear infinite;
    }
    @keyframes dash {
        to {
            stroke-dashoffset: -100;
        }
    }
    /* --- Controls --- */
    .controls-bar {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
    }
    .control-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--color-text-light);
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

    /* --- Live Preview Bar --- */
    .live-preview-container {
        padding: 1.5rem;
        margin-bottom: 2rem;
        border: 2px solid var(--color-secondary);
    }
    .preview-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 1rem;
    }
    .preview-item {
        border-radius: 4px;
        padding: 0.4rem 0.7rem;
        font-size: 0.85rem;
        color: var(--color-text-dark);
        border: 1px solid rgba(0, 0, 0, 0.1);
    }
    .preview-key {
        font-weight: 600;
        color: var(--color-primary);
        font-size: 0.75rem;
        margin-bottom: 0.1rem;
        font-family: var(--font-mono);
    }

    /* --- Data Layout & Highlighting --- */
    .data-view-grid {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 2rem;
        align-items: start;
    }
    .base-record {
        border: 2px solid color-mix(in srgb, var(--color-persons) 60%, black);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .person-card {
        margin-top: 1rem;
        font-size: 0.95rem;
        line-height: 1.6;
    }
    .related-data {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }
    .panel-header-flex {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .join-btn {
        padding: 0.4rem 1rem;
        font-size: 0.85rem;
        font-weight: 600;
        background-color: #e2e8f0;
        color: #475569;
        border: 1px solid transparent;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .join-btn:hover {
        background-color: #cbd5e1;
    }
    .join-btn.active {
        background-color: var(--color-primary);
        color: white;
    }
    .results-table tbody tr.highlighted {
        outline: 3px solid
            color-mix(in srgb, var(--list-color, black) 40%, black);
        background-color: white;
        font-weight: 600;
    }
    .results-table tbody tr {
        transition:
            background-color 0.2s ease,
            outline 0.2s ease;
    }
</style>
