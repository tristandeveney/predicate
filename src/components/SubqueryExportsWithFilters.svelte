<script>
    import {
        personData,
        schoolData,
        addressData,
        applicationData,
    } from "./data.js";
    import { fade, fly } from "svelte/transition";
    import { quintOut } from "svelte/easing";
    import { afterUpdate, onMount, onDestroy } from "svelte"; // Added onMount and onDestroy

    function draggable(node) {
        let x = 0;
        let y = 0;
        let startMouseX = 0;
        let startMouseY = 0;

        function handleMouseMove(e) {
            const dx = e.clientX - startMouseX;
            const dy = e.clientY - startMouseY;
            x += dx;
            y += dy;
            node.style.translate = `${x}px ${y}px`;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
        }

        function handleMouseUp() {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        }

        function handleMouseDown(e) {
            if (e.button !== 0) return;
            if (e.target.closest("button, input, select, textarea, a")) {
                return;
            }
            e.preventDefault();
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        node.style.cursor = "move";
        node.addEventListener("mousedown", handleMouseDown);

        return {
            destroy() {
                node.removeEventListener("mousedown", handleMouseDown);
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
            },
        };
    }

    function portal(node) {
        document.body.appendChild(node);
        return {
            destroy() {
                if (node.parentNode === document.body) {
                    document.body.removeChild(node);
                }
            },
        };
    }

    function generateId() {
        return crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    }

    function pluralize(word) {
        if (word.endsWith("s")) {
            return `${word}es`;
        }
        return `${word}s`;
    }

    const COLOR_MAP = {
        Person: "var(--color-persons)",
        School: "var(--color-schools)",
        Address: "var(--color-addresses)",
        Application: "var(--color-apps)",
        Subquery: "#f3f4f6",
    };
    const LINE_OFFSET_AMOUNT = 8;

    const SUBQUERY_COLORS = [
        "#3b82f6", // blue-500
        "#ec4899", // pink-500
        "#10b981", // emerald-500
        "#f97316", // orange-500
        "#8b5cf6", // violet-500
    ];

    const JOIN_FIELD_SCHEMAS = {
        Person: [
            "id",
            "name",
            "email",
            "dob",
            "major",
            "entryTerm",
            "createdDate",
        ],
        School: ["name", "levelOfStudy", "createdDate"],
        Address: ["type", "city", "state", "createdDate"],
        Application: ["major", "term", "submittedDate", "createdDate"],
    };

    const BASE_FIELDS = {
        Person: [
            "id",
            "name",
            "email",
            "dob",
            "major",
            "entryTerm",
            "createdDate",
        ],
        School: [
            "id",
            "name",
            "levelOfStudy",
            "code",
            "createdDate",
            "personId",
        ],
        Address: [
            "id",
            "type",
            "city",
            "state",
            "zip",
            "createdDate",
            "personId",
        ],
        Application: [
            "id",
            "major",
            "term",
            "submittedDate",
            "createdDate",
            "personId",
        ],
    };

    const RELATED_TABLES = {
        Person: [
            {
                name: "School",
                type: "one-to-many",
                data: schoolData,
                foreignKey: "personId",
            },
            {
                name: "Address",
                type: "one-to-many",
                data: addressData,
                foreignKey: "personId",
            },
            {
                name: "Application",
                type: "one-to-many",
                data: applicationData,
                foreignKey: "personId",
            },
        ],
        School: [
            {
                name: "Person",
                type: "many-to-one",
                data: personData,
                localKey: "personId",
            },
        ],
        Address: [
            {
                name: "Person",
                type: "many-to-one",
                data: personData,
                localKey: "personId",
            },
        ],
        Application: [
            {
                name: "Person",
                type: "many-to-one",
                data: personData,
                localKey: "personId",
            },
        ],
    };

    const ALL_DATA = {
        Person: personData,
        School: schoolData,
        Address: addressData,
        Application: applicationData,
    };

    let queryBase = "School";
    let selectedBaseId = ALL_DATA["School"]?.[0]?.id ?? null;

    let activeJoins = {
        Person: [],
        School: [],
        Address: [],
        Application: [],
    };

    let activeExports = [];
    let isPreviewModalOpen = false;

    let draggedItem = null;
    let dragStartExportIndex = null;
    let dropIndicatorIndex = null;

    let activeFilters = [];
    let dragStartFilterIndex = null;
    let isFilterZoneActive = false;

    let isJoinModalOpen = false;
    let modalConfig = {
        tableName: "",
        data: [],
        fields: [],
        joinType: "rank",
        rankInput: 1,
        customRankInput: 1,
        customSort: { field: "createdDate", direction: "asc" },
        joinLabel: "",
        isParentJoin: false,
    };
    $: isJoinLabelValid =
        modalConfig.isParentJoin ||
        modalConfig.joinType === "rank" ||
        modalConfig.joinLabel.trim().length > 0;

    let isSubqueryModalOpen = false;
    let subqueryModalConfig = {
        base: null, // <<< CHANGED: Default to null
        outputType: "count",
        label: "",
        dropIndex: null,
        filterLevel: "All",
    };

    // --- NEW: State for Join Popover ---
    let isSubqueryJoinMenuOpen = false;
    let subqueryJoinBtnEl;
    let subqueryJoinPopoverEl;
    let popoverStyle = "";
    // --- END NEW ---

    $: subqueryRelatedTables = RELATED_TABLES["Person"]?.map((r) => r.name) || [
        "School",
        "Address",
        "Application",
    ];
    // --- CHANGED: Renamed and updated validation ---
    $: isSubqueryFormValid =
        subqueryModalConfig.label.trim().length > 0 &&
        !!subqueryModalConfig.base;

    let isQueryBaseModalOpen = false;

    let isWarningModalOpen = false;
    let warningModalMessage = "";

    let containerEl;
    let baseCardEl;
    let relatedRowRefs = {};
    let subqueryExportRefs = {};
    let connectorPaths = [];
    let subqueryBrackets = [];

    let subqueryColorIndex = 0;

    // --- FIX: Removed TypeScript syntax ---
    let hoveredSubqueryId = null;
    let hoveredRowItemId = null;
    // --- END FIX ---

    // --- NEW: Popover positioning and click-outside logic ---
    $: if (isSubqueryJoinMenuOpen && subqueryJoinBtnEl) {
        const rect = subqueryJoinBtnEl.getBoundingClientRect();
        popoverStyle = `position: fixed; top: ${
            rect.bottom + 4
        }px; left: ${rect.left}px; z-index: 1002; min-width: ${rect.width}px;`;
    }

    function handleClickOutside(event) {
        if (
            isSubqueryJoinMenuOpen &&
            subqueryJoinBtnEl &&
            !subqueryJoinBtnEl.contains(event.target) &&
            subqueryJoinPopoverEl &&
            !subqueryJoinPopoverEl.contains(event.target)
        ) {
            isSubqueryJoinMenuOpen = false;
        }
    }

    onMount(() => {
        window.addEventListener("click", handleClickOutside, true); // Use capture phase
    });

    onDestroy(() => {
        window.removeEventListener("click", handleClickOutside, true);
    });

    function selectSubqueryBase(tableName) {
        subqueryModalConfig.base = tableName;
        isSubqueryJoinMenuOpen = false;
    }
    // --- END NEW ---

    function resetQuery(newBase) {
        queryBase = newBase;
        selectedBaseId = ALL_DATA[newBase]?.[0]?.id ?? null;
        activeJoins = { Person: [], School: [], Address: [], Application: [] };
        activeExports = [];
        activeFilters = [];
        isQueryBaseModalOpen = false;
        connectorPaths = [];
        subqueryBrackets = [];
        subqueryExportRefs = {};
        subqueryColorIndex = 0;
    }

    function resolve(joins, data) {
        if (!data) return [];
        return joins.map((join) => {
            let resolvedIndex = null;
            if (!join)
                return { id: `error-${Math.random()}`, resolvedIndex: null };

            if (join.type === "rank") {
                const index = join.rank - 1;
                if (index >= 0 && index < data.length) {
                    resolvedIndex = index;
                }
            } else if (join.type === "custom") {
                if (!data || data.length === 0 || !join.customSort?.field)
                    return { ...join, resolvedIndex: null };
                try {
                    const sortedData = [...data].sort((a, b) => {
                        const field = join.customSort.field;
                        const valA = a?.[field];
                        const valB = b?.[field];

                        if (valA === undefined || valA === null) return 1;
                        if (valB === undefined || valB === null) return -1;

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
                        if (originalRecord) {
                            resolvedIndex = data.findIndex(
                                (item) => item?.id === originalRecord.id,
                            );
                        }
                    }
                } catch (sortError) {
                    console.error("Error during custom sort:", sortError, {
                        join,
                        data,
                    });
                }
            }
            return { ...join, resolvedIndex };
        });
    }

    $: if (queryBase && ALL_DATA[queryBase]?.length > 0) {
        const currentData = ALL_DATA[queryBase];
        const isValidId = currentData.some((r) => r.id === selectedBaseId);
        if (!isValidId && currentData[0]) {
            selectedBaseId = currentData[0].id;
        } else if (currentData.length === 0) {
            selectedBaseId = null;
        }
    } else {
        selectedBaseId = null;
    }

    $: selectedBaseRecord =
        queryBase && selectedBaseId !== null
            ? (ALL_DATA[queryBase]?.find((r) => r.id === selectedBaseId) ??
              null)
            : null;

    function getFilteredSubqueryData(allRelatedData, filters) {
        if (!Array.isArray(allRelatedData)) return [];
        if (!Array.isArray(filters) || filters.length === 0) {
            return allRelatedData;
        }

        let filteredData = allRelatedData.filter((record) => {
            return filters.every((filter) => {
                if (filter.op === "=") {
                    return record[filter.field] === filter.value;
                }
                return true;
            });
        });

        return filteredData;
    }

    function getRelatedDataForRecord(record, baseType) {
        if (!record || !baseType || !RELATED_TABLES[baseType]) return {};
        const relatedDataMap = {};
        const relations = RELATED_TABLES[baseType];
        for (const relation of relations) {
            try {
                if (!relation || !relation.data || !relation.name) continue;

                if (
                    relation.type === "one-to-many" &&
                    relation.foreignKey &&
                    record.id !== undefined
                ) {
                    relatedDataMap[relation.name] = relation.data.filter(
                        (r) => r?.[relation.foreignKey] === record.id,
                    );
                } else if (
                    relation.type === "many-to-one" &&
                    relation.localKey &&
                    record[relation.localKey] !== undefined
                ) {
                    const parentId = record[relation.localKey];
                    const parentRecord = relation.data.find(
                        (r) => r?.id === parentId,
                    );
                    relatedDataMap[relation.name] = parentRecord
                        ? [parentRecord]
                        : [];
                } else {
                    relatedDataMap[relation.name] = [];
                }
            } catch (e) {
                console.error(
                    `Error processing relation ${relation?.name} for record ${record.id}:`,
                    e,
                );
                relatedDataMap[relation.name] = [];
            }
        }
        return relatedDataMap;
    }

    function getResolvedJoinsForRecord(relatedData, joinsConfig) {
        if (!joinsConfig || !relatedData) return {};
        const resolved = {};
        for (const tableName in relatedData) {
            const joinsForTable = Array.isArray(joinsConfig[tableName])
                ? joinsConfig[tableName]
                : [];
            resolved[tableName] = resolve(
                joinsForTable,
                relatedData[tableName],
            );
        }
        return resolved;
    }

    $: dynamicRelatedData = getRelatedDataForRecord(
        selectedBaseRecord,
        queryBase,
    );
    $: resolvedJoins = getResolvedJoinsForRecord(
        dynamicRelatedData,
        activeJoins,
    );

    $: rowSubqueryMatches = (() => {
        const matchMap = new Map();
        if (!dynamicRelatedData || !queryBase) return matchMap;

        for (const relation of RELATED_TABLES[queryBase] || []) {
            const tableData = dynamicRelatedData[relation.name] || [];
            const subqueriesForThisTable = activeExports.filter(
                (ex) =>
                    ex.type === "subquery" && ex.subqueryBase === relation.name,
            );

            if (subqueriesForThisTable.length === 0) continue;

            for (const item of tableData) {
                const matchingIds = new Set();
                for (const sq of subqueriesForThisTable) {
                    if (!sq || !sq.filters) continue;
                    const qualifiedData = getFilteredSubqueryData(
                        [item],
                        sq.filters,
                    );
                    if (qualifiedData.length > 0) {
                        matchingIds.add(sq.id);
                    }
                }
                matchMap.set(item.id, matchingIds);
            }
        }
        return matchMap;
    })();

    function getAvailableDataForBaseRecord(baseRecord, baseType, joinsConfig) {
        const availableDataMap = new Map();
        if (!baseRecord || !baseType || !BASE_FIELDS[baseType])
            return availableDataMap;

        const addedBaseKeys = new Set();
        for (const propKey of BASE_FIELDS[baseType]) {
            const key = `${baseType.toLowerCase()}.${propKey}`;
            availableDataMap.set(key, baseRecord[propKey]);
            addedBaseKeys.add(key);
        }

        const relatedDataForRecord = getRelatedDataForRecord(
            baseRecord,
            baseType,
        );
        const resolvedJoinsForRecord = getResolvedJoinsForRecord(
            relatedDataForRecord,
            joinsConfig,
        );

        const processJoins = (tableJoins, tableData, tableName, schema) => {
            if (!tableJoins || !tableName) return;
            tableJoins.forEach((join) => {
                if (!join || !join.key) return;
                const record =
                    join.resolvedIndex !== null &&
                    tableData &&
                    join.resolvedIndex >= 0 &&
                    join.resolvedIndex < tableData.length
                        ? tableData[join.resolvedIndex]
                        : null;

                const joinedBaseFields = BASE_FIELDS[tableName] || [];
                joinedBaseFields.forEach((baseField) => {
                    const key = `${tableName}.${join.key}.${baseField}`;
                    if (!addedBaseKeys.has(key)) {
                        const value = record?.[baseField] ?? "---";
                        availableDataMap.set(key, value);
                    }
                });

                if (schema) {
                    for (const propKey of schema) {
                        if (joinedBaseFields.includes(propKey)) continue;
                        const key = `${tableName}.${join.key}.${propKey}`;
                        if (!addedBaseKeys.has(key)) {
                            const value = record?.[propKey] ?? "---";
                            availableDataMap.set(key, value);
                        }
                    }
                }
            });
        };

        for (const tableName in resolvedJoinsForRecord) {
            processJoins(
                resolvedJoinsForRecord[tableName],
                relatedDataForRecord[tableName],
                tableName,
                JOIN_FIELD_SCHEMAS[tableName],
            );
        }
        return availableDataMap;
    }

    $: resolvedBaseRecordPreviewItems = (() => {
        if (!selectedBaseRecord || !queryBase) return [];
        try {
            const availableDataMap = getAvailableDataForBaseRecord(
                selectedBaseRecord,
                queryBase,
                activeJoins,
            );
            return Array.from(availableDataMap.entries()).map(
                ([key, value]) => {
                    let origin = queryBase;
                    const keyParts = key.split(".");
                    const sourceTable =
                        keyParts.length > 0
                            ? keyParts[0].charAt(0).toUpperCase() +
                              keyParts[0].slice(1)
                            : queryBase;

                    if (COLOR_MAP[sourceTable]) {
                        origin = sourceTable;
                    }

                    return { key, value: value ?? "---", origin };
                },
            );
        } catch (e) {
            console.error("Error creating resolvedBaseRecordPreviewItems:", e);
            return [
                {
                    key: "Error",
                    value: `Could not generate preview items: ${e.message}`,
                    origin: queryBase,
                },
            ];
        }
    })();

    $: availableDataPalette = (() => {
        if (!queryBase || !BASE_FIELDS[queryBase]) return [];
        const paletteItems = [];
        const uniqueKeys = new Set();

        try {
            BASE_FIELDS[queryBase].forEach((field) => {
                let key = `${queryBase.toLowerCase()}.${field}`;

                let isFilterable = false;
                if (queryBase === "Person" && field === "id") {
                    isFilterable = true;
                } else if (
                    queryBase === "School" &&
                    (field === "personId" || field === "levelOfStudy")
                ) {
                    isFilterable = true;
                } else if (queryBase === "Address" && field === "personId") {
                    isFilterable = true;
                } else if (
                    queryBase === "Application" &&
                    field === "personId"
                ) {
                    isFilterable = true;
                }

                if (key === "school.personId") key = "person.id";
                if (key === "address.personId") key = "person.id";
                if (key === "application.personId") key = "person.id";

                if (key === "school.levelOfStudy" && queryBase !== "School") {
                    isFilterable = false;
                }

                if (!uniqueKeys.has(key)) {
                    paletteItems.push({ key, origin: queryBase, isFilterable });
                    uniqueKeys.add(key);
                }
            });

            for (const tableName in activeJoins) {
                const currentJoins = activeJoins[tableName];
                if (!Array.isArray(currentJoins) || !BASE_FIELDS[tableName])
                    continue;

                const schema = JOIN_FIELD_SCHEMAS[tableName];

                currentJoins.forEach((join) => {
                    if (!join || !join.key) return;

                    BASE_FIELDS[tableName].forEach((baseField) => {
                        const key = `${tableName}.${join.key}.${baseField}`;

                        let isFilterable = false;
                        if (tableName === "Person" && baseField === "id") {
                            isFilterable = true;
                        } else if (
                            tableName === "School" &&
                            (baseField === "personId" ||
                                baseField === "levelOfStudy")
                        ) {
                            isFilterable = true;
                        }

                        if (
                            key.endsWith("school.levelOfStudy") &&
                            queryBase !== "School"
                        ) {
                            isFilterable = false;
                        }

                        if (!uniqueKeys.has(key)) {
                            paletteItems.push({
                                key,
                                origin: tableName,
                                isFilterable,
                            });
                            uniqueKeys.add(key);
                        }
                    });

                    if (schema) {
                        schema.forEach((schemaField) => {
                            const key = `${tableName}.${join.key}.${schemaField}`;
                            const isFilterable = false;
                            if (!uniqueKeys.has(key)) {
                                paletteItems.push({
                                    key,
                                    origin: tableName,
                                    isFilterable,
                                });
                                uniqueKeys.add(key);
                            }
                        });
                    }
                });
            }
        } catch (e) {
            console.error("Error creating availableDataPalette:", e);
            return [
                {
                    key: "Error generating palette",
                    origin: queryBase,
                    isFilterable: false,
                },
            ];
        }
        return paletteItems;
    })();

    function applyFilters(data, filters) {
        if (!filters || filters.length === 0) {
            return data;
        }

        return data.filter((record) => {
            return filters.every((filter) => {
                if (!filter.active) return true;

                const key = filter.key;
                const value = filter.value;

                if (key.endsWith(".id") || key === "personId") {
                    const idToCompare =
                        queryBase === "Person" ? record.id : record.personId;
                    if (value === null || value === undefined || value === "")
                        return true;
                    const parsedId = parseInt(value, 10);
                    if (isNaN(parsedId)) return false;
                    return idToCompare === parsedId;
                }

                if (key.endsWith(".levelOfStudy")) {
                    if (!value || value === "") return true;
                    return record.levelOfStudy === value;
                }

                return true;
            });
        });
    }

    $: resolvedPreviewData = (() => {
        if (!queryBase || !ALL_DATA[queryBase]) {
            return { headers: [], rows: [] };
        }

        const active = activeExports.filter((ex) => ex && ex.active);
        const headers = active.map((ex) => ex.key);
        const rows = [];

        const baseData = ALL_DATA[queryBase];
        let filteredBaseData = [];
        let calculationError = null;

        try {
            filteredBaseData = applyFilters(baseData, activeFilters);

            if (!Array.isArray(filteredBaseData)) {
                console.warn(
                    "filteredBaseData is not an array:",
                    filteredBaseData,
                );
                filteredBaseData = [];
            }

            for (const record of filteredBaseData) {
                if (!record || typeof record !== "object") continue;

                let dataMap;
                try {
                    dataMap = getAvailableDataForBaseRecord(
                        record,
                        queryBase,
                        activeJoins,
                    );
                } catch (mapError) {
                    console.error(
                        `Error in getAvailableDataForBaseRecord for record ID ${record.id}:`,
                        mapError,
                    );
                    continue;
                }

                if (!(dataMap instanceof Map)) {
                    console.warn(
                        `getAvailableDataForBaseRecord did not return a Map for record ID ${record.id}`,
                    );
                    continue;
                }

                const row = active.map((ex) => {
                    if (ex.type === "subquery") {
                        try {
                            const relatedDataForThisRow =
                                getRelatedDataForRecord(record, queryBase);
                            const allSubqueryData =
                                relatedDataForThisRow[ex.subqueryBase];

                            const filteredSubqueryData =
                                getFilteredSubqueryData(
                                    allSubqueryData,
                                    ex.filters,
                                );

                            if (ex.subqueryOutput === "count") {
                                return Array.isArray(filteredSubqueryData)
                                    ? filteredSubqueryData.length
                                    : 0;
                            }
                        } catch (e) {
                            console.error(
                                `Subquery calculation failed for ${ex.key}:`,
                                e,
                            );
                            return "ERR";
                        }
                        return "---";
                    }

                    return ex?.key
                        ? (dataMap.get(ex.key) ?? "---")
                        : "Invalid Export";
                });
                rows.push(row);
            }
        } catch (error) {
            console.error("Error during preview data resolution:", error);
            calculationError = `Preview generation failed: ${error.message}. Check console for details.`;
        }

        if (calculationError) {
            return { headers: ["Error"], rows: [[calculationError]] };
        }

        return { headers, rows };
    })();

    $: allJoins = Object.entries(activeJoins).flatMap(([tableName, joins]) =>
        (Array.isArray(joins) ? joins : []).map((join) => ({
            ...join,
            tableName,
        })),
    );

    $: if (queryBase) {
        relatedRowRefs = {};
        subqueryExportRefs = {};
        if (RELATED_TABLES[queryBase]) {
            for (const relation of RELATED_TABLES[queryBase]) {
                if (relation?.name) {
                    relatedRowRefs[relation.name] = [];
                    subqueryExportRefs[relation.name] = [];
                }
            }
        }
    }

    afterUpdate(() => {
        if (containerEl && baseCardEl) {
            updatePaths();
        } else {
            if (connectorPaths.length > 0) connectorPaths = [];
            if (subqueryBrackets.length > 0) subqueryBrackets = [];
        }
    });

    const updatePaths = () => {
        if (!baseCardEl || !resolvedJoins || !containerEl || !relatedRowRefs) {
            if (connectorPaths.length > 0) connectorPaths = [];
            if (subqueryBrackets.length > 0) subqueryBrackets = [];
            return;
        }

        const newPaths = [];
        const containerRect = containerEl.getBoundingClientRect();
        if (!containerRect || containerRect.width <= 0) {
            if (connectorPaths.length > 0) connectorPaths = [];
            if (subqueryBrackets.length > 0) subqueryBrackets = [];
            return;
        }

        for (const tableName in resolvedJoins) {
            const joins = resolvedJoins[tableName];
            if (!Array.isArray(joins) || joins.length === 0) continue;

            const rowRefs = relatedRowRefs[tableName] || [];
            const color = COLOR_MAP[tableName];
            if (!color) continue;

            const joinsPerIndex = {};
            joins.forEach((join) => {
                if (
                    join?.resolvedIndex !== null &&
                    typeof join.resolvedIndex === "number"
                ) {
                    joinsPerIndex[join.resolvedIndex] =
                        (joinsPerIndex[join.resolvedIndex] || 0) + 1;
                }
            });

            const processedCountPerIndex = {};
            joins.forEach((join) => {
                if (
                    join?.id &&
                    join.resolvedIndex !== null &&
                    typeof join.resolvedIndex === "number" &&
                    join.resolvedIndex >= 0
                ) {
                    if (join.resolvedIndex < rowRefs.length) {
                        const targetEl = rowRefs[join.resolvedIndex];
                        if (targetEl instanceof Element) {
                            const totalJoinsForThisIndex =
                                joinsPerIndex[join.resolvedIndex] || 1;
                            const currentJoinNum =
                                processedCountPerIndex[join.resolvedIndex] || 0;
                            const offset =
                                (currentJoinNum -
                                    (totalJoinsForThisIndex - 1) / 2) *
                                LINE_OFFSET_AMOUNT;

                            try {
                                const path = getConnectorPath(
                                    baseCardEl,
                                    targetEl,
                                    color,
                                    offset,
                                );
                                if (path) {
                                    newPaths.push({ ...path, id: join.id });
                                }
                            } catch (pathError) {
                                console.error(
                                    `Error generating path for join ${join.id}:`,
                                    pathError,
                                );
                            }

                            processedCountPerIndex[join.resolvedIndex] =
                                currentJoinNum + 1;
                        }
                    }
                }
            });
        }

        const currentPathsString = JSON.stringify(connectorPaths);
        const newPathsString = JSON.stringify(newPaths);
        if (newPathsString !== currentPathsString) {
            connectorPaths = newPaths;
        }

        if (subqueryBrackets.length > 0) {
            subqueryBrackets = [];
        }
    };

    function getConnectorPath(sourceEl, targetEl, color, yOffset = 0) {
        if (
            !sourceEl ||
            !targetEl ||
            !containerEl ||
            !(sourceEl instanceof Element) ||
            !(targetEl instanceof Element)
        )
            return null;

        const containerRect = containerEl.getBoundingClientRect();
        if (
            !containerRect ||
            containerRect.width <= 0 ||
            containerRect.height <= 0
        )
            return null;

        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        if (
            !sourceRect ||
            !targetRect ||
            sourceRect.width <= 0 ||
            sourceRect.height <= 0 ||
            targetRect.width <= 0 ||
            targetRect.height <= 0
        )
            return null;

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

        if (
            isNaN(startX) ||
            isNaN(startY) ||
            isNaN(endX) ||
            isNaN(endY) ||
            startX < 0 ||
            endX < 0
        ) {
            return null;
        }

        if (endX <= startX + 5) {
            return null;
        }

        const handleOffset = Math.max((endX - startX) * 0.4, 30);
        const d = `M ${startX} ${startY} C ${startX + handleOffset} ${startY}, ${
            endX - handleOffset
        } ${endY}, ${endX} ${endY}`;
        return { d, color };
    }

    function openJoinModal(tableName, data) {
        if (!queryBase || !RELATED_TABLES[queryBase]) return;
        const relation = RELATED_TABLES[queryBase].find(
            (r) => r?.name === tableName,
        );
        if (!relation) return;

        const isParentJoin = relation.type === "many-to-one";
        const fields = JOIN_FIELD_SCHEMAS[tableName] || [];
        isJoinModalOpen = true;
        modalConfig = {
            tableName,
            data: Array.isArray(data) ? data : [],
            fields,
            joinType: "rank",
            rankInput: 1,
            customRankInput: 1,
            customSort: { field: fields[0] ?? "createdDate", direction: "asc" },
            joinLabel: isParentJoin ? tableName.toLowerCase() : "",
            isParentJoin: isParentJoin,
        };
    }
    function closeJoinModal() {
        isJoinModalOpen = false;
    }
    function applyJoin() {
        const {
            tableName,
            joinType,
            rankInput,
            customRankInput,
            customSort,
            joinLabel,
            isParentJoin,
        } = modalConfig;
        if (!isJoinLabelValid || !tableName) return;

        let saneLabel;
        if (isParentJoin) {
            saneLabel = tableName.toLowerCase();
        } else {
            saneLabel = (
                joinType === "rank" ? `rank_${rankInput}` : joinLabel || ""
            )
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9_]+/g, "_")
                .replace(/^_+|_+$/g, "");

            if (!saneLabel) {
                console.warn(
                    "Custom join label is invalid or empty after sanitization.",
                );
                return;
            }
        }

        const currentJoins = activeJoins[tableName] || [];
        const existingLabels = currentJoins.map((j) => j?.key).filter(Boolean);
        let finalLabel = saneLabel;
        let counter = 2;
        while (existingLabels.includes(finalLabel)) {
            finalLabel = `${saneLabel}_${counter}`;
            counter++;
            if (counter > 100) {
                console.error(
                    "Could not generate unique join label for:",
                    saneLabel,
                );
                return;
            }
        }

        let newJoin;
        const newId = generateId();

        if (isParentJoin) {
            newJoin = { type: "rank", rank: 1, key: finalLabel, id: newId };
        } else if (joinType === "rank") {
            const rank = parseInt(rankInput, 10);
            if (isNaN(rank) || rank < 1) {
                console.warn("Invalid rank input:", rankInput);
                return;
            }
            newJoin = { type: "rank", rank: rank, key: finalLabel, id: newId };
        } else {
            const rank = parseInt(customRankInput, 10);
            if (isNaN(rank) || rank < 1) {
                console.warn("Invalid custom rank input:", customRankInput);
                return;
            }
            if (!customSort || !customSort.field) {
                console.warn("Invalid custom sort field");
                return;
            }
            newJoin = {
                type: "custom",
                rank: rank,
                customSort: { ...customSort },
                key: finalLabel,
                id: newId,
            };
        }

        activeJoins[tableName] = [...currentJoins, newJoin];
        activeJoins = { ...activeJoins };
        closeJoinModal();
    }
    function removeJoin(tableName, joinIdToRemove) {
        if (!tableName || !joinIdToRemove || !activeJoins[tableName]) return;

        const currentTableJoins = activeJoins[tableName];
        const joinToRemove = currentTableJoins.find(
            (j) => j?.id === joinIdToRemove,
        );
        if (!joinToRemove?.key) return;

        const prefixToRemove = `${tableName}.${joinToRemove.key}.`;
        const dependentExports = activeExports.filter((ex) =>
            ex?.key?.startsWith(prefixToRemove),
        );

        if (dependentExports.length > 0) {
            warningModalMessage = `Cannot remove join "${
                joinToRemove.key
            }". Please remove the following dependent exports first:\n\n${dependentExports
                .map((ex) => `- ${ex.key}`)
                .join("\n")}`;
            isWarningModalOpen = true;
            return;
        }

        activeJoins[tableName] = currentTableJoins.filter(
            (j) => j?.id !== joinIdToRemove,
        );
        activeJoins = { ...activeJoins };
    }

    function closeSubqueryModal() {
        isSubqueryModalOpen = false;
        isSubqueryJoinMenuOpen = false; // NEW
        subqueryModalConfig = {
            ...subqueryModalConfig,
            base: null, // NEW: ensure base is reset
            label: "",
            dropIndex: null,
            filterLevel: "All",
        };
        handleDragEnd();
    }

    function applySubqueryExport() {
        const { base, outputType, label, dropIndex, filterLevel } =
            subqueryModalConfig;

        // --- CHANGED: Use new validation var ---
        if (!isSubqueryFormValid) return;

        // --- NEW: Added explicit check for base ---
        if (!base) {
            warningModalMessage = `You must select a join base (e.g., Schools) for the subquery.`;
            isWarningModalOpen = true;
            return;
        }

        const saneLabel = label.trim();
        if (activeExports.some((ex) => ex.key === saneLabel)) {
            warningModalMessage = `An export with the label "${saneLabel}" already exists. Please choose a unique label.`;
            isWarningModalOpen = true;
            return;
        }

        let subqueryFilters = [];
        if (base === "School" && filterLevel && filterLevel !== "All") {
            subqueryFilters.push({
                field: "levelOfStudy",
                op: "=",
                value: filterLevel,
            });
        }

        const newColor =
            SUBQUERY_COLORS[subqueryColorIndex % SUBQUERY_COLORS.length];
        subqueryColorIndex++;

        const newExport = {
            id: generateId(),
            key: saneLabel,
            origin: "Subquery",
            active: true,
            type: "subquery",
            subqueryBase: base,
            subqueryOutput: outputType,
            filters: subqueryFilters,
            color: newColor,
        };

        const safeDropIndex =
            dropIndex === null || dropIndex < 0
                ? activeExports.length
                : Math.min(dropIndicatorIndex, activeExports.length);

        activeExports.splice(safeDropIndex, 0, newExport);
        activeExports = [...activeExports];

        closeSubqueryModal();
    }

    function closeWarningModal() {
        isWarningModalOpen = false;
        warningModalMessage = "";
    }

    function handlePaletteDragStart(item) {
        draggedItem = item;
        dragStartExportIndex = null;
        dragStartFilterIndex = null;
    }

    function handleDragEnd() {
        draggedItem = null;
        dragStartExportIndex = null;
        dragStartFilterIndex = null;
        dropIndicatorIndex = null;
        isFilterZoneActive = false;
    }

    function handleExportDrop(e) {
        e.preventDefault();

        const targetIsFilterZone = e.target.closest(".filter-dropzone");
        if (targetIsFilterZone && draggedItem?.isFilterable) {
            handleDragEnd();
            return;
        }

        if (draggedItem) {
            if (draggedItem.isSubquery) {
                subqueryModalConfig = {
                    base: null, // <<< CHANGED
                    outputType: "count",
                    label: "",
                    dropIndex: dropIndicatorIndex,
                    filterLevel: "All",
                };
                isSubqueryModalOpen = true;
                return;
            }

            if (draggedItem.isFilterable && isFilterZoneActive) {
                handleDragEnd();
                return;
            }
            if (!activeExports.some((ex) => ex?.key === draggedItem.key)) {
                const newExport = {
                    id: generateId(),
                    key: draggedItem.key,
                    origin: draggedItem.origin,
                    active: true,
                    type: "field",
                };
                const safeDropIndex =
                    dropIndicatorIndex === null || dropIndicatorIndex < 0
                        ? activeExports.length
                        : Math.min(dropIndicatorIndex, activeExports.length);
                activeExports.splice(safeDropIndex, 0, newExport);
                activeExports = [...activeExports];
            }
        } else if (dragStartExportIndex !== null) {
            if (
                dropIndicatorIndex === null ||
                dropIndicatorIndex < 0 ||
                dropIndicatorIndex > activeExports.length
            ) {
                console.warn(
                    "Invalid dropIndicatorIndex for reorder:",
                    dropIndicatorIndex,
                );
                handleDragEnd();
                return;
            }
            if (
                dragStartExportIndex >= 0 &&
                dragStartExportIndex < activeExports.length
            ) {
                const itemToMove = activeExports.splice(
                    dragStartExportIndex,
                    1,
                )[0];
                if (itemToMove) {
                    const finalDropIndex =
                        dragStartExportIndex < dropIndicatorIndex
                            ? dropIndicatorIndex - 1
                            : dropIndicatorIndex;
                    if (
                        finalDropIndex >= 0 &&
                        finalDropIndex <= activeExports.length
                    ) {
                        activeExports.splice(finalDropIndex, 0, itemToMove);
                        activeExports = [...activeExports];
                    } else {
                        console.error(
                            "Invalid final drop index during reorder:",
                            finalDropIndex,
                        );
                        activeExports.splice(
                            dragStartExportIndex,
                            0,
                            itemToMove,
                        );
                        activeExports = [...activeExports];
                    }
                }
            }
        }
        handleDragEnd();
    }

    function handleExportDragStart(index) {
        if (index >= 0 && index < activeExports.length) {
            dragStartExportIndex = index;
            draggedItem = null;
            dragStartFilterIndex = null;
        } else {
            console.error("Invalid index for handleExportDragStart:", index);
            dragStartExportIndex = null;
        }
    }

    function handleItemDragOver(event, index) {
        event.preventDefault();
        event.stopPropagation();

        if (draggedItem || dragStartExportIndex !== null) {
            isFilterZoneActive = false;
            dropIndicatorIndex = index;
            event.dataTransfer.dropEffect = draggedItem ? "copy" : "move";
        } else {
            event.dataTransfer.dropEffect = "none";
        }
    }

    function handleZoneDragOver(event) {
        event.preventDefault();
        const targetIsFilterZone = event.target.closest(".filter-dropzone");

        if (
            targetIsFilterZone &&
            (draggedItem?.isFilterable || dragStartFilterIndex !== null)
        ) {
            return;
        } else if (
            !targetIsFilterZone &&
            (draggedItem || dragStartExportIndex !== null)
        ) {
            isFilterZoneActive = false;
            dropIndicatorIndex = activeExports.length;
            event.dataTransfer.dropEffect = draggedItem ? "copy" : "move";
        } else {
            isFilterZoneActive = false;
            dropIndicatorIndex = null;
            event.dataTransfer.dropEffect = "none";
        }
    }

    function handleZoneDragLeave(event) {
        const relatedTarget = event.relatedTarget;
        const leavingCurrent = !event.currentTarget.contains(relatedTarget);

        if (leavingCurrent) {
            isFilterZoneActive = false;
            dropIndicatorIndex = null;
        }
    }

    function removeExport(idToRemove) {
        activeExports = activeExports.filter((ex) => ex?.id !== idToRemove);
        activeExports = [...activeExports];
        if (!activeExports.some((ex) => ex.type === "subquery")) {
            subqueryColorIndex = 0;
        }
    }

    function handleFilterDragStart(index) {
        if (index >= 0 && index < activeFilters.length) {
            dragStartFilterIndex = index;
            draggedItem = null;
            dragStartExportIndex = null;
        }
    }

    function handleFilterItemDragOver(event, index) {
        event.preventDefault();
        event.stopPropagation();
        if (draggedItem?.isFilterable || dragStartFilterIndex !== null) {
            isFilterZoneActive = true;
            dropIndicatorIndex = index;
            event.dataTransfer.dropEffect = draggedItem ? "link" : "move";
        } else {
            event.dataTransfer.dropEffect = "none";
        }
    }

    function handleFilterZoneDragOver(e) {
        e.preventDefault();
        if (draggedItem?.isFilterable || dragStartFilterIndex !== null) {
            isFilterZoneActive = true;
            if (e.target.classList.contains("filter-dropzone")) {
                dropIndicatorIndex = activeFilters.length;
            }
            e.dataTransfer.dropEffect = draggedItem ? "link" : "move";
        } else {
            e.dataTransfer.dropEffect = "none";
        }
    }

    function handleFilterZoneDragLeave(e) {
        const relatedTarget = e.relatedTarget;
        if (!e.currentTarget.contains(relatedTarget)) {
            isFilterZoneActive = false;
            dropIndicatorIndex = null;
        }
    }

    function handleFilterDrop(e) {
        e.preventDefault();
        isFilterZoneActive = false;

        if (draggedItem?.isFilterable) {
            if (!activeFilters.some((f) => f.key === draggedItem.key)) {
                let defaultValue = "";
                if (draggedItem.key.endsWith(".levelOfStudy")) {
                    defaultValue = "College";
                }

                const newFilter = {
                    id: generateId(),
                    key: draggedItem.key,
                    origin: draggedItem.origin,
                    value: defaultValue,
                    active: true,
                };

                const safeDropIndex =
                    dropIndicatorIndex === null || dropIndicatorIndex < 0
                        ? activeFilters.length
                        : Math.min(dropIndicatorIndex, activeFilters.length);

                activeFilters.splice(safeDropIndex, 0, newFilter);
                activeFilters = [...activeFilters];
            }
        } else if (dragStartFilterIndex !== null) {
            if (
                dropIndicatorIndex === null ||
                dropIndicatorIndex < 0 ||
                dropIndicatorIndex > activeFilters.length
            ) {
                handleDragEnd();
                return;
            }

            const itemToMove = activeFilters.splice(dragStartFilterIndex, 1)[0];
            if (itemToMove) {
                const finalDropIndex =
                    dragStartFilterIndex < dropIndicatorIndex
                        ? dropIndicatorIndex - 1
                        : dropIndicatorIndex;

                activeFilters.splice(finalDropIndex, 0, itemToMove);
                activeFilters = [...activeFilters];
            }
        }

        handleDragEnd();
    }

    function removeFilter(idToRemove) {
        activeFilters = activeFilters.filter((f) => f.id !== idToRemove);
    }

    function openPreviewModal() {
        isPreviewModalOpen = true;
    }
    function closePreviewModal() {
        isPreviewModalOpen = false;
    }
</script>

{#if isSubqueryModalOpen}
    <div
        class="modal-overlay"
        use:portal
        on:click={closeSubqueryModal}
        on:keydown={(event) => {
            if (event.key === "Escape") closeSubqueryModal();
        }}
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby="subquery-modal-header"
        transition:fade={{ duration: 150 }}
    >
        <div
            class="modal-content"
            on:click|stopPropagation
            transition:fly={{ y: -20, duration: 200, easing: quintOut }}
            use:draggable
        >
            <button
                class="modal-close-btn"
                on:click={closeSubqueryModal}
                aria-label="Close modal">&times;</button
            >
            <h3 class="modal-header" id="subquery-modal-header">
                Configure Subquery Export
            </h3>
            <div class="join-options">
                <div class="option-panel" style="background: #fff;">
                    <div class="custom-join-group">
                        <div>
                            <label for="subquery-label"
                                >Export Label (Required)</label
                            >
                            <input
                                type="text"
                                id="subquery-label"
                                placeholder="e.g., school_count"
                                bind:value={subqueryModalConfig.label}
                                maxlength="30"
                            />
                        </div>
                        <div>
                            <label for="subquery-output">Output Type</label>
                            <select
                                id="subquery-output"
                                bind:value={subqueryModalConfig.outputType}
                                disabled
                            >
                                <option value="count">Aggregate Count</option>
                            </select>
                        </div>

                        <hr class="palette-divider" style="margin: 0.5rem 0;" />

                        <div>
                            <label class="form-section-label"
                                >Matching Rows</label
                            >
                            <div class="join-config-area">
                                {#if !subqueryModalConfig.base}
                                    <button
                                        class="btn join-btn-header"
                                        on:click={() =>
                                            (isSubqueryJoinMenuOpen =
                                                !isSubqueryJoinMenuOpen)}
                                        bind:this={subqueryJoinBtnEl}
                                        title="Select the table to aggregate"
                                    >
                                        + Join
                                    </button>
                                {:else}
                                    <div
                                        class="join-tag query-join-tag"
                                        style="background-color: {COLOR_MAP[
                                            subqueryModalConfig.base
                                        ] ?? '#eee'};"
                                        in:fly={{ y: -5, duration: 150 }}
                                    >
                                        Join {subqueryModalConfig.base}
                                        <button
                                            class="remove-tag-btn"
                                            on:click={() =>
                                                (subqueryModalConfig.base =
                                                    null)}
                                            title="Remove join">&times;</button
                                        >
                                    </div>
                                {/if}
                            </div>
                        </div>

                        {#if isSubqueryJoinMenuOpen}
                            <div
                                class="join-menu-popover"
                                use:portal
                                bind:this={subqueryJoinPopoverEl}
                                style={popoverStyle}
                                transition:fade={{ duration: 100 }}
                            >
                                <div class="popover-content">
                                    <div class="popover-header">Join...</div>
                                    {#each subqueryRelatedTables as tableName (tableName)}
                                        <button
                                            class="popover-btn"
                                            on:click={() =>
                                                selectSubqueryBase(tableName)}
                                        >
                                            {tableName}
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                        {#if subqueryModalConfig.base === "School"}
                            <hr
                                class="palette-divider"
                                style="margin: 0.5rem 0;"
                            />
                            <div>
                                <label class="form-section-label">Filters</label
                                >
                                <div class="join-config-area">
                                    <div style="width: 100%;">
                                        <label
                                            for="subquery-filter-level"
                                            style="font-size: 0.85rem;"
                                            >Level of Study</label
                                        >
                                        <select
                                            id="subquery-filter-level"
                                            bind:value={
                                                subqueryModalConfig.filterLevel
                                            }
                                        >
                                            <option value="All">All</option>
                                            <option value="College"
                                                >College</option
                                            >
                                            <option value="High School"
                                                >High School</option
                                            >
                                        </select>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn cancel-btn" on:click={closeSubqueryModal}
                    >Cancel</button
                >
                <button
                    class="btn apply-btn"
                    on:click={applySubqueryExport}
                    disabled={!isSubqueryFormValid}>Add Export</button
                >
            </div>
        </div>
    </div>
{/if}

{#if isQueryBaseModalOpen}
    <div
        class="modal-overlay"
        use:portal
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby="query-base-modal-header"
        transition:fade={{ duration: 150 }}
    >
        <div
            class="modal-content"
            on:click|stopPropagation
            transition:fly={{ y: -20, duration: 200, easing: quintOut }}
        >
            <h3 class="modal-header" id="query-base-modal-header">
                Start a New Query
            </h3>
            <p style="margin-top: 0; margin-bottom: 1.5rem; line-height: 1.6;">
                Select the base table for your query. This will be the starting
                point, and you can join related data from there.
            </p>
            <div class="query-base-options">
                <button
                    class="btn query-base-btn"
                    style="--btn-color: var(--color-persons);"
                    on:click={() => resetQuery("Person")}
                >
                    Person
                </button>
                <button
                    class="btn query-base-btn"
                    style="--btn-color: var(--color-schools);"
                    on:click={() => resetQuery("School")}
                >
                    School
                </button>
                <button
                    class="btn query-base-btn"
                    style="--btn-color: var(--color-addresses);"
                    on:click={() => resetQuery("Address")}
                >
                    Address
                </button>
                <button
                    class="btn query-base-btn"
                    style="--btn-color: var(--color-apps);"
                    on:click={() => resetQuery("Application")}
                >
                    Application
                </button>
            </div>
        </div>
    </div>
{/if}

{#if isJoinModalOpen}
    <div
        class="modal-overlay"
        use:portal
        on:click={closeJoinModal}
        on:keydown={(event) => {
            if (event.key === "Escape") closeJoinModal();
        }}
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby="modal-header"
        transition:fade={{ duration: 150 }}
    >
        <div
            class="modal-content"
            on:click|stopPropagation
            transition:fly={{ y: -20, duration: 200, easing: quintOut }}
            use:draggable
        >
            <button
                class="modal-close-btn"
                on:click={closeJoinModal}
                aria-label="Close modal">&times;</button
            >
            <h3 class="modal-header" id="modal-header">
                Add Join for {modalConfig.tableName}
            </h3>
            <div class="join-options">
                {#if modalConfig.isParentJoin}
                    <div class="option-panel" in:fade={{ duration: 150 }}>
                        <p style="margin: 0; line-height: 1.6;">
                            This will join the single related
                            <strong>{modalConfig.tableName}</strong>
                            record. The join will be automatically labeled "<strong
                                >{modalConfig.tableName.toLowerCase()}</strong
                            >".
                        </p>
                    </div>
                {:else}
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
                                <label for="rank-input"
                                    >Join record at rank:</label
                                >
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
                                            bind:value={
                                                modalConfig.customRankInput
                                            }
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
                                            disabled={!modalConfig.fields ||
                                                modalConfig.fields.length === 0}
                                        >
                                            {#if modalConfig.fields && modalConfig.fields.length > 0}
                                                {#each modalConfig.fields as field}
                                                    <option value={field}
                                                        >{field}</option
                                                    >
                                                {/each}
                                            {:else}
                                                <option
                                                    value=""
                                                    disabled
                                                    selected
                                                    >No sortable fields</option
                                                >
                                            {/if}
                                        </select>
                                        <select
                                            bind:value={
                                                modalConfig.customSort.direction
                                            }
                                            disabled={!modalConfig.fields ||
                                                modalConfig.fields.length === 0}
                                        >
                                            <option value="asc"
                                                >Ascending</option
                                            >
                                            <option value="desc"
                                                >Descending</option
                                            >
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
                {/if}
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

{#if isPreviewModalOpen}
    {@const activeFilterList = activeFilters.filter(
        (f) => f.active && (f.value || f.value === 0),
    )}
    <div
        class="modal-overlay preview-overlay"
        use:portal
        on:click={closePreviewModal}
        on:keydown={(event) => {
            if (event.key === "Escape") closePreviewModal();
        }}
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby="preview-modal-header"
        transition:fade={{ duration: 150 }}
    >
        <div
            class="modal-content preview-modal-content"
            on:click|stopPropagation
            transition:fly={{ y: 20, duration: 200, easing: quintOut }}
            use:draggable
        >
            <button
                class="modal-close-btn"
                on:click={closePreviewModal}
                aria-label="Close modal">&times;</button
            >
            <h3 class="modal-header" id="preview-modal-header">
                Query Preview ({queryBase} Records)
            </h3>

            {#if activeFilterList.length > 0}
                <div class="filter-status-bar">
                    Filtering for:
                    {#each activeFilterList as filter, i}
                        <strong
                            >{filter.key.split(".").pop()} = {filter.value}</strong
                        >{i < activeFilterList.length - 1 ? " AND " : ""}
                    {/each}
                    . Showing
                    {resolvedPreviewData.rows.length}
                    {resolvedPreviewData.rows.length === 1
                        ? "record"
                        : "records"}.
                </div>
            {/if}

            <div class="preview-table-container">
                {#if resolvedPreviewData.headers[0] === "Error"}
                    <p
                        class="no-data-msg error"
                        style="margin-top: 0; padding: 1rem; text-align: left; white-space: pre-wrap;"
                    >
                        <strong>Preview Error:</strong><br
                        />{resolvedPreviewData.rows[0]?.[0] ?? "Unknown error"}
                    </p>
                {:else if resolvedPreviewData.headers.length > 0}
                    <table class="results-table">
                        <thead>
                            <tr>
                                {#each resolvedPreviewData.headers as header (header)}
                                    <th>{header}</th>
                                {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#if resolvedPreviewData.rows.length === 0}
                                <tr>
                                    <td
                                        colspan={resolvedPreviewData.headers
                                            .length}
                                        style="text-align: center; padding: 2rem; color: var(--color-text-light);"
                                    >
                                        {#if activeFilterList.length > 0}
                                            No records found for these filters.
                                        {:else if ALL_DATA[queryBase].length === 0}
                                            No records found.
                                        {:else}
                                            No records found.
                                        {/if}
                                    </td>
                                </tr>
                            {/if}
                            {#each resolvedPreviewData.rows as row, rowIndex (rowIndex)}
                                <tr>
                                    {#each row as cell, cellIndex (cellIndex)}
                                        <td>{cell}</td>
                                    {/each}
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {:else}
                    <p class="no-data-msg" style="margin-top: 0;">
                        No active exports selected. Add fields to the "Exports"
                        section and check the box to preview results.
                    </p>
                {/if}
            </div>

            <div class="modal-actions">
                <button class="btn apply-btn" on:click={closePreviewModal}
                    >Close</button
                >
            </div>
        </div>
    </div>
{/if}

{#if isWarningModalOpen}
    <div
        class="modal-overlay"
        use:portal
        on:click={closeWarningModal}
        on:keydown={(event) => {
            if (event.key === "Escape") closeWarningModal();
        }}
        role="alertdialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby="warning-modal-header"
        transition:fade={{ duration: 150 }}
    >
        <div
            class="modal-content warning-modal-content"
            on:click|stopPropagation
            transition:fly={{ y: -20, duration: 200, easing: quintOut }}
            use:draggable
        >
            <button
                class="modal-close-btn"
                on:click={closeWarningModal}
                aria-label="Close modal">&times;</button
            >
            <h3 class="modal-header warning-header" id="warning-modal-header">
                Cannot Remove Join
            </h3>
            <p class="warning-message">{warningModalMessage}</p>
            <div class="modal-actions">
                <button class="btn apply-btn" on:click={closeWarningModal}
                    >OK</button
                >
            </div>
        </div>
    </div>
{/if}

{#if queryBase}
    <div class="explainer-container">
        <div class="live-preview-container panel">
            <h3 class="panel-header">
                Available Data for Selected {queryBase}
            </h3>
            <div class="preview-grid">
                {#if resolvedBaseRecordPreviewItems[0]?.key === "Error"}
                    <p
                        class="no-data-msg error"
                        style="margin-top: 0; padding: 1rem;"
                    >
                        {resolvedBaseRecordPreviewItems[0].value}
                    </p>
                {:else if resolvedBaseRecordPreviewItems.length === 0}
                    <p class="no-data-msg">
                        {#if selectedBaseRecord}
                            Add joins to see related data fields.
                        {:else}
                            Select a {queryBase} record to preview its data.
                        {/if}
                    </p>
                {:else}
                    {#each resolvedBaseRecordPreviewItems as item (item.key)}
                        <div
                            class="preview-item"
                            style="background-color: {COLOR_MAP[item.origin] ??
                                '#eee'};"
                            in:fly={{ y: 10, duration: 200 }}
                        >
                            <div class="preview-key">{item.key}</div>
                            <div class="preview-value">{item.value}</div>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>

        <div class="record-previewer-container panel">
            <div class="controls-bar">
                <span class="control-label"
                    >Select a {queryBase} to Preview</span
                >
                <div class="segmented-control">
                    {#if ALL_DATA[queryBase] && ALL_DATA[queryBase].length > 0}
                        {@const previewItems = ALL_DATA[queryBase].slice(0, 5)}
                        {#each previewItems as record (record.id)}
                            <button
                                class:active={selectedBaseId === record.id}
                                on:click={() => (selectedBaseId = record.id)}
                            >
                                {#if queryBase === "Person"}
                                    {record.name || `ID: ${record.id}`}
                                {:else}
                                    {`ID: ${record.id}`}
                                {/if}
                            </button>
                        {/each}
                    {:else}
                        <button disabled>No {queryBase} data</button>
                    {/if}
                </div>
            </div>

            <div class="joins-visual-container" bind:this={containerEl}>
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
                <div class="data-view-grid">
                    {#if selectedBaseRecord}
                        <div
                            class="results-panel panel base-record"
                            style="--list-color: {COLOR_MAP[queryBase] ??
                                'var(--color-background-alt)'};"
                        >
                            <h3 class="panel-header">
                                {queryBase} Record (ID: {selectedBaseRecord.id})
                            </h3>
                            <div class="person-card" bind:this={baseCardEl}>
                                {#if queryBase === "Person"}
                                    <strong>Name:</strong>
                                    {selectedBaseRecord.name}<br />
                                    <strong>Email:</strong>
                                    {selectedBaseRecord.email}<br />
                                    <strong>DOB:</strong>
                                    {selectedBaseRecord.dob}
                                {:else if queryBase === "School"}
                                    <strong>Name:</strong>
                                    {selectedBaseRecord.name}<br />
                                    <strong>Level:</strong>
                                    {selectedBaseRecord.levelOfStudy}<br />
                                    <strong>Code:</strong>
                                    {selectedBaseRecord.code}<br />
                                    <strong>Person ID:</strong>
                                    {selectedBaseRecord.personId}
                                {:else if queryBase === "Address"}
                                    <strong>Type:</strong>
                                    {selectedBaseRecord.type}<br />
                                    <strong>Location:</strong>
                                    {selectedBaseRecord.city}, {selectedBaseRecord.state}
                                    {selectedBaseRecord.zip}<br />
                                    <strong>Street:</strong>
                                    {selectedBaseRecord.street}<br />
                                    <strong>Person ID:</strong>
                                    {selectedBaseRecord.personId}
                                {:else if queryBase === "Application"}
                                    <strong>Major:</strong>
                                    {selectedBaseRecord.major}<br />
                                    <strong>Term:</strong>
                                    {selectedBaseRecord.term}<br />
                                    <strong>Submitted:</strong>
                                    {selectedBaseRecord.submittedDate}<br />
                                    <strong>Person ID:</strong>
                                    {selectedBaseRecord.personId}
                                {/if}
                            </div>
                        </div>
                    {:else}
                        <div
                            class="results-panel panel base-record placeholder-card"
                        >
                            <h3 class="panel-header">{queryBase} Record</h3>
                            <p class="no-data-msg" style="margin-top: 1rem;">
                                No record selected or available.
                            </p>
                        </div>
                    {/if}

                    <div class="related-data">
                        {#if RELATED_TABLES[queryBase]}
                            {#each RELATED_TABLES[queryBase] as relation (relation.name)}
                                {@const tableData =
                                    dynamicRelatedData[relation.name] || []}
                                {@const subqueriesForThisTable =
                                    activeExports.filter(
                                        (ex) =>
                                            ex.type === "subquery" &&
                                            ex.subqueryBase === relation.name,
                                    )}

                                {#if relation && relation.name}
                                    <div class="related-data-row">
                                        <div
                                            class="results-panel panel"
                                            style="--list-color: {COLOR_MAP[
                                                relation.name
                                            ] ??
                                                'var(--color-background-alt)'};"
                                        >
                                            <div class="panel-header-flex">
                                                <h3 class="panel-header">
                                                    {pluralize(relation.name)}
                                                </h3>
                                                <div
                                                    class="join-tags-container"
                                                >
                                                    {#each resolvedJoins[relation.name] || [] as join (join.id)}
                                                        {#if join}
                                                            <div
                                                                class="join-tag"
                                                                class:dangling={join.resolvedIndex ===
                                                                    null}
                                                                in:fly={{
                                                                    y: -5,
                                                                    duration: 150,
                                                                }}
                                                            >
                                                                {join.key}
                                                                <button
                                                                    class="remove-tag-btn"
                                                                    on:click={() =>
                                                                        removeJoin(
                                                                            relation.name,
                                                                            join.id,
                                                                        )}
                                                                    >&times;</button
                                                                >
                                                            </div>
                                                        {/if}
                                                    {/each}
                                                </div>
                                                <button
                                                    class="btn join-btn-header"
                                                    on:click={() =>
                                                        openJoinModal(
                                                            relation.name,
                                                            dynamicRelatedData[
                                                                relation.name
                                                            ] || [],
                                                        )}
                                                    disabled={relation.type ===
                                                        "many-to-one" &&
                                                        (
                                                            resolvedJoins[
                                                                relation.name
                                                            ] || []
                                                        ).length > 0}
                                                    title={relation.type ===
                                                        "many-to-one" &&
                                                    (
                                                        resolvedJoins[
                                                            relation.name
                                                        ] || []
                                                    ).length > 0
                                                        ? `Only one ${relation.name} join is allowed`
                                                        : `Add ${relation.name} join...`}
                                                    >Add Join...</button
                                                >
                                            </div>

                                            <table class="results-table">
                                                <thead>
                                                    <tr>
                                                        <th style="width: 1%;"
                                                            >Rank</th
                                                        >
                                                        {#if relation.name === "Person"}
                                                            <th>Name</th>
                                                            <th>Email</th>
                                                        {:else if relation.name === "School"}
                                                            <th>Name</th>
                                                            <th>Level</th>
                                                        {:else if relation.name === "Address"}
                                                            <th>Type</th>
                                                            <th>City</th>
                                                            <th>State</th>
                                                        {:else if relation.name === "Application"}
                                                            <th>Major</th>
                                                            <th>Term</th>
                                                            <th>Submitted</th>
                                                        {:else}
                                                            <th>Data</th>
                                                        {/if}

                                                        {#if subqueriesForThisTable.length > 0}
                                                            <th
                                                                class="subquery-header"
                                                                title="Subquery Matches"
                                                            >
                                                                SQ
                                                            </th>
                                                        {/if}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {#if tableData.length === 0}
                                                        <tr>
                                                            <td
                                                                colspan="5"
                                                                class="no-data-msg"
                                                                style="padding: 1rem;"
                                                                >No related {relation.name}
                                                                records found.</td
                                                            >
                                                        </tr>
                                                    {:else}
                                                        {#each tableData as item, i (item.id)}
                                                            {@const matchingSubqueryIds =
                                                                rowSubqueryMatches.get(
                                                                    item.id,
                                                                ) || new Set()}
                                                            {@const matchingSubqueries =
                                                                subqueriesForThisTable.filter(
                                                                    (sq) =>
                                                                        matchingSubqueryIds.has(
                                                                            sq.id,
                                                                        ),
                                                                )}
                                                            <tr
                                                                class:highlighted={(
                                                                    resolvedJoins[
                                                                        relation
                                                                            .name
                                                                    ] || []
                                                                ).some(
                                                                    (j) =>
                                                                        j?.resolvedIndex ===
                                                                        i,
                                                                )}
                                                                bind:this={
                                                                    relatedRowRefs[
                                                                        relation
                                                                            .name
                                                                    ][i]
                                                                }
                                                                class:fade-out={(hoveredSubqueryId !==
                                                                    null &&
                                                                    !matchingSubqueryIds.has(
                                                                        hoveredSubqueryId,
                                                                    )) ||
                                                                    (hoveredRowItemId !==
                                                                        null &&
                                                                        hoveredRowItemId !==
                                                                            item.id)}
                                                                on:mouseenter={() =>
                                                                    (hoveredRowItemId =
                                                                        item.id)}
                                                                on:mouseleave={() =>
                                                                    (hoveredRowItemId =
                                                                        null)}
                                                            >
                                                                <td
                                                                    class="rank-cell"
                                                                    >{i + 1}</td
                                                                >
                                                                {#if relation.name === "Person"}
                                                                    <td
                                                                        >{item.name}</td
                                                                    >
                                                                    <td
                                                                        >{item.email}</td
                                                                    >
                                                                {:else if relation.name === "School"}
                                                                    <td
                                                                        >{item.name}</td
                                                                    >
                                                                    <td
                                                                        >{item.levelOfStudy}</td
                                                                    >
                                                                {:else if relation.name === "Address"}
                                                                    <td
                                                                        >{item.type}</td
                                                                    >
                                                                    <td
                                                                        >{item.city}</td
                                                                    >
                                                                    <td
                                                                        >{item.state}</td
                                                                    >
                                                                {:else if relation.name === "Application"}
                                                                    <td
                                                                        >{item.major}</td
                                                                    >
                                                                    <td
                                                                        >{item.term}</td
                                                                    >
                                                                    <td
                                                                        >{item.submittedDate}</td
                                                                    >
                                                                {:else}
                                                                    <td
                                                                        >{JSON.stringify(
                                                                            item,
                                                                        )}</td
                                                                    >
                                                                {/if}

                                                                {#if subqueriesForThisTable.length > 0}
                                                                    <td
                                                                        class="subquery-match-cell"
                                                                    >
                                                                        {#each matchingSubqueries as sq (sq.id)}
                                                                            <span
                                                                                class="subquery-color-dot"
                                                                                style="--subquery-color: {sq.color ??
                                                                                    '#9ca3af'}"
                                                                                title={sq.key}
                                                                            />
                                                                        {/each}
                                                                    </td>
                                                                {/if}
                                                            </tr>
                                                        {/each}
                                                    {/if}
                                                </tbody>
                                            </table>
                                        </div>

                                        {#if subqueriesForThisTable.length > 0}
                                            <div class="subquery-count-list">
                                                {#each subqueriesForThisTable as sq, i (sq.id)}
                                                    <div
                                                        class="subquery-count-item"
                                                        in:fly={{
                                                            x: 10,
                                                            duration: 150,
                                                        }}
                                                        on:mouseenter={() =>
                                                            (hoveredSubqueryId =
                                                                sq.id)}
                                                        on:mouseleave={() =>
                                                            (hoveredSubqueryId =
                                                                null)}
                                                        class:fade-out={(hoveredSubqueryId !==
                                                            null &&
                                                            hoveredSubqueryId !==
                                                                sq.id) ||
                                                            (hoveredRowItemId !==
                                                                null &&
                                                                !rowSubqueryMatches
                                                                    .get(
                                                                        hoveredRowItemId,
                                                                    )
                                                                    ?.has(
                                                                        sq.id,
                                                                    ))}
                                                    >
                                                        <span
                                                            class="subquery-color-dot"
                                                            style="--subquery-color: {sq.color ??
                                                                '#9ca3af'}"
                                                        />
                                                        <svg
                                                            class="subquery-export-icon"
                                                            viewBox="0 0 30 20"
                                                            aria-hidden="true"
                                                        >
                                                            <rect
                                                                x="2"
                                                                y="7"
                                                                width="6"
                                                                height="6"
                                                                rx="1"
                                                                fill="#f43f5e"
                                                            />
                                                            <rect
                                                                x="22"
                                                                y="2"
                                                                width="6"
                                                                height="6"
                                                                rx="1"
                                                                fill="#3b82f6"
                                                            />
                                                            <rect
                                                                x="22"
                                                                y="12"
                                                                width="6"
                                                                height="6"
                                                                rx="1"
                                                                fill="#3b82f6"
                                                            />
                                                            <path
                                                                d="M 8 10 L 22 5"
                                                                stroke="#a5b4fc"
                                                                stroke-width="1.5"
                                                                fill="none"
                                                            />
                                                            <path
                                                                d="M 8 10 L 22 15"
                                                                stroke="#a5b4fc"
                                                                stroke-width="1.5"
                                                                fill="none"
                                                            />
                                                        </svg>
                                                        <span
                                                            class="subquery-count-value"
                                                        >
                                                            {getFilteredSubqueryData(
                                                                dynamicRelatedData[
                                                                    sq
                                                                        .subqueryBase
                                                                ],
                                                                sq.filters,
                                                            )?.length ?? 0}
                                                        </span>
                                                        <span
                                                            class="subquery-count-label"
                                                            >{sq.key}</span
                                                        >
                                                    </div>
                                                {/each}
                                            </div>
                                        {/if}
                                    </div>
                                {/if}
                            {/each}
                        {/if}
                    </div>
                </div>
            </div>
        </div>

        <div class="slate-layout">
            <div class="main-content">
                <div
                    class="query-part-panel panel exports-panel"
                    role="region"
                    aria-label="Exports drop zone"
                >
                    <h3 class="panel-header">Exports</h3>
                    <div
                        class="export-dropzone"
                        on:dragover={handleZoneDragOver}
                        on:dragleave={handleZoneDragLeave}
                        on:drop={handleExportDrop}
                    >
                        {#if activeExports.length === 0 && (dropIndicatorIndex === null || isFilterZoneActive)}
                            <p class="export-placeholder">
                                Drag fields from "Available Data" to add columns
                            </p>
                        {/if}
                        {#each activeExports as exportItem, index (exportItem.id)}
                            {#if dropIndicatorIndex === index && !isFilterZoneActive && (draggedItem || dragStartExportIndex !== null)}
                                <div class="drop-indicator" />
                            {/if}
                            <div
                                class="export-item"
                                style="background-color: {COLOR_MAP[
                                    exportItem.origin
                                ] ?? '#eee'};"
                                draggable="true"
                                on:dragstart={() =>
                                    handleExportDragStart(index)}
                                on:dragend={handleDragEnd}
                                on:dragover|preventDefault|stopPropagation={(
                                    e,
                                ) => handleItemDragOver(e, index)}
                                role="button"
                                tabindex="0"
                            >
                                {#if exportItem.type === "subquery"}
                                    <svg
                                        class="subquery-export-icon"
                                        viewBox="0 0 30 20"
                                        aria-hidden="true"
                                    >
                                        <rect
                                            x="2"
                                            y="7"
                                            width="6"
                                            height="6"
                                            rx="1"
                                            fill="#f43f5e"
                                        />
                                        <rect
                                            x="22"
                                            y="2"
                                            width="6"
                                            height="6"
                                            rx="1"
                                            fill="#3b82f6"
                                        />
                                        <rect
                                            x="22"
                                            y="12"
                                            width="6"
                                            height="6"
                                            rx="1"
                                            fill="#3b82f6"
                                        />
                                        <path
                                            d="M 8 10 L 22 5"
                                            stroke="#a5b4fc"
                                            stroke-width="1.5"
                                            fill="none"
                                        />
                                        <path
                                            d="M 8 10 L 22 15"
                                            stroke="#a5b4fc"
                                            stroke-width="1.5"
                                            fill="none"
                                        />
                                    </svg>
                                {/if}
                                <span class="export-key">{exportItem.key}</span>
                                <div class="export-controls">
                                    <input
                                        type="checkbox"
                                        bind:checked={exportItem.active}
                                        title="Include in results"
                                        on:change={() =>
                                            (activeExports = [
                                                ...activeExports,
                                            ])}
                                        on:mousedown|stopPropagation
                                    />
                                    <button
                                        class="remove-tag-btn"
                                        on:click={() =>
                                            removeExport(exportItem.id)}
                                        >&times;</button
                                    >
                                </div>
                            </div>
                        {/each}
                        {#if dropIndicatorIndex === activeExports.length && !isFilterZoneActive && (draggedItem || dragStartExportIndex !== null)}
                            <div class="drop-indicator" />
                        {/if}
                    </div>
                </div>

                <div class="query-part-panel panel">
                    <h3
                        class="panel-header"
                        style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem;"
                    >
                        <span>Filters</span>
                        <span class="row-count-badge">
                            (Matching Rows: {resolvedPreviewData.rows.length})
                        </span>
                    </h3>
                    <div
                        class="filter-dropzone"
                        class:drop-active={isFilterZoneActive}
                        on:dragover={handleFilterZoneDragOver}
                        on:dragleave={handleFilterZoneDragLeave}
                        on:drop={handleFilterDrop}
                    >
                        {#if activeFilters.length === 0 && (dropIndicatorIndex === null || !isFilterZoneActive)}
                            <p class="filter-placeholder">
                                Drag filterable fields here (e.g., person.id or
                                school.levelOfStudy)
                            </p>
                        {/if}

                        {#each activeFilters as filterItem, index (filterItem.id)}
                            {#if dropIndicatorIndex === index && isFilterZoneActive}
                                <div class="drop-indicator" />
                            {/if}
                            <div
                                class="filter-item"
                                style="background-color: {COLOR_MAP[
                                    filterItem.origin
                                ] ?? '#eee'};"
                                draggable="true"
                                on:dragstart={() =>
                                    handleFilterDragStart(index)}
                                on:dragend={handleDragEnd}
                                on:dragover|preventDefault|stopPropagation={(
                                    e,
                                ) => handleFilterItemDragOver(e, index)}
                            >
                                <span class="filter-key">{filterItem.key}</span>

                                {#if filterItem.key.endsWith(".levelOfStudy")}
                                    <select
                                        class="filter-input"
                                        bind:value={filterItem.value}
                                        on:mousedown|stopPropagation
                                    >
                                        <option value="College">College</option>
                                        <option value="High School"
                                            >High School</option
                                        >
                                    </select>
                                {:else if filterItem.key.endsWith(".id") || filterItem.key === "personId"}
                                    <input
                                        type="text"
                                        class="filter-input"
                                        placeholder="Enter ID"
                                        maxlength="20"
                                        bind:value={filterItem.value}
                                        on:mousedown|stopPropagation
                                    />
                                {:else}
                                    <input
                                        type="text"
                                        class="filter-input"
                                        placeholder="Enter value"
                                        maxlength="20"
                                        bind:value={filterItem.value}
                                        on:mousedown|stopPropagation
                                    />
                                {/if}

                                <div class="filter-item-controls">
                                    <input
                                        type="checkbox"
                                        bind:checked={filterItem.active}
                                        title="Toggle filter"
                                        on:change={() =>
                                            (activeFilters = [
                                                ...activeFilters,
                                            ])}
                                        on:mousedown|stopPropagation
                                    />
                                    <button
                                        class="remove-tag-btn"
                                        on:click={() =>
                                            removeFilter(filterItem.id)}
                                        title="Remove filter">&times;</button
                                    >
                                </div>
                            </div>
                        {/each}

                        {#if dropIndicatorIndex === activeFilters.length && isFilterZoneActive}
                            <div class="drop-indicator" />
                        {/if}
                    </div>
                </div>

                <div class="query-part-panel panel">
                    <h3 class="panel-header">Joins</h3>
                    <div class="join-tags-container" style="padding-top: 1rem;">
                        {#each allJoins as join (join.id)}
                            {#if join}
                                <div
                                    class="join-tag query-join-tag"
                                    style="background-color: {COLOR_MAP[
                                        join.tableName
                                    ] ?? '#eee'};"
                                    in:fly={{ y: -5, duration: 150 }}
                                >
                                    {join.tableName}.{join.key}
                                    <button
                                        class="remove-tag-btn"
                                        on:click={() =>
                                            removeJoin(join.tableName, join.id)}
                                        >&times;</button
                                    >
                                </div>
                            {/if}
                        {/each}
                        {#if allJoins.length === 0}
                            <p
                                class="export-placeholder"
                                style="margin: 0; padding: 0.25rem 0;"
                            >
                                Add joins in the previewer above to populate
                                this list.
                            </p>
                        {/if}
                    </div>
                </div>
            </div>

            <div class="sidebar">
                <div class="controls-panel panel">
                    <button
                        class="btn apply-btn"
                        on:click={() => (isQueryBaseModalOpen = true)}
                        >New Query</button
                    >
                    <button
                        class="btn"
                        style="background: #f1f5f9; color: #475569;"
                        on:click={openPreviewModal}
                        disabled={!queryBase}>Preview Results</button
                    >
                </div>

                <div class="data-palette-container panel">
                    <h3 class="panel-header">Available Data</h3>

                    {#if queryBase === "Person"}
                        <div class="subquery-palette-header">
                            Subquery Exports
                        </div>
                        <div class="subquery-palette-item-container">
                            <div
                                class="palette-item subquery-item"
                                style="background-color: {COLOR_MAP[
                                    'Subquery'
                                ]};"
                                draggable="true"
                                on:dragstart={() =>
                                    handlePaletteDragStart({
                                        key: "subquery",
                                        origin: "Subquery",
                                        isSubquery: true,
                                    })}
                                on:dragend={handleDragEnd}
                                role="button"
                                tabindex="0"
                                title="Drag to 'Exports' to add a related count (e.g., number of schools)"
                            >
                                <div class="palette-key">
                                    <svg
                                        class="subquery-export-icon"
                                        viewBox="0 0 30 20"
                                        aria-hidden="true"
                                    >
                                        <rect
                                            x="2"
                                            y="7"
                                            width="6"
                                            height="6"
                                            rx="1"
                                            fill="#f43f5e"
                                        />
                                        <rect
                                            x="22"
                                            y="2"
                                            width="6"
                                            height="6"
                                            rx="1"
                                            fill="#3b82f6"
                                        />
                                        <rect
                                            x="22"
                                            y="12"
                                            width="6"
                                            height="6"
                                            rx="1"
                                            fill="#3b82f6"
                                        />
                                        <path
                                            d="M 8 10 L 22 5"
                                            stroke="#a5b4fc"
                                            stroke-width="1.5"
                                            fill="none"
                                        />
                                        <path
                                            d="M 8 10 L 22 15"
                                            stroke="#a5b4fc"
                                            stroke-width="1.5"
                                            fill="none"
                                        />
                                    </svg>
                                    Aggregate Count
                                </div>
                            </div>
                        </div>
                        <hr class="palette-divider" />
                    {/if}

                    <div class="palette-grid">
                        {#if availableDataPalette[0]?.key === "Error generating palette"}
                            <p
                                class="no-data-msg error"
                                style="margin-top: 0; padding: 1rem;"
                            >
                                Error generating palette.
                            </p>
                        {:else if availableDataPalette.length === 0}
                            <p class="no-data-msg">
                                Select a base query or add joins to see
                                available data.
                            </p>
                        {:else}
                            {#each availableDataPalette as item (item.key)}
                                <div
                                    class="palette-item"
                                    style="background-color: {COLOR_MAP[
                                        item.origin
                                    ] ?? '#eee'};"
                                    draggable="true"
                                    on:dragstart={() =>
                                        handlePaletteDragStart(item)}
                                    on:dragend={handleDragEnd}
                                    role="button"
                                    tabindex="0"
                                >
                                    <div class="palette-key">
                                        {item.key}
                                        {#if item.isFilterable}
                                            <svg
                                                class="filter-svg-icon"
                                                title="Drag to 'Filters'"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    fill-rule="evenodd"
                                                    d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V17a1 1 0 01-1.447.894L8 15.382V10.414L3.293 6.707A1 1 0 013 6V3z"
                                                    clip-rule="evenodd"
                                                />
                                            </svg>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </div>
{:else}
    <div class="explainer-container">
        <div
            class="controls-panel panel"
            style="width: 360px; margin: 2rem auto;"
        >
            <p
                style="text-align: center; margin: 0.5rem 0 1rem 0; color: var(--color-text-light);"
            >
                No query selected.
            </p>
            <button
                class="btn apply-btn"
                on:click={() => (isQueryBaseModalOpen = true)}
                >Start New Query...</button
            >
        </div>
    </div>
{/if}

<style>
    /* === NEW STYLES FOR POPOVER === */
    .join-menu-popover {
        /* Position is set by JS */
    }
    .popover-content {
        display: flex;
        flex-direction: column;
        background-color: white;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }
    .popover-header {
        padding: 0.5rem 1rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-text-light);
        background-color: #f8fafc;
        border-bottom: 1px solid #e5e7eb;
    }
    .popover-btn {
        background: none;
        border: none;
        padding: 0.75rem 1rem;
        text-align: left;
        cursor: pointer;
        font-size: 0.9rem;
        color: var(--color-text-dark);
        transition: background-color 0.1s ease;
    }
    .popover-btn:hover {
        background-color: #f1f5f9;
    }
    .form-section-label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        font-size: 0.95rem;
        color: var(--color-text-dark);
    }
    .join-config-area {
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 0.75rem;
        background: #f8fafc;
        min-height: 40px;
    }
    .join-config-area .join-btn-header {
        font-size: 0.9rem;
        padding: 0.5rem 1rem;
    }
    .join-config-area .query-join-tag {
        font-size: 0.9rem;
        padding: 0.5rem 0.5rem 0.5rem 1rem;
    }
    /* === END NEW STYLES === */

    .related-data-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        position: relative;
    }
    .related-data-row .results-panel {
        flex-grow: 1;
        min-width: 0;
    }
    .subquery-count-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        flex-shrink: 0;
    }
    .subquery-count-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        padding: 0.4rem 0.75rem;
        white-space: nowrap;
        transition: opacity 0.2s ease-in-out;
        cursor: default;
    }

    .subquery-color-dot {
        display: inline-block;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background-color: var(--subquery-color, #9ca3af);
        border: 1px solid rgba(0, 0, 0, 0.2);
        flex-shrink: 0;
    }

    .results-table th.subquery-header {
        width: 1%;
        padding: 0.75rem 0.5rem;
        text-align: center;
        font-size: 0.8rem;
        color: var(--color-text-light);
    }

    .results-table td.subquery-match-cell {
        width: 1%;
        padding: 0.5rem;
        vertical-align: middle;
    }

    .subquery-match-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        min-height: 40px;
    }

    .subquery-match-cell .subquery-color-dot {
        width: 12px;
        height: 12px;
    }

    .fade-out {
        opacity: 0.2;
    }

    .subquery-count-item .subquery-export-icon {
        width: 21px;
        height: 14px;
        opacity: 0.7;
    }
    .subquery-count-value {
        font-size: 1rem;
        font-weight: 700;
        color: var(--color-primary);
        line-height: 1;
    }
    .subquery-count-label {
        font-family: var(--font-mono);
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-text-light);
    }
    .subquery-palette-header {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-text-light);
        margin: 0.5rem 0 0.5rem 0.25rem;
    }
    .subquery-palette-item-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 2px;
    }
    .palette-item.subquery-item {
        border-style: dashed;
        border-width: 1.5px;
        border-color: #9ca3af;
        color: #374151;
        background-color: #f3f4f6;
    }
    .palette-item.subquery-item .palette-key {
        color: #4b5563;
        font-size: 0.8rem;
    }
    .palette-item.subquery-item:hover {
        background-color: #e5e7eb;
    }
    .palette-divider {
        border: none;
        height: 1px;
        background-color: var(--color-accent-light);
        margin: 1rem 0 0.5rem 0;
    }
    .subquery-export-icon {
        width: 24px;
        height: 16px;
        flex-shrink: 0;
        margin-right: 0.25rem;
        opacity: 0.8;
    }
    .palette-item .subquery-export-icon {
        width: 21px;
        height: 14px;
        opacity: 1;
        color: var(--color-text-dark);
    }

    .row-count-badge {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--color-text-light);
        white-space: nowrap;
    }

    .explainer-container {
        max-width: 1400px;
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
        color: var(--color-text-dark);
    }
    .results-panel {
        padding: 1.5rem;
        background-color: var(--list-color, var(--color-background-alt));
        border: none;
        border-radius: 8px;
    }
    .placeholder-card {
        border: 2px dashed var(--color-accent-light);
        background-color: transparent;
        box-shadow: none;
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
        color: var(--color-text);
    }
    .results-table thead th {
        font-weight: 600;
        background-color: var(--color-background-alt);
    }
    .preview-table-container .results-table thead th {
        background-color: var(--color-background-alt);
        position: sticky;
        top: 0;
        z-index: 1;
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
    .no-data-msg.error {
        color: #991b1b;
        font-weight: 500;
        background-color: #fee2e2;
        border: 1px solid #fecaca;
        border-radius: 4px;
    }

    .record-previewer-container {
        padding: 1.5rem;
        margin-bottom: 2.5rem;
    }
    .slate-layout {
        display: grid;
        grid-template-columns: 1fr 360px;
        gap: 2rem;
        align-items: start;
    }
    .main-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    .sidebar {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        position: sticky;
        top: 2rem;
    }
    .query-part-panel {
        padding: 1.5rem;
    }
    .joins-visual-container {
        position: relative;
        margin-top: 1.5rem;
    }

    .export-dropzone {
        border: 2px dashed var(--color-accent-light);
        border-radius: 6px;
        padding: 1rem;
        margin-top: 1rem;
        min-height: 80px;
        background: #ffffff;
        transition:
            border-color 0.2s ease,
            background-color 0.2s ease;
    }

    .export-placeholder {
        text-align: center;
        color: var(--color-text-light);
        font-size: 0.9rem;
        margin: 1rem 0;
    }
    .drop-indicator {
        height: 2px;
        background: var(--color-primary);
        opacity: 0.6;
        margin: 4px 0;
        border-radius: 1px;
    }
    .export-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
        margin-bottom: 0.5rem;
        border: 1px solid rgba(0, 0, 0, 0.1);
        cursor: grab;
        color: var(--color-text-dark);
        transition: opacity 0.2s ease;
    }
    .export-item:active {
        cursor: grabbing;
        opacity: 0.5;
    }
    .export-key {
        font-family: var(--font-mono);
        font-size: 0.9rem;
        font-weight: 600;
        flex-grow: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding-right: 0.5rem;
    }
    .export-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-shrink: 0;
    }
    .export-controls input[type="checkbox"] {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        opacity: 0.7;
        cursor: pointer;
        accent-color: grey;
    }
    .export-item .remove-tag-btn {
        background: rgba(0, 0, 0, 0.1);
        color: var(--color-text-dark);
        margin-left: 0;
    }
    .export-item .remove-tag-btn:hover {
        background: rgba(0, 0, 0, 0.2);
    }

    .filter-dropzone {
        border: 2px dashed var(--color-accent-light);
        border-radius: 6px;
        padding: 1rem;
        margin-top: 1rem;
        min-height: 80px;
        background: #ffffff;
        transition:
            border-color 0.2s ease,
            background-color 0.2s ease;
    }

    .filter-placeholder {
        text-align: center;
        color: var(--color-text-light);
        font-size: 0.9rem;
        margin: 1rem 0;
        padding: 0;
    }

    .filter-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
        margin-bottom: 0.5rem;
        border: 1px solid rgba(0, 0, 0, 0.1);
        cursor: grab;
        color: var(--color-text-dark);
        transition: opacity 0.2s ease;
    }
    .filter-item:active {
        cursor: grabbing;
        opacity: 0.5;
    }

    .filter-key {
        font-family: var(--font-mono);
        font-size: 0.9rem;
        font-weight: 600;
        white-space: nowrap;
        padding-right: 0.5rem;
        flex-shrink: 0;
    }

    .filter-item-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-shrink: 0;
        margin-left: auto;
    }

    .filter-input {
        width: 120px;
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        border: 1px solid #9ca3af;
        font-size: 0.9rem;
        background-color: #fff;
        min-width: 80px;
    }
    .filter-input[type="number"]::-webkit-inner-spin-button,
    .filter-input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    .filter-input[type="number"] {
        -moz-appearance: textfield;
    }

    .filter-item-controls input[type="checkbox"] {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        opacity: 0.7;
        cursor: pointer;
        accent-color: grey;
    }

    .filter-item .remove-tag-btn {
        background: rgba(0, 0, 0, 0.1);
        color: var(--color-text-dark);
        margin-left: 0;
        flex-shrink: 0;
    }
    .filter-item .remove-tag-btn:hover {
        background: rgba(0, 0, 0, 0.2);
    }

    .filter-status-bar {
        font-size: 0.9rem;
        padding: 0.75rem 1rem;
        background-color: var(--color-schools);
        border: 1px solid #fde047;
        color: #713f12;
        border-radius: 6px;
        margin-bottom: 1.5rem;
        line-height: 1.6;
    }
    .filter-status-bar.error {
        background-color: #fee2e2;
        border-color: #fecaca;
        color: #991b1b;
    }

    .controls-panel {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .controls-panel .btn {
        width: 100%;
        text-align: center;
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
        background-color: #f3f4f6;
        color: #374151;
        border: 1px solid #e5e7eb;
    }
    .controls-panel .btn:hover:not(:disabled) {
        background-color: #e5e7eb;
    }
    .controls-panel .btn.apply-btn {
        background-color: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
    }
    .controls-panel .btn.apply-btn:hover:not(:disabled) {
        opacity: 0.9;
    }
    .controls-panel .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        padding: 1rem;
        box-sizing: border-box;
    }
    .modal-content {
        background-color: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        width: 100%;
        max-width: 450px;
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
        position: relative;
    }
    .modal-close-btn {
        position: absolute;
        top: 0.75rem;
        right: 1rem;
        background: transparent;
        border: none;
        font-size: 2rem;
        line-height: 1;
        color: var(--color-text-light);
        cursor: pointer;
        padding: 0;
        z-index: 10;
        transition: color 0.2s ease;
    }
    .modal-close-btn:hover {
        color: var(--color-text-dark);
    }
    .preview-modal-content {
        max-width: 900px;
        z-index: 1001;
        max-height: calc(100vh - 4rem);
    }
    .warning-modal-content {
        max-width: 450px;
    }
    .warning-header {
        color: #b91c1c;
    }
    .warning-message {
        white-space: pre-wrap;
        line-height: 1.6;
        margin-bottom: 1.5rem;
        color: var(--color-text);
    }
    .modal-header {
        margin-top: 0;
        margin-bottom: 1.5rem;
        font-size: 1.4rem;
        padding-right: 2.5rem;
        color: var(--color-text-dark);
    }
    .query-base-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }
    .query-base-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        font-size: 1rem;
        font-weight: 500;
        padding: 1rem;
        background-color: var(--btn-color);
        color: var(--color-text-dark);
        border: 1px solid color-mix(in srgb, var(--btn-color) 70%, black);
        border-radius: 6px;
        transition:
            transform 0.1s ease,
            box-shadow 0.1s ease;
    }
    .query-base-btn:hover {
        opacity: 1;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
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
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 1rem;
    }
    .option-panel label {
        display: block;
        margin: 0 0 0.5rem 0;
        font-weight: 500;
        font-size: 0.9rem;
        color: var(--color-text);
    }
    .option-panel input,
    .option-panel select {
        width: 100%;
        padding: 0.6rem;
        border-radius: 4px;
        border: 1px solid #cbd5e1;
        font-size: 1rem;
        box-sizing: border-box;
        background-color: #fff;
        color: var(--color-text-dark);
    }
    .option-panel select:disabled {
        background-color: #f3f4f6;
        opacity: 0.7;
        cursor: not-allowed;
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
        margin-top: 1rem;
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
        color: #4b5563;
        border: 1px solid #d1d5db;
    }
    .cancel-btn:hover {
        background-color: #f3f4f6;
    }
    .apply-btn {
        background-color: var(--color-primary);
        color: white;
    }
    .apply-btn:hover:not(:disabled) {
        opacity: 0.9;
    }
    .preview-table-container {
        max-height: 60vh;
        overflow-y: auto;
        border: 1px solid var(--color-accent-light);
        border-radius: 6px;
        margin-bottom: 1.5rem;
        background-color: #fff;
    }
    .preview-table-container .results-table {
        margin-top: 0;
    }

    .connector-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
        overflow: visible;
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

    .controls-bar {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0 0 1rem 0;
        flex-wrap: wrap;
    }
    .control-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--color-text-light);
        white-space: nowrap;
    }
    .segmented-control {
        display: inline-flex;
        background-color: #e5e7eb;
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
        transition:
            background-color 0.2s ease,
            color 0.2s ease;
    }
    .segmented-control button:disabled {
        color: var(--color-text-light);
        cursor: not-allowed;
    }
    .segmented-control button.active {
        background-color: white;
        color: var(--color-primary);
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .live-preview-container {
        padding: 1.5rem;
        border: 2px solid var(--color-secondary);
        margin-bottom: 2.5rem;
    }
    .preview-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 1rem;
        min-height: 50px;
        padding-bottom: 0.5rem;
    }
    .preview-item {
        border-radius: 4px;
        padding: 0.4rem 0.7rem;
        font-size: 0.85rem;
        color: var(--color-text-dark);
        border: 1px solid rgba(0, 0, 0, 0.1);
        line-height: 1.3;
        background-color: #fff;
    }
    .preview-key {
        font-weight: 600;
        color: var(--color-primary);
        font-size: 0.75rem;
        margin-bottom: 0.1rem;
        font-family: var(--font-mono);
    }
    .preview-value {
        word-break: break-all;
    }

    .data-palette-container {
        padding: 1.5rem;
        border: 1px solid var(--color-accent-light);
    }
    .palette-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 1rem;
        max-height: 400px;
        overflow-y: auto;
        padding: 2px;
    }
    .palette-item {
        border-radius: 4px;
        padding: 0.4rem 0.7rem;
        font-size: 0.85rem;
        color: var(--color-text-dark);
        border: 1px solid rgba(0, 0, 0, 0.1);
        cursor: grab;
        transition: box-shadow 0.1s ease;
        background-color: #fff;
    }
    .palette-item:active {
        cursor: grabbing;
        opacity: 0.8;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    .palette-key {
        font-weight: 600;
        color: var(--color-primary);
        font-size: 0.75rem;
        font-family: var(--font-mono);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        word-break: break-all;
    }
    .filter-svg-icon {
        display: inline-block;
        width: 0.8em;
        height: 0.8em;
        opacity: 0.5;
        vertical-align: -0.05em;
        transition: opacity 0.2s ease;
        color: var(--color-primary);
        flex-shrink: 0;
    }
    .palette-item:hover .filter-svg-icon {
        opacity: 1;
    }

    .data-view-grid {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 2rem;
        align-items: start;
    }
    .base-record {
        border: 2px solid color-mix(in srgb, var(--list-color, #ccc) 60%, black);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .person-card {
        margin-top: 1rem;
        font-size: 0.95rem;
        line-height: 1.6;
        color: var(--color-text-dark);
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
        margin-bottom: 0.5rem;
        flex-wrap: wrap;
    }
    .join-tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        flex-grow: 1;
        min-width: 100px;
    }
    .query-part-panel .join-tags-container {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
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
        white-space: nowrap;
    }
    .join-tag.query-join-tag {
        color: var(--color-text-dark);
        border: 1px solid rgba(0, 0, 0, 0.1);
    }
    .join-tag.query-join-tag .remove-tag-btn {
        background: rgba(0, 0, 0, 0.1);
        color: var(--color-text-dark);
    }
    .join-tag.query-join-tag .remove-tag-btn:hover {
        background: rgba(0, 0, 0, 0.2);
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
        transition: background-color 0.2s ease;
    }
    .remove-tag-btn:hover {
        background: rgba(0, 0, 0, 0.4);
    }
    .join-btn-header {
        padding: 0.4rem 1rem;
        font-size: 0.85rem;
        font-weight: 600;
        background-color: #e5e7eb;
        color: #374151;
        border: 1px solid transparent;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        flex-shrink: 0;
    }
    .join-btn-header:hover:not(:disabled) {
        background-color: #d1d5db;
    }
    .join-btn-header:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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
            outline 0.2s ease,
            opacity 0.2s ease-in-out;
    }
</style>
