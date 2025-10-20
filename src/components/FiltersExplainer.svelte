<script>
    import { fly } from "svelte/transition";

    // Using the same consistent data structure
    const allPeople = [
        { id: 1, name: "Jane Doe", major: "History", state: "CA" },
        { id: 2, name: "John Smith", major: "Engineering", state: "NY" },
        { id: 3, name: "Emily White", major: "History", state: "CA" },
        { id: 4, name: "David Green", major: "Biology", state: "TX" },
        { id: 5, name: "Maria Garcia", major: "Engineering", state: "CA" },
        { id: 6, name: "Chen Wei", major: "Engineering", state: "WA" },
    ];

    let activeFilters = {
        state: null,
        major: null,
    };

    function toggleFilter(category, value) {
        if (activeFilters[category] === value) {
            activeFilters[category] = null;
        } else {
            activeFilters[category] = value;
        }
    }

    $: filteredPeople = allPeople.filter((person) => {
        const stateMatch =
            !activeFilters.state || person.state === activeFilters.state;
        const majorMatch =
            !activeFilters.major || person.major === activeFilters.major;
        return stateMatch && majorMatch;
    });
</script>

<div class="explainer">
    <p class="intro-text">
        <strong>Step 2: Apply Filters.</strong> Click the buttons to see the deck
        shrink in real time.
    </p>

    <div class="filter-controls">
        <div class="filter-group">
            <span>State:</span>
            <button
                class="filter-btn"
                class:active={activeFilters.state === "CA"}
                on:click={() => toggleFilter("state", "CA")}>CA</button
            >
            <button
                class="filter-btn"
                class:active={activeFilters.state === "NY"}
                on:click={() => toggleFilter("state", "NY")}>NY</button
            >
            <button
                class="filter-btn"
                class:active={activeFilters.state === "TX"}
                on:click={() => toggleFilter("state", "TX")}>TX</button
            >
        </div>
        <div class="filter-group">
            <span>Major:</span>
            <button
                class="filter-btn"
                class:active={activeFilters.major === "Engineering"}
                on:click={() => toggleFilter("major", "Engineering")}
                >Engineering</button
            >
            <button
                class="filter-btn"
                class:active={activeFilters.major === "History"}
                on:click={() => toggleFilter("major", "History")}
                >History</button
            >
        </div>
    </div>

    <div class="sample-records">
        {#each filteredPeople as item, i (item.id)}
            <div
                class="record-card"
                style="transform: rotate({(i -
                    (filteredPeople.length - 1) / 2) *
                    6}deg); margin-left: {i === 0 ? '0px' : '-120px'};"
                in:fly={{ y: 50, duration: 300 }}
                out:fly={{ y: 50, duration: 300 }}
            >
                <div class="record-card-header">
                    <strong>{item.name}</strong>
                    <svg class="card-icon" viewBox="0 0 24 24"
                        ><path
                            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                        /></svg
                    >
                </div>
                <div class="card-body">
                    {item.major} - {item.state}
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    /* Using the same sophisticated styling as the QueryBaseExplainer */
    .explainer {
        font-family: var(--font-body);
        background: radial-gradient(circle, #f5f7fa 0%, #e0e8f0 100%);
        border-radius: 12px;
        padding: 2.5rem;
        margin: 2rem auto;
        box-shadow:
            0 20px 30px -10px rgba(10, 37, 64, 0.2),
            inset 0 0 10px rgba(255, 255, 255, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.8);
        overflow: hidden;
    }
    .intro-text {
        text-align: center;
        margin-bottom: 2rem;
        font-size: 1.2rem;
        color: var(--color-text-light);
    }
    .intro-text strong {
        font-family: var(--font-heading);
        color: var(--color-primary);
        font-weight: 300;
    }
    .filter-controls {
        text-align: center;
        margin-bottom: 2.5rem;
        padding-bottom: 2rem;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }
    .filter-group {
        display: inline-block;
        margin: 0.5rem 1rem;
    }
    .filter-group span {
        margin-right: 0.75rem;
        color: var(--color-text-dark);
        font-weight: 600;
    }
    .filter-btn {
        font-family: var(--font-body);
        padding: 0.6rem 1.2rem;
        border: 1px solid #ccc;
        background-color: var(--color-background-alt);
        color: var(--color-text-light);
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin: 0 0.25rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    .filter-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    .filter-btn.active {
        background-color: var(--color-primary);
        color: var(--color-background-alt);
        border-color: var(--color-primary);
        box-shadow: 0 0 10px
            color-mix(in srgb, var(--color-primary) 40%, transparent);
    }
    .sample-records {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: nowrap;
        min-height: 220px;
        padding: 2rem 0;
    }
    .record-card {
        width: 180px;
        height: 120px;
        border-radius: 8px;
        background: white;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        border: 1px solid #ddd;
        display: flex;
        flex-direction: column;
        padding: 0.75rem;
        transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        transform-origin: bottom center;
        flex-shrink: 0;
    }
    .record-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 1px solid #eee;
        padding-bottom: 0.5rem;
        margin-bottom: 0.5rem;
    }
    .record-card strong {
        color: var(--color-primary);
        font-weight: 600;
        font-size: 1rem;
        line-height: 1.2;
    }
    .card-icon {
        width: 24px;
        height: 24px;
        fill: var(--color-primary);
        opacity: 0.3;
    }
    .card-body {
        font-size: 0.85rem;
        color: var(--color-text-light);
    }
</style>
