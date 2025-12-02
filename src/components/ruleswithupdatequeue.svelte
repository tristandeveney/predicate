<script>
    import { personData } from "./data.js";
    import { fly, fade, slide } from "svelte/transition";

    // --- CONFIG & UTILS ---
    const MAJORS = [
        "Biology",
        "Business Administration",
        "Computer Science",
        "Creative Writing",
        "Data Science",
        "Economics",
        "English",
        "Finance",
        "History",
        "International Relations",
        "Marketing",
        "Mechanical Engineering",
        "Neuroscience",
        "Nursing",
        "Political Science",
        "Psychology",
    ];

    const STAFF_OPTIONS = [
        "Alice Jones",
        "Bob Smith",
        "Charlie Day",
        "Default Dave",
    ];

    // Initialize local state
    let people = personData.slice(0, 8).map((p) => ({
        ...p,
        assignedStaff: null,
        staffLocked: false,
        name: p.name,
    }));

    // Converted to reactive state for editing
    let rules = [
        {
            id: 1,
            priority: 1,
            name: "Do Nothing",
            type: "system",
            filterLabel: "Staff Assigned Locked = Yes",
            actionLabel: "Do Nothing",
            check: (p) => p.staffLocked === true,
            resultStaff: null,
        },
        {
            id: 2,
            priority: 5,
            name: "Bio Assignment",
            type: "configurable",
            targetMajor: "Biology",
            resultStaff: "Alice Jones",
        },
        {
            id: 3,
            priority: 10,
            name: "History Assignment",
            type: "configurable",
            targetMajor: "History",
            resultStaff: "Bob Smith",
        },
        {
            id: 4,
            priority: 15,
            name: "CS Assignment",
            type: "configurable",
            targetMajor: "Computer Science",
            resultStaff: "Charlie Day",
        },
        {
            id: 5,
            priority: 20,
            name: "Catch All",
            type: "system",
            filterLabel: "", // BLANK per request
            actionLabel: "Set Staff Assigned = Default Dave",
            check: () => true,
            resultStaff: "Default Dave",
        },
    ];

    // --- STATE ---
    let updateQueue = new Set();
    let isRunning = false;
    let ruleResults = {};
    let recentlyUpdatedIds = new Set(); // Tracks IDs for the gold flash animation

    // --- COMPUTED ---
    $: queueList = people.filter((p) => updateQueue.has(p.id));

    // --- HANDLERS ---

    function addToQueue(id) {
        if (isRunning) return;
        const newQueue = new Set(updateQueue);
        newQueue.add(id);
        updateQueue = newQueue;
    }

    function addAllToQueue() {
        if (isRunning) return;
        const newQueue = new Set();
        people.forEach((p) => newQueue.add(p.id));
        updateQueue = newQueue;

        // Reset visualization if needed
        if (Object.keys(ruleResults).length > 0) {
            ruleResults = {};
            recentlyUpdatedIds = new Set();
        }
    }

    function updatePersonField(id, field, value) {
        if (isRunning) return;

        people = people.map((p) => {
            if (p.id === id) {
                // If setting staff assigned to "null" string from select, convert to actual null
                const cleanValue =
                    field === "assignedStaff" && value === "" ? null : value;
                return { ...p, [field]: cleanValue };
            }
            return p;
        });

        addToQueue(id);

        if (Object.keys(ruleResults).length > 0) {
            ruleResults = {};
            recentlyUpdatedIds = new Set();
        }
    }

    function updateRule(ruleId, field, value) {
        if (isRunning) return;
        rules = rules.map((r) => {
            if (r.id === ruleId) {
                return { ...r, [field]: value };
            }
            return r;
        });

        // Reset visualization if needed
        if (Object.keys(ruleResults).length > 0) {
            ruleResults = {};
        }
    }

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function runBatchSimulation() {
        if (isRunning || updateQueue.size === 0) return;

        isRunning = true;
        ruleResults = {};
        recentlyUpdatedIds = new Set();

        // 1. Snapshot the queue (the records we need to ACT on)
        let remainingIds = Array.from(updateQueue);
        let consumedIds = new Set();
        let pendingUpdates = []; // Store updates to apply at the end

        // --- PHASE 1: EVALUATE QUERIES ---
        for (const rule of rules) {
            // Set status to active
            ruleResults = {
                ...ruleResults,
                [rule.id]: { status: "active", count: null },
            };

            await delay(500);

            // Helper to check rule match
            const checkMatch = (person) => {
                if (rule.type === "configurable") {
                    return person.major === rule.targetMajor;
                } else {
                    return rule.check(person);
                }
            };

            // A. FILTER SCOPE: Calculate ALL matches in the system (visualization only)
            const allMatches = people.filter((p) => checkMatch(p));

            // B. ACTION SCOPE: Calculate matches within the Queue (application)
            const queueMatches = remainingIds.filter((id) => {
                const person = people.find((p) => p.id === id);
                return checkMatch(person);
            });

            // Update Visualization with TOTAL count
            ruleResults = {
                ...ruleResults,
                [rule.id]: { status: "complete", count: allMatches.length },
            };

            if (queueMatches.length > 0) {
                // Store the intention to update, but don't update state yet
                if (rule.resultStaff) {
                    queueMatches.forEach((id) => {
                        pendingUpdates.push({ id, newStaff: rule.resultStaff });
                    });
                }

                // Remove matches from remaining list (Exclusivity) logic still applies immediately
                remainingIds = remainingIds.filter(
                    (id) => !queueMatches.includes(id),
                );
                queueMatches.forEach((id) => consumedIds.add(id));
            }

            await delay(200);
        }

        // --- PHASE 2: APPLY UPDATES ---
        if (pendingUpdates.length > 0) {
            await delay(300); // Small pause before application

            const updatesSet = new Set();

            people = people.map((p) => {
                const update = pendingUpdates.find((u) => u.id === p.id);
                if (update) {
                    updatesSet.add(p.id);
                    return { ...p, assignedStaff: update.newStaff };
                }
                return p;
            });

            // Trigger Gold Flash
            recentlyUpdatedIds = updatesSet;
        }

        await delay(800);

        // Clear Processed from Queue
        const finalQueue = new Set(updateQueue);
        consumedIds.forEach((id) => finalQueue.delete(id));
        updateQueue = finalQueue;

        // Clear flash states
        setTimeout(() => {
            recentlyUpdatedIds = new Set();
        }, 1000);

        isRunning = false;
    }
</script>

<div class="explainer-container">
    <div class="layout-grid">
        <!-- LEFT COLUMN: RULES -->
        <div class="col rules-column">
            <div class="rules-stack">
                <div class="timeline-line"></div>

                {#each rules as rule (rule.id)}
                    {@const res = ruleResults[rule.id] || {
                        status: "idle",
                        count: null,
                    }}

                    <div
                        class="rule-card"
                        class:active={res.status === "active"}
                        class:complete={res.status === "complete"}
                    >
                        <div class="priority-col">
                            <span class="priority-label">Priority</span>
                            <span class="priority-num">{rule.priority}</span>
                        </div>

                        <!-- MATCH COUNT (ALL RECORDS) -->
                        <div class="status-col">
                            {#if res.status === "active"}
                                <div class="spinner"></div>
                            {:else if res.status === "complete"}
                                <div
                                    class="count-badge"
                                    in:fly={{ y: 5, duration: 200 }}
                                >
                                    {res.count}
                                </div>
                                <span class="count-label">Matching Rows</span>
                            {:else}
                                <div class="dash">-</div>
                            {/if}
                        </div>

                        <div class="content-col">
                            <div class="rule-header">
                                <span class="rule-name">{rule.name}</span>
                            </div>

                            <div class="compact-logic">
                                <div class="logic-row">
                                    <span class="logic-label">Filter:</span>
                                    {#if rule.type === "configurable"}
                                        <div class="dynamic-logic">
                                            <span>Major =&nbsp;</span>
                                            <select
                                                value={rule.targetMajor}
                                                on:change={(e) =>
                                                    updateRule(
                                                        rule.id,
                                                        "targetMajor",
                                                        e.target.value,
                                                    )}
                                                disabled={isRunning}
                                                class="rule-select"
                                            >
                                                {#each MAJORS as major}
                                                    <option value={major}
                                                        >{major}</option
                                                    >
                                                {/each}
                                            </select>
                                        </div>
                                    {:else}
                                        <span class="logic-value code">
                                            {rule.filterLabel}
                                        </span>
                                    {/if}
                                </div>
                                <div class="logic-row">
                                    <span class="logic-label">Action:</span>
                                    {#if rule.type === "configurable"}
                                        <div class="dynamic-logic">
                                            <span
                                                >Set Staff Assigned =&nbsp;</span
                                            >
                                            <select
                                                value={rule.resultStaff}
                                                on:change={(e) =>
                                                    updateRule(
                                                        rule.id,
                                                        "resultStaff",
                                                        e.target.value,
                                                    )}
                                                disabled={isRunning}
                                                class="rule-select"
                                            >
                                                {#each STAFF_OPTIONS as staff}
                                                    <option value={staff}
                                                        >{staff}</option
                                                    >
                                                {/each}
                                            </select>
                                        </div>
                                    {:else}
                                        <span class="logic-value code"
                                            >{rule.actionLabel}</span
                                        >
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- MIDDLE COLUMN: UPDATE QUEUE -->
        <div class="col queue-column">
            <div class="panel queue-panel">
                <div class="panel-header">
                    <h3>Update Queue</h3>
                    <span class="badge">{updateQueue.size}</span>
                </div>

                <!-- MOVED BUTTON TO TOP -->
                <div class="queue-actions">
                    <button
                        class="btn apply-btn full-width"
                        on:click={runBatchSimulation}
                        disabled={isRunning}
                    >
                        {isRunning ? "Processing Batch..." : "Run Batch Update"}
                    </button>
                </div>

                <div class="queue-list">
                    {#if queueList.length === 0}
                        <div class="empty-msg">No records pending update</div>
                    {:else}
                        {#each queueList as person (person.id)}
                            <div
                                class="queue-item"
                                transition:fade|local={{ duration: 200 }}
                            >
                                <span class="q-name">{person.name}</span>
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
        </div>

        <!-- RIGHT COLUMN: RECORDS -->
        <div class="col records-column">
            <div class="panel records-panel">
                <div class="panel-header">
                    <h3>Person Records</h3>
                </div>
                <div class="table-container">
                    <table class="records-table">
                        <thead>
                            <tr>
                                <th style="width: 25%">Name</th>
                                <th style="width: 30%">Major</th>
                                <th style="width: 25%">Staff Assigned</th>
                                <th style="width: 20%">Locked</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each people as person (person.id)}
                                <tr>
                                    <td class="name-cell">
                                        {person.name}
                                    </td>
                                    <td>
                                        <select
                                            value={person.major}
                                            on:change={(e) =>
                                                updatePersonField(
                                                    person.id,
                                                    "major",
                                                    e.target.value,
                                                )}
                                            disabled={isRunning}
                                            class="table-select"
                                        >
                                            {#each MAJORS as major}
                                                <option value={major}
                                                    >{major}</option
                                                >
                                            {/each}
                                        </select>
                                    </td>
                                    <td
                                        class="staff-cell"
                                        class:flash-gold={recentlyUpdatedIds.has(
                                            person.id,
                                        )}
                                    >
                                        <select
                                            value={person.assignedStaff || ""}
                                            on:change={(e) =>
                                                updatePersonField(
                                                    person.id,
                                                    "assignedStaff",
                                                    e.target.value,
                                                )}
                                            disabled={isRunning}
                                            class="table-select"
                                        >
                                            <option value="">Unassigned</option>
                                            {#each STAFF_OPTIONS as staff}
                                                <option value={staff}
                                                    >{staff}</option
                                                >
                                            {/each}
                                        </select>
                                    </td>
                                    <td>
                                        <select
                                            value={person.staffLocked.toString()}
                                            on:change={(e) =>
                                                updatePersonField(
                                                    person.id,
                                                    "staffLocked",
                                                    e.target.value === "true",
                                                )}
                                            disabled={isRunning}
                                            class="table-select"
                                        >
                                            <option value="false">No</option>
                                            <option value="true">Yes</option>
                                        </select>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                <!-- Footer with Retroactive Refresh (Centered & Smaller) -->
                <div class="action-row centered">
                    <button
                        class="btn outline-btn"
                        on:click={addAllToQueue}
                        disabled={isRunning}
                    >
                        Retroactive Refresh All Records
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .explainer-container {
        max-width: 1400px;
        margin: 2rem auto;
        font-family: var(--font-body, "Source Sans 3", sans-serif);
        color: var(--color-text-dark, #333);
        --color-primary: #0a2540;
        --color-secondary: #d4a056;
        --color-background-alt: #ffffff;
        --color-accent-light: #e2e8f0;
        --color-text-light: #64748b;
        --font-heading: "Oswald", sans-serif;
        --font-mono: monospace;
    }

    /* Layout */
    .layout-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
        align-items: start;
    }

    @media (min-width: 1200px) {
        .layout-grid {
            /* 3 Column Layout: Rules (500px) | Queue (240px) | Table (Remaining Space) */
            grid-template-columns: 560px 240px 1fr;
        }
    }

    /* Panels */
    .panel {
        background-color: var(--color-background-alt);
        border-radius: 8px;
        border: 1px solid var(--color-accent-light);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .panel-header {
        padding: 1rem;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: white;
    }
    .panel-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-primary);
    }
    .badge {
        background: var(--color-secondary);
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.8rem;
        font-weight: bold;
    }

    /* TABLE STYLES (Person Records) */
    .table-container {
        overflow-x: auto;
        max-height: 500px;
        overflow-y: auto;
    }
    .records-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
    }
    .records-table th {
        text-align: left;
        padding: 0.75rem 0.5rem;
        border-bottom: 2px solid #e2e8f0;
        color: #64748b;
        font-weight: 600;
        position: sticky;
        top: 0;
        background: white;
        z-index: 10;
        white-space: nowrap;
    }
    .records-table td {
        padding: 0.6rem 0.5rem;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
    }
    .records-table tr:last-child td {
        border-bottom: none;
    }

    .table-select {
        width: 100%;
        padding: 6px;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        font-size: 0.85rem;
        background: white;
        color: #334155;
        cursor: pointer;
    }
    .table-select:disabled {
        background: #f1f5f9;
        color: #94a3b8;
        cursor: not-allowed;
    }

    .name-cell {
        font-weight: 600;
        color: #334155;
        white-space: nowrap;
    }
    .staff-cell {
        color: #64748b;
        font-style: italic;
        transition: background-color 0.5s ease;
    }

    /* Gold Flash Animation */
    @keyframes goldFlash {
        0% {
            background-color: rgba(212, 160, 86, 0.4);
        }
        100% {
            background-color: transparent;
        }
    }
    .flash-gold {
        animation: goldFlash 2s ease-out;
    }

    /* Queue Styles */
    .queue-list {
        padding: 1rem;
        background: #fff;
        min-height: 100px;
        max-height: 500px; /* Matched to table height */
        overflow-y: auto;
    }
    .empty-msg {
        text-align: center;
        color: #94a3b8;
        font-style: italic;
        font-size: 0.85rem;
        margin-top: 1rem;
    }
    .queue-item {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px dashed #e2e8f0;
        font-size: 0.9rem;
    }
    .q-name {
        font-weight: 500;
        color: #334155;
    }
    .q-status {
        font-size: 0.8rem;
        color: #94a3b8;
    }

    /* New Queue Actions Area (Top) */
    .queue-actions {
        padding: 1rem;
        background: transparent;
        border-bottom: 1px solid #f1f5f9;
    }

    .action-row {
        padding: 1rem;
        border-top: 1px solid #f1f5f9;
        background: transparent;
    }
    .action-row.centered {
        display: flex;
        justify-content: center;
    }

    /* Rules Column */
    .rules-stack {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        position: relative;
    }
    .timeline-line {
        position: absolute;
        left: 4.5rem;
        top: 0;
        bottom: 0;
        width: 2px;
        background-color: #f1f5f9;
        z-index: 0;
    }

    .rule-card {
        display: grid;
        grid-template-columns: 3rem 5rem 1fr;
        gap: 0.5rem;
        background: white;
        border: 1px solid var(--color-accent-light);
        border-radius: 6px;
        padding: 0.75rem 1rem 0.75rem 0.5rem;
        position: relative;
        z-index: 1;
        transition: all 0.3s ease;
        align-items: center;
    }

    /* Active State (Running) */
    .rule-card.active {
        border-color: var(--color-secondary);
        box-shadow: 0 0 0 1px var(--color-secondary);
        transform: scale(1.01);
    }
    .rule-card.complete {
        border-color: #cbd5e1;
        background-color: #ffffff;
    }

    .priority-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-right: 1px solid #f1f5f9;
        padding-right: 0.5rem;
    }
    .priority-label {
        font-size: 0.6rem;
        text-transform: uppercase;
        color: #94a3b8;
    }
    .priority-num {
        font-family: var(--font-heading);
        font-size: 1.25rem;
        color: #cbd5e1;
        line-height: 1;
    }

    /* Status Column (Counter) */
    .status-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-width: 3rem;
    }
    .count-badge {
        font-size: 1.25rem;
        font-weight: bold;
        color: #334155;
        line-height: 1;
    }
    .count-label {
        font-size: 0.6rem;
        text-transform: uppercase;
        color: #94a3b8;
        text-align: center;
        line-height: 1.1;
    }
    .dash {
        color: #cbd5e1;
        font-weight: bold;
    }

    .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid var(--color-secondary);
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .content-col {
        padding-left: 0.5rem;
    }
    .rule-header {
        margin-bottom: 0.25rem;
    }
    .rule-name {
        font-family: var(--font-heading);
        font-weight: 500;
        font-size: 1.1rem;
        letter-spacing: 1.5px;
        color: var(--color-primary);
    }
    .compact-logic {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    .logic-row {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        font-size: 0.85rem;
        min-height: 24px;
    }
    .logic-label {
        color: #94a3b8;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.7rem;
        min-width: 45px;
    }
    .logic-value.code {
        font-family: var(--font-mono);
        background: #f1f5f9;
        padding: 2px 4px;
        border-radius: 3px;
        color: #334155;
    }

    /* Dynamic Rule Selects */
    .dynamic-logic {
        display: flex;
        align-items: center;
        flex: 1;
        font-family: var(--font-mono);
        background: #f1f5f9;
        padding: 2px 4px; /* Matches padding of logic-value.code */
        border-radius: 3px;
        color: #334155;
        width: fit-content;
    }

    .rule-select {
        font-family: inherit;
        font-size: 0.85rem;
        padding: 0 14px 0 2px; /* Space for arrow */
        border: none;
        border-radius: 0;
        background-color: transparent;
        color: #334155;
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23334155%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
        background-repeat: no-repeat;
        background-position: right 0 center;
        background-size: 8px auto;
        min-width: 40px;
    }
    /* Remove hover background as per user preference for whole line style */
    .rule-select:hover {
        /* background-color: transparent; */
        text-decoration: underline; /* Subtle indication of interactivity */
    }

    .btn {
        padding: 0.75rem 1.2rem;
        font-size: 0.9rem;
        font-weight: 600;
        border: 1px solid transparent;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s ease;
        letter-spacing: 0.025em;
        font-family: var(--font-body);
    }
    .apply-btn {
        background-color: var(--color-primary);
        color: white;
    }
    .apply-btn:hover:not(:disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
    }
    .apply-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .outline-btn {
        background-color: transparent;
        border: 1px solid var(--color-primary);
        color: var(--color-primary);
    }
    .outline-btn:hover:not(:disabled) {
        background-color: #f1f5f9;
        transform: translateY(-1px);
    }
    .outline-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .full-width {
        width: 100%;
    }
</style>
