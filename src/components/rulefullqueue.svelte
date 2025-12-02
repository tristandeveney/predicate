<script>
    import { personData } from "./data.js";
    import { fly, fade } from "svelte/transition";
    import { onMount } from "svelte";

    // --- CONFIG ---
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

    // --- STATE ---
    let speed = 1;
    let now = Date.now();

    $: animDuration = 600 / speed;
    $: returnDelay = 600 / speed + 50;

    let returnQueue = [];
    let isProcessingReturn = false;

    // --- GENERATORS ---
    const randomName = () => {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let name = "";
        for (let i = 0; i < 3; i++)
            name += letters.charAt(Math.floor(Math.random() * letters.length));
        return name;
    };

    const generateDb = (id, name, isMine = false) => ({
        id,
        name,
        isMine,
        status: "queued",
        timeoutCounter: 0,
        taskProgress: 0,
        currentTask: "query",
        waitStart: Date.now() - Math.random() * 20000,
        lastProcessed: Date.now(),
        pendingCount: isMine ? 0 : Math.floor(Math.random() * 5),
        pendingSince: isMine
            ? null
            : Math.random() > 0.5
              ? Date.now() - Math.random() * 50000
              : null,
        lastResult: null,
        workFactor: isMine ? 1.0 : Math.random() * 1.5 + 0.3,
    });

    let databases = [
        generateDb("db-my", "MY DATABASE", true),
        ...Array.from({ length: 7 }, (_, i) =>
            generateDb(`db-${i}`, randomName()),
        ),
    ];

    let workers = [
        { id: 1, activeDbId: null },
        { id: 2, activeDbId: null },
        { id: 3, activeDbId: null },
    ];

    // --- DATA & RULES ---
    let people = personData.slice(0, 8).map((p) => ({
        ...p,
        assignedStaff: null,
        staffLocked: false,
        name: p.name,
    }));

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
            hasSlowOption: true,
            isSlowEnabled: false,
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
            filterLabel: "",
            actionLabel: "Set Staff Assigned = Default Dave",
            check: () => true,
            resultStaff: "Default Dave",
        },
    ];

    let updateQueue = new Set();
    let isRunning = false;
    let ruleResults = {};
    let recentlyUpdatedIds = new Set();

    $: queueList = people.filter((p) => updateQueue.has(p.id));

    $: displayDbQueue = databases
        .filter((db) => db.status === "queued")
        .sort((a, b) => a.waitStart - b.waitStart);

    let myDbPendingStart = null;
    $: {
        if (updateQueue.size > 0 && !myDbPendingStart) {
            myDbPendingStart = Date.now();
        } else if (updateQueue.size === 0) {
            myDbPendingStart = null;
        }

        const myDbIndex = databases.findIndex((d) => d.isMine);
        if (myDbIndex !== -1) {
            databases[myDbIndex].pendingCount = updateQueue.size;
            if (myDbPendingStart) {
                if (!databases[myDbIndex].pendingSince)
                    databases[myDbIndex].pendingSince = myDbPendingStart;
            } else {
                databases[myDbIndex].pendingSince = null;
            }
        }
    }

    // --- SIMULATION LOOP ---
    const BASE_TICK = 50;
    const TIMEOUT_THRESHOLD = 100;
    const TIMEOUT_INC = 0.17;

    onMount(() => {
        const interval = setInterval(tick, BASE_TICK);
        const timer = setInterval(() => (now = Date.now()), 1000);
        return () => {
            clearInterval(interval);
            clearInterval(timer);
        };
    });

    function tick() {
        let assignedThisTick = new Set();

        workers = workers.map((worker) => {
            if (worker.activeDbId) {
                let db = databases.find((d) => d.id === worker.activeDbId);

                if (db && db.status === "processing") {
                    db.timeoutCounter += TIMEOUT_INC * speed;

                    if (db.isMine) {
                        if (db.timeoutCounter >= TIMEOUT_THRESHOLD) {
                            isRunning = false;
                            ruleResults = {};
                            queueJobCompletion(worker, "timeout");
                        }
                    } else {
                        const baseSpeed = 0.5 * speed;
                        const effectiveSpeed = baseSpeed * db.workFactor;
                        db.taskProgress += effectiveSpeed;

                        if (
                            db.currentTask === "query" &&
                            db.taskProgress >= 100
                        ) {
                            db.currentTask = "update";
                            db.taskProgress = 0;
                        } else if (
                            db.currentTask === "update" &&
                            db.taskProgress >= 100
                        ) {
                            queueJobCompletion(worker, "success");
                        }

                        if (db.timeoutCounter >= TIMEOUT_THRESHOLD) {
                            queueJobCompletion(worker, "timeout");
                        }
                    }
                }
            } else {
                const nextJob = databases
                    .filter((d) => d.status === "queued")
                    .sort((a, b) => a.waitStart - b.waitStart)
                    .find((d) => !assignedThisTick.has(d.id));

                if (nextJob) {
                    assignedThisTick.add(nextJob.id);
                    startJob(worker, nextJob);
                }
            }
            return worker;
        });

        databases = databases.map((db) => {
            if (!db.isMine && db.status === "queued") {
                if (Math.random() < 0.01 * speed) {
                    db.pendingCount++;
                    if (db.pendingSince === null) db.pendingSince = Date.now();
                }
            }
            return db;
        });

        databases = [...databases];
        workers = [...workers];
    }

    function startJob(worker, db) {
        db.status = "processing";
        db.waitStart = Date.now();
        db.timeoutCounter = 0;
        db.taskProgress = 0;
        db.currentTask = "query";
        worker.activeDbId = db.id;

        if (db.isMine) runBatchSimulation(worker, db);
    }

    function queueJobCompletion(worker, result) {
        const db = databases.find((d) => d.id === worker.activeDbId);
        if (db) {
            db.status = "completing";
            returnQueue.push({ workerId: worker.id, result });
            processReturnQueue();
        }
    }

    function processReturnQueue() {
        if (isProcessingReturn || returnQueue.length === 0) return;

        isProcessingReturn = true;
        const { workerId, result } = returnQueue.shift();
        const worker = workers.find((w) => w.id === workerId);

        if (!worker || !worker.activeDbId) {
            isProcessingReturn = false;
            processReturnQueue();
            return;
        }

        const db = databases.find((d) => d.id === worker.activeDbId);
        if (db) {
            db.status = "queued";
            db.lastResult = result;
            db.lastProcessed = Date.now();
            db.waitStart = Date.now();
            if (!db.isMine) db.workFactor = Math.random() * 1.5 + 0.3;
            if (result === "success") {
                db.pendingCount = 0;
                db.pendingSince = null;
            }
            worker.activeDbId = null;
            databases = [...databases];
            workers = [...workers];
        }

        setTimeout(() => {
            isProcessingReturn = false;
            processReturnQueue();
        }, returnDelay);
    }

    function addToQueue(id) {
        const newQueue = new Set(updateQueue);
        newQueue.add(id);
        updateQueue = newQueue;
    }

    function addAllToQueue() {
        const newQueue = new Set();
        people.forEach((p) => newQueue.add(p.id));
        updateQueue = newQueue;
    }

    function updatePersonField(id, field, value) {
        people = people.map((p) => {
            if (p.id === id) {
                const cleanValue =
                    field === "assignedStaff" && value === "" ? null : value;
                return { ...p, [field]: cleanValue };
            }
            return p;
        });
        addToQueue(id);
    }

    function updateRule(ruleId, field, value) {
        rules = rules.map((r) =>
            r.id === ruleId ? { ...r, [field]: value } : r,
        );
    }

    const delay = (ms) =>
        new Promise((resolve) => setTimeout(resolve, ms / speed));

    async function runBatchSimulation(workerRef, dbRef) {
        isRunning = true;
        ruleResults = {};
        recentlyUpdatedIds = new Set();

        let remainingIds = Array.from(updateQueue);
        let consumedIds = new Set();
        let pendingUpdates = [];

        dbRef.currentTask = "query";
        dbRef.taskProgress = 0;

        const stepSize = 100 / rules.length;

        // --- RULE PROCESSING ---
        for (const rule of rules) {
            if (!workerRef.activeDbId || dbRef.status !== "processing") {
                isRunning = false;
                return;
            }

            ruleResults = {
                ...ruleResults,
                [rule.id]: { status: "active", count: null },
            };

            let queryTime = rule.isSlowEnabled ? 35000 : 2000;
            const increments = 20;
            const intervalTime = queryTime / increments;
            const progressPerTick = stepSize / increments;

            for (let i = 0; i < increments; i++) {
                if (!workerRef.activeDbId || dbRef.status !== "processing") {
                    isRunning = false;
                    return;
                }
                await delay(intervalTime);
                dbRef.taskProgress += progressPerTick;
            }

            const checkMatch = (person) => {
                if (rule.type === "configurable")
                    return person.major === rule.targetMajor;
                return rule.check(person);
            };

            const queueMatches = remainingIds.filter((id) => {
                const person = people.find((p) => p.id === id);
                return checkMatch(person);
            });

            ruleResults = {
                ...ruleResults,
                [rule.id]: {
                    status: "complete",
                    count: people.filter(checkMatch).length,
                },
            };

            if (queueMatches.length > 0) {
                if (rule.resultStaff) {
                    queueMatches.forEach((id) =>
                        pendingUpdates.push({ id, newStaff: rule.resultStaff }),
                    );
                }
                remainingIds = remainingIds.filter(
                    (id) => !queueMatches.includes(id),
                );
                queueMatches.forEach((id) => consumedIds.add(id));
            }
        }
        dbRef.taskProgress = 100;

        if (!workerRef.activeDbId || dbRef.status !== "processing") {
            isRunning = false;
            return;
        }

        // --- WRITING UPDATES ---
        dbRef.currentTask = "update";
        dbRef.taskProgress = 0;

        const writeTime = 5000;
        const writeSteps = 20;
        for (let i = 0; i <= writeSteps; i++) {
            if (!workerRef.activeDbId || dbRef.status !== "processing") {
                isRunning = false;
                return;
            }
            dbRef.taskProgress = (i / writeSteps) * 100;
            await delay(writeTime / writeSteps);
        }

        if (workerRef.activeDbId && dbRef.status === "processing") {
            const updatesSet = new Set();

            // Apply Updates
            if (pendingUpdates.length > 0) {
                people = people.map((p) => {
                    const update = pendingUpdates.find((u) => u.id === p.id);
                    // Check if value actually changes to trigger "Update" status
                    if (update && p.assignedStaff !== update.newStaff) {
                        updatesSet.add(p.id);
                        return { ...p, assignedStaff: update.newStaff };
                    }
                    return p;
                });
                recentlyUpdatedIds = updatesSet;
            }

            // --- CRM LOGIC: RE-QUEUE MODIFIED RECORDS ---
            // 1. Start with current queue
            const finalQueue = new Set(updateQueue);

            // 2. Remove all records processed in this pass (consumedIds)
            consumedIds.forEach((id) => finalQueue.delete(id));

            // 3. Re-Add records that were actually changed (updatesSet) for their 2nd pass
            updatesSet.forEach((id) => finalQueue.add(id));

            updateQueue = finalQueue;

            queueJobCompletion(workerRef, "success");
        }

        setTimeout(() => (recentlyUpdatedIds = new Set()), 1000);
        isRunning = false;
    }

    function getWaitTime(ms) {
        if (!ms || ms < 0) return "0s";
        return Math.floor(ms / 1000) + "s";
    }

    // --- VISUAL CALCULATIONS ---
    const CARD_WIDTH = 276;
    const CARD_HEIGHT = 100;
    const QUEUE_PADDING_X = 12;
    const QUEUE_START_Y = 64;
    const QUEUE_ITEM_HEIGHT = CARD_HEIGHT + 8;
    const WORKER_COL_X = 492;
    const WORKER_START_Y = 56;
    const WORKER_TOTAL_HEIGHT = 164;

    const WORKER_CARD_X_OFFSET = WORKER_COL_X + 76 + (344 - CARD_WIDTH) / 2;
    const WORKER_CARD_Y_OFFSET = (140 - CARD_HEIGHT) / 2 + 14;

    function getCardStyle(db) {
        let x = 0;
        let y = 0;
        let zIndex = 10;
        let opacity = 1;

        const queueIndex = displayDbQueue.findIndex((d) => d.id === db.id);
        const worker = workers.find((w) => w.activeDbId === db.id);

        if (queueIndex !== -1) {
            x = QUEUE_PADDING_X;
            y = QUEUE_START_Y + queueIndex * QUEUE_ITEM_HEIGHT;
        } else if (worker) {
            const workerIndex = workers.findIndex((w) => w.id === worker.id);
            x = WORKER_CARD_X_OFFSET;
            y =
                WORKER_START_Y +
                workerIndex * WORKER_TOTAL_HEIGHT +
                WORKER_CARD_Y_OFFSET;
            zIndex = 20;
        } else {
            opacity = 0;
        }

        return `transform: translate(${x}px, ${y}px); width: ${CARD_WIDTH}px; height: ${CARD_HEIGHT}px; z-index: ${zIndex}; opacity: ${opacity};`;
    }
</script>

<div class="explainer-container">
    <div class="panel macro-panel">
        <div class="panel-header no-border">
            <div></div>
            <div class="controls">
                <span class="speed-label">Simulation Speed: {speed}x</span>
                <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    bind:value={speed}
                    class="slider"
                />
            </div>
        </div>

        <div class="simulation-stage-wrapper">
            <div class="simulation-stage">
                <div class="queue-area">
                    <div class="area-label">
                        Waiting Queue ({displayDbQueue.length})
                    </div>
                    <div class="db-list vertical chute">
                        {#if displayDbQueue.length === 0}
                            <div class="queue-placeholder" in:fade>
                                All Databases Active
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="workers-area">
                    <div class="area-label">Worker Threads (3)</div>
                    <div class="workers-row vertical-stack">
                        {#each workers as worker (worker.id)}
                            <div class="worker-group side-by-side">
                                <div class="worker-ident side">
                                    <span class="w-label">THREAD</span>
                                    <span class="w-id">{worker.id}</span>
                                </div>
                                <div class="worker-slot docked">
                                    {#if !worker.activeDbId}
                                        <div class="empty-slot" in:fade>
                                            Idle Slot
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                <div class="cards-overlay">
                    {#each databases as db (db.id)}
                        <div class="db-card-wrapper" style={getCardStyle(db)}>
                            <div
                                class="db-card {db.status === 'processing' ||
                                db.status === 'completing'
                                    ? 'processing'
                                    : 'queued'}"
                                class:mine={db.isMine}
                            >
                                {#if db.status === "queued"}
                                    <div class="db-header">
                                        <span class="db-name">{db.name}</span>
                                        <div class="badge-group">
                                            {#if db.lastResult === "timeout"}<span
                                                    class="timeout-badge"
                                                    >TIMEOUT</span
                                                >{/if}
                                        </div>
                                    </div>
                                    <div class="db-stats">
                                        <span class="stat-row"
                                            ><span class="stat-val"
                                                >{db.pendingCount}</span
                                            > Updates</span
                                        >
                                        <div class="timers-row">
                                            <span class="stat-row wait-time"
                                                >Queue Wait: {getWaitTime(
                                                    now - db.waitStart,
                                                )}</span
                                            >
                                            {#if db.pendingSince && db.lastResult === "timeout"}
                                                <span
                                                    class="stat-row wait-time total-wait"
                                                    >Total: {getWaitTime(
                                                        now - db.pendingSince,
                                                    )}</span
                                                >
                                            {/if}
                                        </div>
                                    </div>
                                {:else}
                                    <div class="db-header">
                                        <div class="db-title-row">
                                            <span class="db-name"
                                                >{db.name}</span
                                            >
                                        </div>
                                    </div>
                                    <div class="task-progress-container">
                                        <div class="task-meta">
                                            <span class="task-name">
                                                {#if db.currentTask === "query"}(1/2)
                                                    Running Queries...{:else}(2/2)
                                                    Applying Actions...{/if}
                                            </span>
                                            <span class="timeout-label"
                                                >{Math.min(
                                                    100,
                                                    Math.floor(
                                                        db.timeoutCounter,
                                                    ),
                                                )}%</span
                                            >
                                        </div>
                                        <div class="main-track">
                                            <div
                                                class="main-fill navy"
                                                style="width: {db.taskProgress}%"
                                            ></div>
                                        </div>
                                        <div class="timeout-track">
                                            <div
                                                class="timeout-fill"
                                                style="width: {Math.min(
                                                    100,
                                                    db.timeoutCounter,
                                                )}%"
                                            ></div>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>

    <div class="detail-section">
        <div class="layout-grid">
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
                                <span class="priority-num">{rule.priority}</span
                                >
                            </div>
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
                                    <span class="count-label"
                                        >Matching Rows</span
                                    >
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
                                                <span>Major = </span>
                                                <select
                                                    value={rule.targetMajor}
                                                    on:change={(e) =>
                                                        updateRule(
                                                            rule.id,
                                                            "targetMajor",
                                                            e.target.value,
                                                        )}
                                                    class="rule-select"
                                                >
                                                    {#each MAJORS as major}<option
                                                            value={major}
                                                            >{major}</option
                                                        >{/each}
                                                </select>
                                                {#if rule.hasSlowOption}
                                                    <span class="separator"
                                                        >AND</span
                                                    >
                                                    <label class="toggle-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={rule.isSlowEnabled}
                                                            on:change={(e) =>
                                                                updateRule(
                                                                    rule.id,
                                                                    "isSlowEnabled",
                                                                    e.target
                                                                        .checked,
                                                                )}
                                                        />
                                                        Ping URL LIKE '%xyz.edu%'
                                                    </label>
                                                {/if}
                                            </div>
                                        {:else}
                                            <span class="logic-value code"
                                                >{rule.filterLabel}</span
                                            >
                                        {/if}
                                    </div>
                                    <div class="logic-row">
                                        <span class="logic-label">Action:</span>
                                        {#if rule.type === "configurable"}
                                            <div class="dynamic-logic">
                                                <span
                                                    >Set Staff Assigned =
                                                </span>
                                                <select
                                                    value={rule.resultStaff}
                                                    on:change={(e) =>
                                                        updateRule(
                                                            rule.id,
                                                            "resultStaff",
                                                            e.target.value,
                                                        )}
                                                    class="rule-select"
                                                >
                                                    {#each STAFF_OPTIONS as staff}<option
                                                            value={staff}
                                                            >{staff}</option
                                                        >{/each}
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

            <div class="col queue-column">
                <div class="panel queue-panel">
                    <div class="panel-header">
                        <h3>Update Queue</h3>
                        <span class="badge">{updateQueue.size}</span>
                    </div>
                    <div class="queue-status-bar" class:active={isRunning}>
                        {#if isRunning}
                            <div class="status-dot pulse"></div>
                            <span>Processing...</span>
                        {:else}
                            <div class="status-dot wait"></div>
                            <span>Waiting for Worker</span>
                        {/if}
                    </div>
                    <div class="queue-list">
                        {#if queueList.length === 0}
                            <div class="empty-msg">
                                No records pending update
                            </div>
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

            <div class="col records-column">
                <div class="panel records-panel">
                    <div class="panel-header"><h3>Person Records</h3></div>
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
                                        <td class="name-cell">{person.name}</td>
                                        <td>
                                            <select
                                                value={person.major}
                                                on:change={(e) =>
                                                    updatePersonField(
                                                        person.id,
                                                        "major",
                                                        e.target.value,
                                                    )}
                                                class="table-select"
                                            >
                                                {#each MAJORS as major}<option
                                                        value={major}
                                                        >{major}</option
                                                    >{/each}
                                            </select>
                                        </td>
                                        <td
                                            class="staff-cell"
                                            class:flash-gold={recentlyUpdatedIds.has(
                                                person.id,
                                            )}
                                        >
                                            <select
                                                value={person.assignedStaff ||
                                                    ""}
                                                on:change={(e) =>
                                                    updatePersonField(
                                                        person.id,
                                                        "assignedStaff",
                                                        e.target.value,
                                                    )}
                                                class="table-select"
                                            >
                                                <option value=""
                                                    >Unassigned</option
                                                >
                                                {#each STAFF_OPTIONS as staff}<option
                                                        value={staff}
                                                        >{staff}</option
                                                    >{/each}
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                value={person.staffLocked.toString()}
                                                on:change={(e) =>
                                                    updatePersonField(
                                                        person.id,
                                                        "staffLocked",
                                                        e.target.value ===
                                                            "true",
                                                    )}
                                                class="table-select"
                                            >
                                                <option value="false">No</option
                                                >
                                                <option value="true">Yes</option
                                                >
                                            </select>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                    <div class="action-row centered">
                        <button class="btn outline-btn" on:click={addAllToQueue}
                            >Retroactive Refresh All Records</button
                        >
                    </div>
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

    /* --- MACRO PANEL & LAYOUT --- */
    .macro-panel {
        margin-bottom: 2rem;
        border: 1px solid var(--color-accent-light);
        background-color: white;
        position: relative;
        z-index: 1;
    }

    .panel-header.no-border {
        border-bottom: none;
        padding-bottom: 0.5rem;
    }
    .controls {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .speed-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: #64748b;
    }
    .slider {
        cursor: pointer;
        accent-color: var(--color-secondary);
    }

    .simulation-stage-wrapper {
        display: flex;
        justify-content: center;
        padding: 0 1rem 1.5rem 1rem;
        background: radial-gradient(circle at center, #f8fafc 0%, white 70%);
        overflow: hidden;
    }

    .simulation-stage {
        position: relative;
        display: flex;
        gap: 12rem;
        width: fit-content;
        height: 640px;
        padding-top: 1rem;
    }

    .cards-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
    }

    .db-card-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        display: flex;
    }

    /* QUEUE COLUMN */
    .queue-area {
        width: 300px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        height: 100%;
        position: relative;
        z-index: 1;
    }
    .queue-area::after {
        content: "→";
        position: absolute;
        right: -7rem;
        top: 40%;
        transform: translateY(-50%);
        font-size: 4rem;
        color: #e2e8f0;
        font-weight: 300;
        opacity: 0.6;
    }
    .area-label {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #64748b;
        font-weight: 700;
        margin-bottom: 0.75rem;
    }
    .db-list.vertical {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 12px;
        width: 100%;
        background: #f1f5f9;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
        min-height: 580px;
        box-sizing: border-box;
    }
    .queue-placeholder {
        text-align: center;
        color: #94a3b8;
        font-style: italic;
        font-size: 0.9rem;
        margin-top: 2rem;
    }

    /* WORKERS COLUMN */
    .workers-area {
        width: 420px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        height: 100%;
        position: relative;
        z-index: 1;
    }
    .workers-row.vertical-stack {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        justify-content: flex-start;
        padding-top: 1.5rem;
    }
    .worker-group.side-by-side {
        display: flex;
        align-items: center;
        gap: 1rem;
        width: 100%;
    }
    .worker-ident.side {
        width: 60px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: center;
        opacity: 0.7;
    }
    .w-label {
        font-size: 0.6rem;
        color: #94a3b8;
        font-weight: 600;
        letter-spacing: 0.5px;
    }
    .w-id {
        font-family: var(--font-heading);
        font-size: 1.2rem;
        color: #64748b;
        line-height: 1;
    }
    .worker-slot.docked {
        flex: 1;
        height: 140px;
        background: white;
        border: 2px dashed #cbd5e1;
        border-radius: 8px;
        position: relative;
        padding: 8px;
        box-sizing: border-box;
        display: grid;
        place-items: center;
        transition: border-color 0.3s;
        z-index: 2;
    }
    .empty-slot {
        color: #cbd5e1;
        font-weight: 600;
        font-size: 0.9rem;
        text-align: center;
    }

    /* DB CARDS */
    .db-card {
        width: 100%;
        height: 100%;
        background: white;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 0.6rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        flex-shrink: 0;
        position: relative;
        box-sizing: border-box;
        overflow: hidden;
    }
    .db-card.processing {
        border: 2px solid var(--color-primary);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .db-card.mine {
        border-color: var(--color-secondary);
        background: #fffbf5;
    }
    .db-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.2rem;
    }
    .db-title-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .db-name {
        font-weight: 700;
        color: #334155;
        font-family: var(--font-mono);
        font-size: 0.8rem;
    }
    .badge-group {
        display: flex;
        gap: 4px;
        align-items: center;
    }
    .me-badge {
        background: var(--color-secondary);
        color: white;
        font-size: 0.6rem;
        padding: 1px 4px;
        border-radius: 3px;
        font-weight: bold;
    }
    .timeout-badge {
        background: #fee2e2;
        color: #ef4444;
        font-size: 0.55rem;
        padding: 1px 4px;
        border-radius: 3px;
        font-weight: bold;
        border: 1px solid #fecaca;
    }
    .db-stats {
        font-size: 0.7rem;
        color: #64748b;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .timers-row {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        width: 100%;
    }
    .stat-row {
        display: flex;
        gap: 4px;
        align-items: baseline;
    }
    .stat-val {
        font-weight: bold;
        color: #334155;
    }
    .wait-time {
        font-family: var(--font-mono);
        font-size: 0.65rem;
        color: #94a3b8;
    }
    .total-wait {
        color: #ef4444;
        font-weight: 600;
    }

    .task-progress-container {
        display: flex;
        flex-direction: column;
        gap: 3px;
        width: 100%;
        margin-top: 0.5rem;
    }
    .task-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.65rem;
        font-weight: 600;
        color: #64748b;
    }
    .timeout-label {
        color: #ef4444;
    }
    .main-track {
        height: 8px;
        background: #f1f5f9;
        border-radius: 4px;
        overflow: hidden;
    }
    .main-fill {
        height: 100%;
        transition: width 0.1s linear;
    }
    .main-fill.navy {
        background: var(--color-primary);
    }
    .timeout-track {
        height: 2px;
        background: transparent;
        margin-top: 1px;
    }
    .timeout-fill {
        height: 100%;
        background: #ef4444;
        transition: width 0.1s linear;
        opacity: 0.6;
    }

    /* LAYOUT & DETAIL */
    .layout-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
        align-items: start;
    }
    @media (min-width: 1200px) {
        .layout-grid {
            grid-template-columns: 500px 240px 1fr;
        }
    }

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
        font-family: var(--font-heading);
    }
    .badge {
        background: var(--color-secondary);
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.8rem;
        font-weight: bold;
    }

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

    .queue-list {
        padding: 1rem;
        background: #fff;
        min-height: 100px;
        max-height: 500px;
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

    .queue-status-bar {
        padding: 0.75rem 1rem;
        background: #f8fafc;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: #64748b;
        font-weight: 600;
    }
    .queue-status-bar.active {
        background: #f0f9ff;
        color: var(--color-primary);
    }
    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }
    .status-dot.wait {
        background: #cbd5e1;
    }
    .status-dot.pulse {
        background: var(--color-secondary);
        animation: pulse 1s infinite;
    }
    @keyframes pulse {
        0% {
            opacity: 1;
        }
        50% {
            opacity: 0.4;
        }
        100% {
            opacity: 1;
        }
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

    /* RULES STYLES */
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
        margin: 2px;
    }
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
    .dynamic-logic {
        display: flex;
        align-items: center;
        flex: 1;
        font-family: var(--font-mono);
        background: #f1f5f9;
        padding: 2px 4px;
        border-radius: 3px;
        color: #334155;
        width: fit-content;
        gap: 0.5rem;
        flex-wrap: wrap;
    }
    .rule-select {
        font-family: inherit;
        font-size: 0.85rem;
        padding: 0 14px 0 2px;
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
    .rule-select:hover {
        text-decoration: underline;
    }
    .separator {
        color: #cbd5e1;
        font-weight: bold;
        font-size: 0.7rem;
    }
    .toggle-label {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        cursor: pointer;
        font-size: 0.8rem;
    }
    .toggle-label input {
        accent-color: var(--color-primary);
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
    .outline-btn {
        background-color: transparent;
        border: 1px solid var(--color-primary);
        color: var(--color-primary);
    }
    .outline-btn:hover:not(:disabled) {
        background-color: #f1f5f9;
        transform: translateY(-1px);
    }
</style>
