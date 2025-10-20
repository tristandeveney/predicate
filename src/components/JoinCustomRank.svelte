<script>
    import { personData, schoolData, addressData } from "./data.js";
    import { fade, fly } from "svelte/transition";
    import { quintOut } from "svelte/easing";
    import { tick, onMount, afterUpdate } from "svelte";

    // --- CONFIG & UTILS ---
    const COLOR_MAP = {
        Person: "var(--color-persons)",
        School: "var(--color-schools)",
        Address: "var(--color-addresses)",
    };
    const LINE_OFFSET_AMOUNT = 8;

    // --- STATE MANAGEMENT ---
    let selectedPersonId = 1;
    // A single, global join state that applies to all records.
    let activeJoins = {
        School: [],
        Address: [],
    };

    // --- MODAL STATE ---
    let isModalOpen = false;
    let modalConfig = {
        tableName: "",
        data: [],
        fields: [],
        joinType: "rank",
        rankInput: 1,
        customRankInput: 1,
        customSort: { field: "createdDate", direction: "asc" },
        joinLabel: "",
    };
    $: isJoinLabelValid =
        modalConfig.joinType === "rank" ||
        modalConfig.joinLabel.trim().length > 0;

    // --- DOM REFS for SVG ---
    let containerEl;
    let personCardEl;
    let schoolRowRefs = [];
    let addressRowRefs = [];
    let connectorPaths = [];

    // --- DERIVED & RESOLVED DATA ---
    $: selectedPerson = personData.find((p) => p.id === selectedPersonId);
    $: personSchools = schoolData.filter(
        (s) => s.personId === selectedPersonId,
    );
    $: personAddresses = addressData.filter(
        (a) => a.personId === selectedPersonId,
    );

    $: resolvedJoins = (() => {
        if (!activeJoins) return { School: [], Address: [] };

        const resolve = (joins, data) => {
            return joins.map((join) => {
                let resolvedIndex = null;
                if (join.type === "rank") {
                    const index = join.rank - 1;
                    if (index >= 0 && index < data.length) {
                        resolvedIndex = index;
                    }
                } else if (join.type === "custom") {
                    const sortedData = [...data].sort((a, b) => {
                        const valA = a[join.customSort.field];
                        const valB = b[join.customSort.field];
                        let comparison = 0;
                        if (valA > valB) comparison = 1;
                        else if (valA < valB) comparison = -1;
                        return join.customSort.direction === "asc"
                            ? comparison
                            : -comparison;
                    });
                    const indexInSorted = join.rank - 1;
                    if (
                        indexInSorted >= 0 &&
                        indexInSorted < sortedData.length
                    ) {
                        const originalRecord = sortedData[indexInSorted];
                        resolvedIndex = data.findIndex(
                            (item) => item.id === originalRecord.id,
                        );
                    }
                }
                return { ...join, resolvedIndex };
            });
        };

        return {
            School: resolve(activeJoins.School, personSchools),
            Address: resolve(activeJoins.Address, personAddresses),
        };
    })();

    $: previewItems = (() => {
        const newItems = [];
        if (!selectedPerson) return [];

        for (const [propKey, propValue] of Object.entries(selectedPerson)) {
            newItems.push({
                key: `person.${propKey}`,
                value: propValue,
                origin: "Person",
            });
        }

        const processJoins = (tableJoins, tableData, tableName) => {
            tableJoins.forEach((join) => {
                if (join.resolvedIndex !== null) {
                    const record = tableData[join.resolvedIndex];
                    if (record) {
                        for (const [propKey, propValue] of Object.entries(
                            record,
                        )) {
                            if (propKey !== "id" && propKey !== "personId") {
                                newItems.push({
                                    key: `${tableName}.${join.key}.${propKey}`,
                                    value: propValue,
                                    origin: tableName,
                                });
                            }
                        }
                    }
                }
            });
        };

        processJoins(resolvedJoins.School, personSchools, "School");
        processJoins(resolvedJoins.Address, personAddresses, "Address");

        return newItems;
    })();

    // --- SVG & REACTIVITY ---

    $: if (selectedPersonId) {
        schoolRowRefs = [];
        addressRowRefs = [];
    }

    afterUpdate(() => {
        if (containerEl) {
            updatePaths();
        }
    });

    const updatePaths = () => {
        if (!personCardEl) return;

        const newPaths = [];
        const joinGroups = [resolvedJoins.School, resolvedJoins.Address];

        joinGroups.forEach((joins, groupIndex) => {
            if (!joins || joins.length === 0) return;

            const rowRefs = groupIndex === 0 ? schoolRowRefs : addressRowRefs;
            const color =
                groupIndex === 0 ? COLOR_MAP.School : COLOR_MAP.Address;

            const joinsPerIndex = {};
            for (const join of joins) {
                if (join.resolvedIndex !== null) {
                    joinsPerIndex[join.resolvedIndex] =
                        (joinsPerIndex[join.resolvedIndex] || 0) + 1;
                }
            }

            const processedCountPerIndex = {};
            joins.forEach((join) => {
                if (join.resolvedIndex !== null) {
                    const targetEl = rowRefs[join.resolvedIndex];
                    if (targetEl) {
                        const totalJoinsForThisIndex =
                            joinsPerIndex[join.resolvedIndex];
                        const currentJoinNum =
                            processedCountPerIndex[join.resolvedIndex] || 0;
                        const offset =
                            (currentJoinNum -
                                (totalJoinsForThisIndex - 1) / 2) *
                            LINE_OFFSET_AMOUNT;
                        const path = getConnectorPath(
                            personCardEl,
                            targetEl,
                            color,
                            offset,
                        );
                        if (path) newPaths.push({ ...path, id: join.id });
                        processedCountPerIndex[join.resolvedIndex] =
                            currentJoinNum + 1;
                    }
                }
            });
        });
        connectorPaths = newPaths;
    };

    // --- SVG HELPER ---
    function getConnectorPath(sourceEl, targetEl, color, yOffset = 0) {
        if (!sourceEl || !targetEl || !containerEl) return null;
        const containerRect = containerEl.getBoundingClientRect();
        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const startX = sourceRect.right - containerRect.left;
        const startY =
            sourceRect.top -
            containerRect.top +
            sourceRect.height / 2 +
            yOffset;
        const endX = targetRect.left - containerRect.left;
        const endY =
            targetRect.top -
            containerRect.top +
            targetRect.height / 2 +
            yOffset;
        const handleOffset = (endX - startX) * 0.5;
        const d = `M ${startX} ${startY} C ${startX + handleOffset} ${startY}, ${endX - handleOffset} ${endY}, ${endX} ${endY}`;
        return { d, color };
    }

    // --- HANDLERS ---
    function openJoinModal(tableName, data) {
        const sampleRecord = data[0] || {};
        const fields = Object.keys(sampleRecord).filter(
            (k) => k !== "id" && k !== "personId",
        );
        isModalOpen = true;
        modalConfig = {
            tableName,
            data,
            fields,
            joinType: "rank",
            rankInput: 1,
            customRankInput: 1,
            customSort: { field: fields[0] || "createdDate", direction: "asc" },
            joinLabel: "",
        };
    }

    function closeJoinModal() {
        isModalOpen = false;
    }

    function applyJoin() {
        const {
            tableName,
            joinType,
            rankInput,
            customRankInput,
            customSort,
            joinLabel,
        } = modalConfig;
        if (!isJoinLabelValid) return;

        const saneLabel = (
            joinType === "rank" ? `rank_${rankInput}` : joinLabel
        )
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_");

        const currentJoins = activeJoins[tableName];
        const existingLabels = currentJoins.map((j) => j.key);
        let finalLabel = saneLabel;
        let counter = 2;
        while (existingLabels.includes(finalLabel)) {
            finalLabel = `${saneLabel}_${counter}`;
            counter++;
        }

        let newJoin;
        const newId = crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;

        if (joinType === "rank") {
            newJoin = {
                type: "rank",
                rank: parseInt(rankInput, 10),
                key: finalLabel,
                id: newId,
            };
        } else {
            newJoin = {
                type: "custom",
                rank: parseInt(customRankInput, 10),
                customSort: { ...customSort },
                key: finalLabel,
                id: newId,
            };
        }

        activeJoins[tableName] = [...activeJoins[tableName], newJoin];
        activeJoins = activeJoins; // Trigger reactivity

        closeJoinModal();
    }

    function removeJoin(tableName, joinIdToRemove) {
        activeJoins[tableName] = activeJoins[tableName].filter(
            (j) => j.id !== joinIdToRemove,
        );
        activeJoins = activeJoins; // Trigger reactivity
    }
</script>

{#if isModalOpen}
    <div
        class="modal-overlay"
        on:click={closeJoinModal}
        on:keydown={(event) => {
            if (event.key === "Escape") closeJoinModal();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-header"
        transition:fade={{ duration: 150 }}
    >
        <div
            class="modal-content"
            on:click|stopPropagation
            transition:fly={{ y: -20, duration: 200, easing: quintOut }}
        >
            <h3 class="modal-header" id="modal-header">
                Add Join for {modalConfig.tableName}
            </h3>
            <div class="join-options">
                <div class="segmented-control modal-control">
                    <button
                        class:active={modalConfig.joinType === "rank"}
                        on:click={() => (modalConfig.joinType = "rank")}
                        >By Rank</button
                    >
                    <button
                        class:active={modalConfig.joinType === "custom"}
                        on:click={() => {
                            modalConfig.joinType = "custom";
                            modalConfig.joinLabel = "";
                        }}>Custom</button
                    >
                </div>

                <div class="option-panel">
                    {#if modalConfig.joinType === "rank"}
                        <div in:fade={{ duration: 150 }}>
                            <label for="rank-input">Join record at rank:</label>
                            <select
                                id="rank-input"
                                bind:value={modalConfig.rankInput}
                            >
                                {#each Array(10) as _, i}
                                    <option value={i + 1}>{i + 1}</option>
                                {/each}
                            </select>
                        </div>
                    {:else}
                        <div
                            class="custom-join-group"
                            in:fade={{ duration: 150 }}
                        >
                            <div>
                                <label for="custom-rank-input"
                                    >Join the record at custom rank:</label
                                >
                                <div class="custom-sort-controls">
                                    <select
                                        id="custom-rank-input"
                                        bind:value={modalConfig.customRankInput}
                                    >
                                        {#each Array(10) as _, i}
                                            <option value={i + 1}
                                                >{i + 1}</option
                                            >
                                        {/each}
                                    </select>
                                    <span
                                        style="font-size: 0.9em; align-self: center; white-space: nowrap;"
                                        >when sorted by:</span
                                    >
                                </div>
                                <div
                                    class="custom-sort-controls"
                                    style="margin-top: 0.5rem;"
                                >
                                    <select
                                        bind:value={
                                            modalConfig.customSort.field
                                        }
                                    >
                                        {#each modalConfig.fields as field}
                                            <option value={field}
                                                >{field}</option
                                            >
                                        {/each}
                                    </select>
                                    <select
                                        bind:value={
                                            modalConfig.customSort.direction
                                        }
                                    >
                                        <option value="asc">Ascending</option>
                                        <option value="desc">Descending</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label for="join-label"
                                    >Join Label (Required)</label
                                >
                                <input
                                    type="text"
                                    id="join-label"
                                    placeholder="e.g., newest_school"
                                    bind:value={modalConfig.joinLabel}
                                    maxlength="25"
                                />
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn cancel-btn" on:click={closeJoinModal}
                    >Cancel</button
                >
                <button
                    class="btn apply-btn"
                    on:click={applyJoin}
                    disabled={!isJoinLabelValid}>Add Join</button
                >
            </div>
        </div>
    </div>
{/if}

<div class="explainer-container" bind:this={containerEl}>
    <svg class="connector-svg">
        {#each connectorPaths as path (path.id)}
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
            {#if previewItems.length === 0}
                <p class="no-data-msg">
                    Select a person and add joins to see available data fields.
                </p>
            {/if}
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
        {#if selectedPerson}
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
        {/if}

        <div class="related-data">
            <div
                class="results-panel panel"
                style="--list-color: var(--color-schools);"
            >
                <div class="panel-header-flex">
                    <h3 class="panel-header">Schools</h3>
                    <div class="join-tags-container">
                        {#each resolvedJoins.School as join (join.id)}
                            <div
                                class="join-tag"
                                class:dangling={join.resolvedIndex === null}
                                in:fly={{ y: -5, duration: 150 }}
                            >
                                {join.key}
                                <button
                                    class="remove-tag-btn"
                                    on:click={() =>
                                        removeJoin("School", join.id)}
                                    >&times;</button
                                >
                            </div>
                        {/each}
                    </div>
                    <button
                        class="btn join-btn-header"
                        on:click={() => openJoinModal("School", personSchools)}
                        >Add Join...</button
                    >
                </div>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th style="width: 1%;">Rank</th>
                            <th>Name</th>
                            <th>Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each personSchools as school, i (school.id)}
                            <tr
                                class:highlighted={resolvedJoins.School.some(
                                    (j) => j.resolvedIndex === i,
                                )}
                                bind:this={schoolRowRefs[i]}
                            >
                                <td class="rank-cell">{i + 1}</td>
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
                    <div class="join-tags-container">
                        {#each resolvedJoins.Address as join (join.id)}
                            <div
                                class="join-tag"
                                class:dangling={join.resolvedIndex === null}
                                in:fly={{ y: -5, duration: 150 }}
                            >
                                {join.key}
                                <button
                                    class="remove-tag-btn"
                                    on:click={() =>
                                        removeJoin("Address", join.id)}
                                    >&times;</button
                                >
                            </div>
                        {/each}
                    </div>
                    <button
                        class="btn join-btn-header"
                        on:click={() =>
                            openJoinModal("Address", personAddresses)}
                        >Add Join...</button
                    >
                </div>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th style="width: 1%;">Rank</th>
                            <th>Type</th>
                            <th>City</th>
                            <th>State</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each personAddresses as address, i (address.id)}
                            <tr
                                class:highlighted={resolvedJoins.Address.some(
                                    (j) => j.resolvedIndex === i,
                                )}
                                bind:this={addressRowRefs[i]}
                            >
                                <td class="rank-cell">{i + 1}</td>
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
        white-space: nowrap;
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
        vertical-align: middle;
    }
    .results-table thead th {
        font-weight: 600;
        background-color: var(--list-color, var(--color-background-alt));
    }
    .rank-cell {
        text-align: center;
        font-weight: 600;
        color: var(--color-text-light);
    }
    .no-data-msg {
        font-size: 0.9rem;
        color: var(--color-text-light);
        width: 100%;
        text-align: center;
        margin-top: 1rem;
    }

    /* --- MODAL STYLES --- */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    .modal-content {
        background-color: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        width: 100%;
        max-width: 450px;
    }
    .modal-header {
        margin-top: 0;
        margin-bottom: 1.5rem;
        font-size: 1.4rem;
    }
    .join-options {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 2rem;
    }
    .modal-control {
        margin-bottom: 0;
    }
    .option-panel {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 1rem;
    }
    .option-panel label {
        display: block;
        margin: 0 0 0.5rem 0;
        font-weight: 500;
        font-size: 0.9rem;
    }
    .option-panel input,
    .option-panel select {
        width: 100%;
        padding: 0.6rem;
        border-radius: 4px;
        border: 1px solid #cbd5e1;
        font-size: 1rem;
        box-sizing: border-box;
    }
    .custom-join-group {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .custom-sort-controls {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 0.5rem;
        align-items: center;
    }
    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
    }
    .btn {
        padding: 0.6rem 1.2rem;
        font-size: 0.9rem;
        font-weight: 600;
        border: 1px solid transparent;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .cancel-btn {
        background-color: transparent;
        color: #475569;
        border: 1px solid #e2e8f0;
    }
    .cancel-btn:hover {
        background-color: #f1f5f9;
    }
    .apply-btn {
        background-color: var(--color-primary);
        color: white;
    }
    .apply-btn:hover:not(:disabled) {
        opacity: 0.9;
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
        min-height: 50px;
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
        gap: 1rem;
    }
    .join-tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        flex-grow: 1;
    }
    .join-tag {
        display: inline-flex;
        align-items: center;
        background-color: var(--color-primary);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.8rem;
        font-weight: 600;
        font-family: var(--font-mono);
        transition: all 0.2s ease;
    }
    .join-tag.dangling {
        background-color: #94a3b8;
        opacity: 0.8;
    }
    .remove-tag-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.2);
        color: white;
        border: none;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        margin-left: 0.5rem;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        padding: 0;
    }
    .remove-tag-btn:hover {
        background: rgba(0, 0, 0, 0.4);
    }
    .join-btn-header {
        padding: 0.4rem 1rem;
        font-size: 0.85rem;
        font-weight: 600;
        background-color: #e2e8f0;
        color: #475569;
        border: 1px solid transparent;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        flex-shrink: 0;
    }
    .join-btn-header:hover {
        background-color: #cbd5e1;
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
