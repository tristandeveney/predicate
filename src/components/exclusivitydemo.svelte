<script>
    import { personData } from "./data.js";
    import { fly, fade } from "svelte/transition";

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

    const RULES = [
        {
            id: 1,
            priority: 1,
            name: "Do Nothing",
            filterDescription: "Staff Assigned Locked = Yes",
            actionDescription: "Do Nothing",
            check: (p) => p.staffLocked === true,
            resultStaff: null,
        },
        {
            id: 2,
            priority: 5,
            name: "Bio Assignment",
            filterDescription: "Major = Biology",
            actionDescription: "Set Staff Assigned = Alice Jones",
            check: (p) => p.major === "Biology",
            resultStaff: "Alice Jones",
        },
        {
            id: 3,
            priority: 10,
            name: "History Assignment",
            filterDescription: "Major = History",
            actionDescription: "Set Staff Assigned = Bob Smith",
            check: (p) => p.major === "History",
            resultStaff: "Bob Smith",
        },
        {
            id: 4,
            priority: 15,
            name: "CS Assignment",
            filterDescription: "Major = Computer Science",
            actionDescription: "Set Staff Assigned = Charlie Day",
            check: (p) => p.major === "Computer Science",
            resultStaff: "Charlie Day",
        },
        {
            id: 5,
            priority: 20,
            name: "Catch All",
            filterDescription: "",
            actionDescription: "Set Staff Assigned = Default Dave",
            check: () => true,
            resultStaff: "Default Dave",
        },
    ];

    // --- STATE ---
    $: limitedPeople = personData.slice(0, 5);

    let selectedPersonId = personData[0].id;
    let overrides = {};
    let isRunning = false;
    let ruleStatuses = {};
    let isResultHighlighted = false;

    // --- DERIVED STATE ---
    $: basePerson =
        personData.find((p) => p.id === selectedPersonId) || personData[0];

    // Merge base data with overrides
    $: currentPersonState = {
        ...basePerson,
        staffLocked: overrides[selectedPersonId]?.staffLocked ?? false,
        major: overrides[selectedPersonId]?.major ?? basePerson.major,
        assignedStaff: overrides[selectedPersonId]?.assignedStaff ?? null,
    };

    // --- HANDLERS ---
    function handleSelectPerson(id) {
        if (isRunning) return;
        selectedPersonId = id;
        ruleStatuses = {};
        isResultHighlighted = false;
    }

    function updatePerson(updates) {
        if (isRunning && !updates.internalUpdate) return;

        const currentOverride = overrides[selectedPersonId] || {};

        overrides = {
            ...overrides,
            [selectedPersonId]: {
                ...currentOverride,
                ...updates,
            },
        };

        // Reset visuals if manual update
        if (!updates.internalUpdate && Object.keys(ruleStatuses).length > 0) {
            ruleStatuses = {};
        }
    }

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function runSimulation() {
        if (isRunning) return;
        isRunning = true;
        ruleStatuses = {};
        isResultHighlighted = false;

        let matched = false;

        for (const rule of RULES) {
            ruleStatuses[rule.id] = "checking";
            ruleStatuses = { ...ruleStatuses };

            await delay(500);

            const isMatch = rule.check(currentPersonState);

            if (isMatch) {
                ruleStatuses[rule.id] = "matched";

                // Mark subsequent as skipped
                for (const r of RULES) {
                    if (r.id > rule.id) ruleStatuses[r.id] = "skipped";
                }
                ruleStatuses = { ...ruleStatuses };

                // Apply Result
                if (rule.resultStaff !== null) {
                    updatePerson({
                        assignedStaff: rule.resultStaff,
                        internalUpdate: true,
                    });
                    // Trigger the gold flash
                    isResultHighlighted = true;
                    setTimeout(() => (isResultHighlighted = false), 2000);
                }
                // If Locked Rule (resultStaff is null), we do nothing.

                matched = true;
                isRunning = false;
                break;
            } else {
                ruleStatuses[rule.id] = "failed";
                ruleStatuses = { ...ruleStatuses };
                await delay(150);
            }
        }

        if (!matched) isRunning = false;
    }
</script>

<div class="explainer-container">
    <div class="layout-grid">
        <div class="rules-column">
            <div class="rules-stack">
                <div class="timeline-line"></div>

                {#each RULES as rule (rule.id)}
                    {@const status = ruleStatuses[rule.id] || "idle"}

                    <div
                        class="rule-card"
                        class:checking={status === "checking"}
                        class:matched={status === "matched"}
                        class:skipped={status === "skipped"}
                        class:failed={status === "failed"}
                    >
                        <div class="priority-col">
                            <span class="priority-label">Priority</span>
                            <span class="priority-num">{rule.priority}</span>
                        </div>

                        <div class="status-col">
                            {#if status === "checking"}
                                <div class="spinner"></div>
                            {:else if status === "matched"}
                                <div
                                    class="icon-circle success"
                                    in:fly={{ scale: 0.5, duration: 200 }}
                                >
                                    <svg
                                        class="icon-svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="4"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <polyline points="20 6 9 17 4 12"
                                        ></polyline>
                                    </svg>
                                </div>
                            {:else if status === "failed"}
                                <div class="icon-circle error" in:fade>
                                    <svg
                                        class="icon-svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="4"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <line x1="18" y1="6" x2="6" y2="18"
                                        ></line>
                                        <line x1="6" y1="6" x2="18" y2="18"
                                        ></line>
                                    </svg>
                                </div>
                            {:else if status === "skipped"}
                                <div class="icon-circle skipped">-</div>
                            {:else}{/if}
                        </div>

                        <div class="content-col">
                            <div class="rule-header">
                                <span class="rule-name">{rule.name}</span>
                            </div>

                            <div class="compact-logic">
                                <div class="logic-row">
                                    <span class="logic-label">Filter:</span>
                                    <span class="logic-value code">
                                        {rule.filterDescription}
                                    </span>
                                </div>
                                <div class="logic-row">
                                    <span class="logic-label">Action:</span>
                                    <span class="logic-value code">
                                        {rule.actionDescription}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <div class="sidebar-column">
            <div class="panel controls-panel">
                <div class="control-group">
                    <label class="control-label">Select Person</label>
                    <div class="segmented-control">
                        {#each limitedPeople as person (person.id)}
                            <button
                                class:active={selectedPersonId === person.id}
                                disabled={isRunning}
                                on:click={() => handleSelectPerson(person.id)}
                            >
                                {person.name.split(" ")[0]}
                            </button>
                        {/each}
                    </div>
                </div>

                <div class="control-group">
                    <label class="control-label">Major</label>
                    <div class="select-wrapper">
                        <select
                            value={currentPersonState.major}
                            on:change={(e) =>
                                updatePerson({ major: e.target.value })}
                            disabled={isRunning}
                        >
                            {#each MAJORS as major}
                                <option value={major}>{major}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="control-group">
                    <label class="control-label">Staff Assigned Locked</label>
                    <div class="select-wrapper">
                        <select
                            value={currentPersonState.staffLocked.toString()}
                            on:change={(e) =>
                                updatePerson({
                                    staffLocked: e.target.value === "true",
                                })}
                            disabled={isRunning}
                        >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                        </select>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="control-group">
                    <label class="control-label">Staff Assigned</label>
                    <div class="select-wrapper">
                        <select
                            value={currentPersonState.assignedStaff || ""}
                            class:flash-gold={isResultHighlighted}
                            on:change={(e) =>
                                updatePerson({
                                    assignedStaff: e.target.value || null,
                                })}
                            disabled={isRunning}
                        >
                            <option value="">Unassigned</option>
                            {#each STAFF_OPTIONS as staff}
                                <option value={staff}>{staff}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="action-row">
                    <button
                        class="btn apply-btn full-width"
                        on:click={runSimulation}
                        disabled={isRunning}
                    >
                        {isRunning ? "Processing..." : "Run Rules"}
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
        --color-persons: #eef2ff;
        --font-heading: "Oswald", sans-serif;
        --font-mono: monospace;
    }

    /* Layout */
    .layout-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2rem;
        align-items: start;
    }
    @media (min-width: 1024px) {
        .layout-grid {
            grid-template-columns: 1fr 360px;
        }
    }

    /* Panels */
    .panel {
        background-color: var(--color-background-alt);
        border-radius: 8px;
        border: 1px solid var(--color-accent-light);
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .divider {
        height: 1px;
        background-color: var(--color-accent-light);
        margin: 1.5rem 0;
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

    /* Rule Card */
    .rule-card {
        display: grid;
        grid-template-columns: 3rem 3rem 1fr; /* Priority | Status | Content */
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

    /* Card States */
    .rule-card.checking {
        border-color: var(--color-secondary);
        box-shadow:
            0 0 0 1px var(--color-secondary),
            0 4px 8px rgba(0, 0, 0, 0.05);
        background-color: #fffbf5;
    }
    .rule-card.matched {
        border-color: #10b981;
        background-color: #f0fdf4;
    }
    .rule-card.failed {
        opacity: 0.7;
        background-color: #f8fafc;
    }
    .rule-card.skipped {
        opacity: 0.4;
        background-color: #f8fafc;
        border-style: dashed;
    }

    /* Col 1: Priority */
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

    /* Col 2: Status */
    .status-col {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 3rem; /* Keep width even if empty */
    }
    .icon-circle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        font-weight: bold;
        font-size: 1rem;
    }
    .icon-circle.success {
        color: #10b981;
    }
    .icon-circle.error {
        color: #ef4444;
    }
    .icon-circle.skipped {
        color: #cbd5e1;
        font-size: 1.2rem;
    }

    .icon-svg {
        width: 24px;
        height: 24px;
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

    /* Col 3: Content */
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
    }
    .logic-label {
        color: #94a3b8;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.7rem;
        min-width: 45px;
    }
    .logic-value {
        color: #334155;
    }
    .logic-value.code {
        font-family: var(--font-mono);
        background: #f1f5f9;
        padding: 0 4px;
        border-radius: 3px;
    }
    /* Removed custom active-action style to match filter */

    /* Sidebar Controls */
    .sidebar-column {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        position: sticky;
        top: 2rem;
    }
    .control-group {
        margin-bottom: 1.25rem;
    }

    .control-label {
        display: block;
        font-family: var(--font-body);
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--color-text-light);
        margin-bottom: 0.5rem;
        letter-spacing: 0.02em;
    }

    /* Segmented Control */
    .segmented-control {
        display: inline-flex;
        background-color: #f1f5f9;
        border-radius: 6px;
        padding: 4px;
        flex-wrap: wrap;
        gap: 4px;
    }

    .segmented-control button {
        border: none;
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        font-weight: 500;
        color: #475569;
        font-size: 0.85rem;
        transition:
            background-color 0.2s ease,
            color 0.2s ease,
            box-shadow 0.2s ease;
    }
    .segmented-control button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .segmented-control button.active {
        background-color: white;
        color: var(--color-primary);
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .segmented-control button:hover:not(:disabled):not(.active) {
        color: var(--color-primary);
    }

    /* Form Elements */
    .select-wrapper select {
        width: 100%;
        padding: 0.6rem;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        font-size: 0.9rem;
        background-color: white;
        color: #334155;
    }

    /* Highlight Animation */
    @keyframes highlight-fade {
        0% {
            border-color: var(--color-secondary);
            box-shadow: 0 0 0 2px rgba(212, 160, 86, 0.2);
        }
        100% {
            border-color: #cbd5e1;
            box-shadow: none;
        }
    }
    .flash-gold {
        animation: highlight-fade 1.5s ease-out;
    }

    /* Buttons */
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
    .full-width {
        width: 100%;
    }
</style>
