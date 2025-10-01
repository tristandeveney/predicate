// --- CHART LABELS & CONFIG ---
export const sizeLabels = ["<2500", "2500-7500", "7500-20000", ">20000"];
export const selectivityLabels = ["<25%", "25%-50%", "50%-75%", ">75%"];

// --- BUCKET DEFINITIONS FOR EACH TOPIC ---
export const buckets = {
    formLength: {
        lt_10: { label: "<10", color: "#d1e48a" },
        b_10_14: { label: "10-14", color: "#a5c986" },
        b_15_19: { label: "15-19", color: "#7ab887" },
        b_20_24: { label: "20-24", color: "#4fa38b" },
        gte_25: { label: ">=25", color: "#2a8f8c" },
    },
    binary: {
        y: { label: "Yes", color: "#3b9b8b" },
        n: { label: "No", color: "#e0e0e0" },
    },
    smsConsent: {
        consent: { label: "Consent Field", color: "#3b9b8b" },
        no_consent: { label: "Collects (No Consent)", color: "#a5c986" },
        no_ask: { label: "Doesn't Ask", color: "#e0e0e0" },
    },
    parentInfo: {
        relation: { label: "Mapped Relation", color: "#3b9b8b" },
        custom: { label: "Custom Fields", color: "#a5c986" },
        other: {
            label: "Not Collected", color: "#e0e0e0"
        },
    }
};

// --- DATA PROCESSING FUNCTION ---
const processData = (rawData, total) => {
    if (total === 0) {
        const zeroedData = {};
        for (const key in rawData) zeroedData[key] = 0;
        return zeroedData;
    }
    const percentages = {};
    for (const key in rawData) {
        percentages[key] = (rawData[key] / total) * 100;
    }
    return percentages;
};

// --- MAIN DATA EXPORT ---
export const formData = {
    formLength: {
        carnegieDistribution: [
            { type: "Baccalaureate Colleges (Arts & Sciences Focus)", data: processData({ lt_10: 23, b_10_14: 27, b_15_19: 39, b_20_24: 35, gte_25: 26 }, 150) },
            { type: "Baccalaureate Colleges (Diverse Fields)", data: processData({ lt_10: 2, b_10_14: 24, b_15_19: 14, b_20_24: 8, gte_25: 2 }, 50) },
            { type: "Baccalaureate/Associate's Colleges", data: processData({ lt_10: 0, b_10_14: 1, b_15_19: 2, b_20_24: 0, gte_25: 0 }, 3) },
            { type: "Doctoral Universities (High Research)", data: processData({ lt_10: 9, b_10_14: 22, b_15_19: 27, b_20_24: 17, gte_25: 6 }, 81) },
            { type: "Doctoral Universities (Very High Research)", data: processData({ lt_10: 15, b_10_14: 21, b_15_19: 27, b_20_24: 27, gte_25: 14 }, 104) },
            { type: "Doctoral/Professional Universities", data: processData({ lt_10: 16, b_10_14: 30, b_15_19: 27, b_20_24: 19, gte_25: 7 }, 99) },
            { type: "Master's Colleges & Universities (Larger)", data: processData({ lt_10: 10, b_10_14: 60, b_15_19: 46, b_20_24: 23, gte_25: 6 }, 145) },
            { type: "Master's Colleges & Universities (Medium)", data: processData({ lt_10: 4, b_10_14: 24, b_15_19: 37, b_20_24: 9, gte_25: 1 }, 75) },
            { type: "Master's Colleges & Universities (Smaller)", data: processData({ lt_10: 5, b_10_14: 21, b_15_19: 18, b_20_24: 5, gte_25: 4 }, 53) },
        ],
        sizeSelectivityDistribution: [
            { size: "<2500", selectivity: "<25%", data: processData({ lt_10: 1, b_10_14: 3, b_15_19: 4, b_20_24: 8, gte_25: 8 }, 24), total: 24 },
            { size: "<2500", selectivity: "25%-50%", data: processData({ lt_10: 1, b_10_14: 9, b_15_19: 13, b_20_24: 3, gte_25: 3 }, 29), total: 29 },
            { size: "<2500", selectivity: "50%-75%", data: processData({ lt_10: 11, b_10_14: 24, b_15_19: 33, b_20_24: 20, gte_25: 10 }, 98), total: 98 },
            { size: "<2500", selectivity: ">75%", data: processData({ lt_10: 18, b_10_14: 44, b_15_19: 34, b_20_24: 21, gte_25: 3 }, 120), total: 120 },
            { size: "2500-7500", selectivity: "<25%", data: processData({ lt_10: 3, b_10_14: 3, b_15_19: 2, b_20_24: 1, gte_25: 3 }, 12), total: 12 },
            { size: "2500-7500", selectivity: "25%-50%", data: processData({ lt_10: 1, b_10_14: 3, b_15_19: 9, b_20_24: 3, gte_25: 2 }, 18), total: 18 },
            { size: "2500-7500", selectivity: "50%-75%", data: processData({ lt_10: 5, b_10_14: 19, b_15_19: 22, b_20_24: 11, gte_25: 7 }, 64), total: 64 },
            { size: "2500-7500", selectivity: ">75%", data: processData({ lt_10: 12, b_10_14: 61, b_15_19: 51, b_20_24: 26, gte_25: 8 }, 158), total: 158 },
            { size: "7500-20000", selectivity: "<25%", data: processData({ lt_10: 0, b_10_14: 3, b_15_19: 5, b_20_24: 5, gte_25: 4 }, 17), total: 17 },
            { size: "7500-20000", selectivity: "25%-50%", data: processData({ lt_10: 3, b_10_14: 3, b_15_19: 4, b_20_24: 4, gte_25: 0 }, 14), total: 14 },
            { size: "7500-20000", selectivity: "50%-75%", data: processData({ lt_10: 6, b_10_14: 8, b_15_19: 11, b_20_24: 7, gte_25: 3 }, 35), total: 35 },
            { size: "7500-20000", selectivity: ">75%", data: processData({ lt_10: 9, b_10_14: 30, b_15_19: 25, b_20_24: 13, gte_25: 3 }, 80), total: 80 },
            { size: ">20000", selectivity: "<25%", data: processData({ lt_10: 1, b_10_14: 4, b_15_19: 5, b_20_24: 4, gte_25: 2 }, 16), total: 16 },
            { size: ">20000", selectivity: "25%-50%", data: processData({ lt_10: 2, b_10_14: 3, b_15_19: 5, b_20_24: 3, gte_25: 3 }, 16), total: 16 },
            { size: ">20000", selectivity: "50%-75%", data: processData({ lt_10: 2, b_10_14: 4, b_15_19: 6, b_20_24: 7, gte_25: 3 }, 22), total: 22 },
            { size: ">20000", selectivity: ">75%", data: processData({ lt_10: 9, b_10_14: 9, b_15_19: 8, b_20_24: 7, gte_25: 4 }, 37), total: 37 },
        ]
    },
    parentIdentifier: {
        carnegieDistribution: [
            { type: "Baccalaureate Colleges (Arts & Sciences Focus)", data: processData({ y: 8, n: 142 }, 150) },
            { type: "Baccalaureate Colleges (Diverse Fields)", data: processData({ y: 2, n: 48 }, 50) },
            { type: "Baccalaureate/Associate's Colleges", data: processData({ y: 1, n: 2 }, 3) },
            { type: "Doctoral Universities (High Research)", data: processData({ y: 4, n: 77 }, 81) },
            { type: "Doctoral Universities (Very High Research)", data: processData({ y: 13, n: 91 }, 104) },
            { type: "Doctoral/Professional Universities", data: processData({ y: 3, n: 96 }, 99) },
            { type: "Master's Colleges & Universities (Larger)", data: processData({ y: 8, n: 137 }, 145) },
            { type: "Master's Colleges & Universities (Medium)", data: processData({ y: 5, n: 70 }, 75) },
            { type: "Master's Colleges & Universities (Smaller)", data: processData({ y: 2, n: 52 }, 54) },
        ],
        sizeSelectivityDistribution: [
            { size: "<2500", selectivity: "<25%", data: processData({ y: 1, n: 23 }, 24), total: 24 },
            { size: "<2500", selectivity: "25%-50%", data: processData({ y: 0, n: 29 }, 29), total: 29 },
            { size: "<2500", selectivity: "50%-75%", data: processData({ y: 7, n: 91 }, 98), total: 98 },
            { size: "<2500", selectivity: ">75%", data: processData({ y: 7, n: 113 }, 120), total: 120 },
            { size: "2500-7500", selectivity: "<25%", data: processData({ y: 0, n: 12 }, 12), total: 12 },
            { size: "2500-7500", selectivity: "25%-50%", data: processData({ y: 0, n: 18 }, 18), total: 18 },
            { size: "2500-7500", selectivity: "50%-75%", data: processData({ y: 3, n: 62 }, 65), total: 65 },
            { size: "2500-7500", selectivity: ">75%", data: processData({ y: 9, n: 149 }, 158), total: 158 },
            { size: "7500-20000", selectivity: "<25%", data: processData({ y: 4, n: 13 }, 17), total: 17 },
            { size: "7500-20000", selectivity: "25%-50%", data: processData({ y: 0, n: 14 }, 14), total: 14 },
            { size: "7500-20000", selectivity: "50%-75%", data: processData({ y: 3, n: 32 }, 35), total: 35 },
            { size: "7500-20000", selectivity: ">75%", data: processData({ y: 2, n: 78 }, 80), total: 80 },
            { size: ">20000", selectivity: "<25%", data: processData({ y: 2, n: 14 }, 16), total: 16 },
            { size: ">20000", selectivity: "25%-50%", data: processData({ y: 3, n: 13 }, 16), total: 16 },
            { size: ">20000", selectivity: "50%-75%", data: processData({ y: 2, n: 20 }, 22), total: 22 },
            { size: ">20000", selectivity: ">75%", data: processData({ y: 3, n: 34 }, 37), total: 37 },
        ]
    },
    parentInfo: {
        carnegieDistribution: [
            { type: "Baccalaureate Colleges (Arts & Sciences Focus)", data: processData({ relation: 43, custom: 25, other: 82 }, 150) },
            { type: "Baccalaureate Colleges (Diverse Fields)", data: processData({ relation: 13, custom: 3, other: 34 }, 50) },
            { type: "Baccalaureate/Associate's Colleges", data: processData({ relation: 0, custom: 0, other: 3 }, 3) },
            { type: "Doctoral Universities (High Research)", data: processData({ relation: 26, custom: 8, other: 47 }, 81) },
            { type: "Doctoral Universities (Very High Research)", data: processData({ relation: 36, custom: 9, other: 59 }, 104) },
            { type: "Doctoral/Professional Universities", data: processData({ relation: 36, custom: 1, other: 62 }, 99) },
            { type: "Master's Colleges & Universities (Larger)", data: processData({ relation: 44, custom: 8, other: 93 }, 145) },
            { type: "Master's Colleges & Universities (Medium)", data: processData({ relation: 16, custom: 6, other: 53 }, 75) },
            { type: "Master's Colleges & Universities (Smaller)", data: processData({ relation: 11, custom: 2, other: 41 }, 54) },
        ],
        sizeSelectivityDistribution: [
            { size: "<2500", selectivity: "<25%", data: processData({ relation: 6, custom: 8, other: 10 }, 24), total: 24 },
            { size: "<2500", selectivity: "25%-50%", data: processData({ relation: 6, custom: 7, other: 16 }, 29), total: 29 },
            { size: "<2500", selectivity: "50%-75%", data: processData({ relation: 32, custom: 10, other: 56 }, 98), total: 98 },
            { size: "<2500", selectivity: ">75%", data: processData({ relation: 22, custom: 4, other: 94 }, 120), total: 120 },
            { size: "2500-7500", selectivity: "<25%", data: processData({ relation: 4, custom: 1, other: 7 }, 12), total: 12 },
            { size: "2500-7500", selectivity: "25%-50%", data: processData({ relation: 4, custom: 5, other: 9 }, 18), total: 18 },
            { size: "2500-7500", selectivity: "50%-75%", data: processData({ relation: 25, custom: 2, other: 38 }, 65), total: 65 },
            { size: "2500-7500", selectivity: ">75%", data: processData({ relation: 49, custom: 8, other: 101 }, 158), total: 158 },
            { size: "7500-20000", selectivity: "<25%", data: processData({ relation: 5, custom: 4, other: 8 }, 17), total: 17 },
            { size: "7500-20000", selectivity: "25%-50%", data: processData({ relation: 3, custom: 1, other: 10 }, 14), total: 14 },
            { size: "7500-20000", selectivity: "50%-75%", data: processData({ relation: 14, custom: 3, other: 18 }, 35), total: 35 },
            { size: "7500-20000", selectivity: ">75%", data: processData({ relation: 23, custom: 4, other: 53 }, 80), total: 80 },
            { size: ">20000", selectivity: "<25%", data: processData({ relation: 4, custom: 2, other: 10 }, 16), total: 16 },
            { size: ">20000", selectivity: "25%-50%", data: processData({ relation: 8, custom: 0, other: 8 }, 16), total: 16 },
            { size: ">20000", selectivity: "50%-75%", data: processData({ relation: 10, custom: 1, other: 11 }, 22), total: 22 },
            { size: ">20000", selectivity: ">75%", data: processData({ relation: 10, custom: 2, other: 25 }, 37), total: 37 },
        ]
    },
    smsConsent: {
        carnegieDistribution: [
            { type: "Baccalaureate Colleges (Arts & Sciences Focus)", data: processData({ consent: 83, no_consent: 37, no_ask: 30 }, 150) },
            { type: "Baccalaureate Colleges (Diverse Fields)", data: processData({ consent: 31, no_consent: 18, no_ask: 1 }, 50) },
            { type: "Baccalaureate/Associate's Colleges", data: processData({ consent: 2, no_consent: 1, no_ask: 0 }, 3) },
            { type: "Doctoral Universities (High Research)", data: processData({ consent: 56, no_consent: 15, no_ask: 10 }, 81) },
            { type: "Doctoral Universities (Very High Research)", data: processData({ consent: 61, no_consent: 24, no_ask: 19 }, 104) },
            { type: "Doctoral/Professional Universities", data: processData({ consent: 64, no_consent: 26, no_ask: 9 }, 99) },
            { type: "Master's Colleges & Universities (Larger)", data: processData({ consent: 104, no_consent: 34, no_ask: 7 }, 145) },
            { type: "Master's Colleges & Universities (Medium)", data: processData({ consent: 56, no_consent: 18, no_ask: 1 }, 75) },
            { type: "Master's Colleges & Universities (Smaller)", data: processData({ consent: 38, no_consent: 12, no_ask: 3 }, 53) },
        ],
        sizeSelectivityDistribution: [
            { size: "<2500", selectivity: "<25%", data: processData({ consent: 14, no_consent: 4, no_ask: 6 }, 24), total: 24 },
            { size: "<2500", selectivity: "25%-50%", data: processData({ consent: 20, no_consent: 4, no_ask: 5 }, 29), total: 29 },
            { size: "<2500", selectivity: "50%-75%", data: processData({ consent: 58, no_consent: 33, no_ask: 7 }, 98), total: 98 },
            { size: "<2500", selectivity: ">75%", data: processData({ consent: 76, no_consent: 32, no_ask: 12 }, 120), total: 120 },
            { size: "2500-7500", selectivity: "<25%", data: processData({ consent: 6, no_consent: 1, no_ask: 5 }, 12), total: 12 },
            { size: "2500-7500", selectivity: "25%-50%", data: processData({ consent: 14, no_consent: 2, no_ask: 2 }, 18), total: 18 },
            { size: "2500-7500", selectivity: "50%-75%", data: processData({ consent: 42, no_consent: 19, no_ask: 3 }, 64), total: 64 },
            { size: "2500-7500", selectivity: ">75%", data: processData({ consent: 114, no_consent: 38, no_ask: 6 }, 158), total: 158 },
            { size: "7500-20000", selectivity: "<25%", data: processData({ consent: 6, no_consent: 7, no_ask: 4 }, 17), total: 17 },
            { size: "7500-20000", selectivity: "25%-50%", data: processData({ consent: 5, no_consent: 6, no_ask: 3 }, 14), total: 14 },
            { size: "7500-20000", selectivity: "50%-75%", data: processData({ consent: 21, no_consent: 8, no_ask: 6 }, 35), total: 35 },
            { size: "7500-20000", selectivity: ">75%", data: processData({ consent: 59, no_consent: 14, no_ask: 7 }, 80), total: 80 },
            { size: ">20000", selectivity: "<25%", data: processData({ consent: 6, no_consent: 6, no_ask: 4 }, 16), total: 16 },
            { size: ">20000", selectivity: "25%-50%", data: processData({ consent: 12, no_consent: 2, no_ask: 2 }, 16), total: 16 },
            { size: ">20000", selectivity: "50%-75%", data: processData({ consent: 11, no_consent: 6, no_ask: 5 }, 22), total: 22 },
            { size: ">20000", selectivity: ">75%", data: processData({ consent: 31, no_consent: 3, no_ask: 3 }, 37), total: 37 },
        ]
    },
    academicInterest: {
        carnegieDistribution: [
            { type: "Baccalaureate Colleges (Arts & Sciences Focus)", data: processData({ y: 114, n: 36 }, 150) },
            { type: "Baccalaureate Colleges (Diverse Fields)", data: processData({ y: 48, n: 2 }, 50) },
            { type: "Baccalaureate/Associate's Colleges", data: processData({ y: 3, n: 0 }, 3) },
            { type: "Doctoral Universities (High Research)", data: processData({ y: 76, n: 5 }, 81) },
            { type: "Doctoral Universities (Very High Research)", data: processData({ y: 80, n: 24 }, 104) },
            { type: "Doctoral/Professional Universities", data: processData({ y: 91, n: 8 }, 99) },
            { type: "Master's Colleges & Universities (Larger)", data: processData({ y: 137, n: 8 }, 145) },
            { type: "Master's Colleges & Universities (Medium)", data: processData({ y: 71, n: 4 }, 75) },
            { type: "Master's Colleges & Universities (Smaller)", data: processData({ y: 47, n: 6 }, 53) },
        ],
        sizeSelectivityDistribution: [
            { size: "<2500", selectivity: "<25%", data: processData({ y: 21, n: 3 }, 24), total: 24 },
            { size: "<2500", selectivity: "25%-50%", data: processData({ y: 23, n: 6 }, 29), total: 29 },
            { size: "<2500", selectivity: "50%-75%", data: processData({ y: 87, n: 11 }, 98), total: 98 },
            { size: "<2500", selectivity: ">75%", data: processData({ y: 105, n: 15 }, 120), total: 120 },
            { size: "2500-7500", selectivity: "<25%", data: processData({ y: 6, n: 6 }, 12), total: 12 },
            { size: "2500-7500", selectivity: "25%-50%", data: processData({ y: 16, n: 2 }, 18), total: 18 },
            { size: "2500-7500", selectivity: "50%-75%", data: processData({ y: 59, n: 5 }, 64), total: 64 },
            { size: "2500-7500", selectivity: ">75%", data: processData({ y: 147, n: 11 }, 158), total: 158 },
            { size: "7500-20000", selectivity: "<25%", data: processData({ y: 14, n: 3 }, 17), total: 17 },
            { size: "7500-20000", selectivity: "25%-50%", data: processData({ y: 10, n: 4 }, 14), total: 14 },
            { size: "7500-20000", selectivity: "50%-75%", data: processData({ y: 33, n: 2 }, 35), total: 35 },
            { size: "7500-20000", selectivity: ">75%", data: processData({ y: 76, n: 4 }, 80), total: 80 },
            { size: ">20000", selectivity: "<25%", data: processData({ y: 12, n: 4 }, 16), total: 16 },
            { size: ">20000", selectivity: "25%-50%", data: processData({ y: 13, n: 3 }, 16), total: 16 },
            { size: ">20000", selectivity: "50%-75%", data: processData({ y: 16, n: 6 }, 22), total: 22 },
            { size: ">20000", selectivity: ">75%", data: processData({ y: 29, n: 8 }, 37), total: 37 },
        ]
    },
    entryTerm: {
        carnegieDistribution: [
            { type: "Baccalaureate Colleges (Arts & Sciences Focus)", data: processData({ y: 148, n: 2 }, 150) },
            { type: "Baccalaureate Colleges (Diverse Fields)", data: processData({ y: 49, n: 1 }, 50) },
            { type: "Baccalaureate/Associate's Colleges", data: processData({ y: 3, n: 0 }, 3) },
            { type: "Doctoral Universities (High Research)", data: processData({ y: 81, n: 0 }, 81) },
            { type: "Doctoral Universities (Very High Research)", data: processData({ y: 101, n: 3 }, 104) },
            { type: "Doctoral/Professional Universities", data: processData({ y: 95, n: 4 }, 99) },
            { type: "Master's Colleges & Universities (Larger)", data: processData({ y: 141, n: 3 }, 145) },
            { type: "Master's Colleges & Universities (Medium)", data: processData({ y: 75, n: 0 }, 75) },
            { type: "Master's Colleges & Universities (Smaller)", data: processData({ y: 53, n: 1 }, 53) },
        ],
        sizeSelectivityDistribution: [
            { size: "<2500", selectivity: "<25%", data: processData({ y: 24, n: 0 }, 24), total: 24 },
            { size: "<2500", selectivity: "25%-50%", data: processData({ y: 28, n: 1 }, 29), total: 29 },
            { size: "<2500", selectivity: "50%-75%", data: processData({ y: 98, n: 0 }, 98), total: 98 },
            { size: "<2500", selectivity: ">75%", data: processData({ y: 118, n: 2 }, 120), total: 120 },
            { size: "2500-7500", selectivity: "<25%", data: processData({ y: 12, n: 0 }, 12), total: 12 },
            { size: "2500-7500", selectivity: "25%-50%", data: processData({ y: 18, n: 0 }, 18), total: 18 },
            { size: "2500-7500", selectivity: "50%-75%", data: processData({ y: 63, n: 1 }, 65), total: 64 },
            { size: "2500-7500", selectivity: ">75%", data: processData({ y: 155, n: 3 }, 158), total: 158 },
            { size: "7500-20000", selectivity: "<25%", data: processData({ y: 17, n: 0 }, 17), total: 17 },
            { size: "7500-20000", selectivity: "25%-50%", data: processData({ y: 13, n: 1 }, 14), total: 14 },
            { size: "7500-20000", selectivity: "50%-75%", data: processData({ y: 35, n: 0 }, 35), total: 35 },
            { size: "7500-20000", selectivity: ">75%", data: processData({ y: 76, n: 4 }, 80), total: 80 },
            { size: ">20000", selectivity: "<25%", data: processData({ y: 15, n: 1 }, 16), total: 16 },
            { size: ">20000", selectivity: "25%-50%", data: processData({ y: 16, n: 0 }, 16), total: 16 },
            { size: ">20000", selectivity: "50%-75%", data: processData({ y: 22, n: 0 }, 22), total: 22 },
            { size: ">20000", selectivity: ">75%", data: processData({ y: 36, n: 1 }, 37), total: 37 },
        ]
    },
    marketingSource: {
        carnegieDistribution: [
            { type: "Baccalaureate Colleges (Arts & Sciences Focus)", data: processData({ y: 11, n: 139 }, 150) },
            { type: "Baccalaureate Colleges (Diverse Fields)", data: processData({ y: 7, n: 43 }, 50) },
            { type: "Baccalaureate/Associate's Colleges", data: processData({ y: 0, n: 3 }, 3) },
            { type: "Doctoral Universities (High Research)", data: processData({ y: 5, n: 76 }, 81) },
            { type: "Doctoral Universities (Very High Research)", data: processData({ y: 10, n: 94 }, 104) },
            { type: "Doctoral/Professional Universities", data: processData({ y: 9, n: 90 }, 99) },
            { type: "Master's Colleges & Universities (Larger)", data: processData({ y: 19, n: 126 }, 145) },
            { type: "Master's Colleges & Universities (Medium)", data: processData({ y: 14, n: 61 }, 75) },
            { type: "Master's Colleges & Universities (Smaller)", data: processData({ y: 9, n: 44 }, 53) },
        ],
        sizeSelectivityDistribution: [
            { size: "<2500", selectivity: "<25%", data: processData({ y: 0, n: 24 }, 24), total: 24 },
            { size: "<2500", selectivity: "25%-50%", data: processData({ y: 4, n: 25 }, 29), total: 29 },
            { size: "<2500", selectivity: "50%-75%", data: processData({ y: 9, n: 89 }, 98), total: 98 },
            { size: "<2500", selectivity: ">75%", data: processData({ y: 20, n: 100 }, 120), total: 120 },
            { size: "2500-7500", selectivity: "<25%", data: processData({ y: 1, n: 11 }, 12), total: 12 },
            { size: "2500-7500", selectivity: "25%-50%", data: processData({ y: 2, n: 16 }, 18), total: 18 },
            { size: "2500-7500", selectivity: "50%-75%", data: processData({ y: 10, n: 54 }, 64), total: 64 },
            { size: "2500-7500", selectivity: ">75%", data: processData({ y: 17, n: 141 }, 158), total: 158 },
            { size: "7500-20000", selectivity: "<25%", data: processData({ y: 2, n: 15 }, 17), total: 17 },
            { size: "7500-20000", selectivity: "25%-50%", data: processData({ y: 2, n: 12 }, 14), total: 14 },
            { size: "7500-20000", selectivity: "50%-75%", data: processData({ y: 2, n: 33 }, 35), total: 35 },
            { size: "7500-20000", selectivity: ">75%", data: processData({ y: 7, n: 73 }, 80), total: 80 },
            { size: ">20000", selectivity: "<25%", data: processData({ y: 3, n: 13 }, 16), total: 16 },
            { size: ">20000", selectivity: "25%-50%", data: processData({ y: 0, n: 16 }, 16), total: 16 },
            { size: ">20000", selectivity: "50%-75%", data: processData({ y: 3, n: 19 }, 22), total: 22 },
            { size: ">20000", selectivity: ">75%", data: processData({ y: 2, n: 35 }, 37), total: 37 },
        ]
    },
    optionalStep: {
        carnegieDistribution: [
            { type: "Baccalaureate Colleges (Arts & Sciences Focus)", data: processData({ y: 15, n: 135 }, 150) },
            { type: "Baccalaureate Colleges (Diverse Fields)", data: processData({ y: 2, n: 48 }, 50) },
            { type: "Baccalaureate/Associate's Colleges", data: processData({ y: 0, n: 3 }, 3) },
            { type: "Doctoral Universities (High Research)", data: processData({ y: 6, n: 75 }, 81) },
            { type: "Doctoral Universities (Very High Research)", data: processData({ y: 16, n: 88 }, 104) },
            { type: "Doctoral/Professional Universities", data: processData({ y: 7, n: 92 }, 99) },
            { type: "Master's Colleges & Universities (Larger)", data: processData({ y: 12, n: 133 }, 145) },
            { type: "Master's Colleges & Universities (Medium)", data: processData({ y: 6, n: 69 }, 75) },
            { type: "Master's Colleges & Universities (Smaller)", data: processData({ y: 3, n: 50 }, 53) },
        ],
        sizeSelectivityDistribution: [
            { size: "<2500", selectivity: "<25%", data: processData({ y: 4, n: 20 }, 24), total: 24 },
            { size: "<2500", selectivity: "25%-50%", data: processData({ y: 2, n: 27 }, 29), total: 29 },
            { size: "<2500", selectivity: "50%-75%", data: processData({ y: 9, n: 89 }, 98), total: 98 },
            { size: "<2500", selectivity: ">75%", data: processData({ y: 10, n: 110 }, 120), total: 120 },
            { size: "2500-7500", selectivity: "<25%", data: processData({ y: 0, n: 12 }, 12), total: 12 },
            { size: "2500-7500", selectivity: "25%-50%", data: processData({ y: 4, n: 14 }, 18), total: 18 },
            { size: "2500-7500", selectivity: "50%-75%", data: processData({ y: 6, n: 58 }, 64), total: 64 },
            { size: "2500-7500", selectivity: ">75%", data: processData({ y: 10, n: 148 }, 158), total: 158 },
            { size: "7500-20000", selectivity: "<25%", data: processData({ y: 6, n: 11 }, 17), total: 17 },
            { size: "7500-20000", selectivity: "25%-50%", data: processData({ y: 0, n: 14 }, 14), total: 14 },
            { size: "7500-20000", selectivity: "50%-75%", data: processData({ y: 2, n: 33 }, 35), total: 35 },
            { size: "7500-20000", selectivity: ">75%", data: processData({ y: 5, n: 75 }, 80), total: 80 },
            { size: ">20000", selectivity: "<25%", data: processData({ y: 2, n: 14 }, 16), total: 16 },
            { size: ">20000", selectivity: "25%-50%", data: processData({ y: 0, n: 16 }, 16), total: 16 },
            { size: ">20000", selectivity: "50%-75%", data: processData({ y: 3, n: 19 }, 22), total: 22 },
            { size: ">20000", selectivity: ">75%", data: processData({ y: 4, n: 33 }, 37), total: 37 },
        ]
    }
};