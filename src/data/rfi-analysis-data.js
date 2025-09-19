// src/data/rfi-analysis-data.js

// --- Base Data & Config ---
const chartMaxY = 3.0;
const sizeLabels = ["<2500", "2500-7500", "7500-20000", ">20000"];
const selectivityLabels = ["<25%", "25-50%", "50-75%", ">75%"];

// --- Raw Data Source: Averages ---
const averageDataByCarnegie = [
    { type: "Baccalaureate: Arts & Sciences Focus", slate: 1.59, other: 1.52, slate_n: 150, other_n: 21 },
    { type: "Baccalaureate: Diverse Fields", slate: 1.28, other: 1.47, slate_n: 50, other_n: 68 },
    { type: "Baccalaureate: Mixed Baccalaureate/Associate's", slate: 1.33, other: 2.0, slate_n: 3, other_n: 2 },
    { type: "Master's: Larger Programs", slate: 1.64, other: 1.58, slate_n: 148, other_n: 93 },
    { type: "Master's: Medium Programs", slate: 1.58, other: 1.63, slate_n: 77, other_n: 43 },
    { type: "Master's: Small Programs", slate: 1.37, other: 1.66, slate_n: 54, other_n: 29 },
    { type: "Doctoral: High Research Activity", slate: 1.85, other: 2.03, slate_n: 84, other_n: 39 },
    { type: "Doctoral: Very High Research Activity", slate: 2.4, other: 1.84, slate_n: 111, other_n: 32 },
    { type: "Doctoral: Doctoral/Professional", slate: 1.76, other: 1.66, slate_n: 101, other_n: 41 },

];

const sizeSelectivityAveragesRaw = [
    { size: "<2500", selectivity: "<25%", slate: 2.25, other: 1.50, slate_n: 4, other_n: 2 },
    { size: "<2500", selectivity: "25-50%", slate: 1.34, other: 1.60, slate_n: 110, other_n: 80 },
    { size: "<2500", selectivity: "50-75%", slate: 1.48, other: 1.51, slate_n: 90, other_n: 55 },
    { size: "<2500", selectivity: ">75%", slate: 1.48, other: 1.41, slate_n: 85, other_n: 42 },
    { size: "2500-7500", selectivity: "<25%", slate: 1.42, other: 3.33, slate_n: 7, other_n: 3 },
    { size: "2500-7500", selectivity: "25-50%", slate: 1.83, other: 2.67, slate_n: 60, other_n: 15 },
    { size: "2500-7500", selectivity: "50-75%", slate: 1.66, other: 1.51, slate_n: 120, other_n: 95 },
    { size: "2500-7500", selectivity: ">75%", slate: 1.58, other: 1.62, slate_n: 155, other_n: 98 },
    { size: "7500-20000", selectivity: "<25%", slate: 2.78, other: null, slate_n: 9, other_n: 0 },
    { size: "7500-20000", selectivity: "25-50%", slate: 2.64, other: 1.57, slate_n: 22, other_n: 7 },
    { size: "7500-20000", selectivity: "50-75%", slate: 1.76, other: 1.80, slate_n: 95, other_n: 60 },
    { size: "7500-20000", selectivity: ">75%", slate: 1.69, other: 1.79, slate_n: 115, other_n: 77 },
    { size: ">20000", selectivity: "<25%", slate: 3.17, other: 3.00, slate_n: 6, other_n: 2 },
    { size: ">20000", selectivity: "25-50%", slate: 2.35, other: 3.25, slate_n: 20, other_n: 4 },
    { size: ">20000", selectivity: "50-75%", slate: 1.95, other: 2.09, slate_n: 65, other_n: 42 },
    { size: ">20000", selectivity: ">75%", slate: 2.03, other: 1.63, slate_n: 88, other_n: 60 },
];

// --- Raw Data Source: Distributions ---
const carnegieDistributionData = {
    slate: [
        { type: "Baccalaureate: Arts & Sciences Focus", counts: [2, 83, 41, 22, 2, 0, 0] }, { type: "Baccalaureate: Diverse Fields", counts: [1, 36, 11, 2, 0, 0, 0] }, { type: "Baccalaureate: Mixed Baccalaureate/Associate's", counts: [0, 2, 1, 0, 0, 0, 0] }, { type: "Master's: Larger Programs", counts: [2, 68, 62, 14, 2, 0, 0] }, { type: "Master's: Medium Programs", counts: [1, 38, 30, 8, 0, 0, 0] }, { type: "Master's: Small Programs", counts: [1, 40, 7, 5, 0, 1, 0] }, { type: "Doctoral: High Research Activity", counts: [2, 32, 34, 10, 5, 1, 0] }, { type: "Doctoral: Very High Research Activity", counts: [0, 24, 40, 32, 10, 4, 1] }, { type: "Doctoral: Doctoral/Professional", counts: [2, 44, 39, 12, 2, 1, 1] },
    ],
    other: [
        { type: "Baccalaureate: Arts & Sciences Focus", counts: [1, 13, 3, 3, 1, 0, 0] }, { type: "Baccalaureate: Diverse Fields", counts: [4, 39, 18, 4, 2, 1, 0] }, { type: "Baccalaureate: Mixed Baccalaureate/Associate's", counts: [0, 1, 0, 1, 0, 0, 0] }, { type: "Doctoral: High Research Activity", counts: [1, 13, 12, 10, 3, 0, 0] }, { type: "Doctoral: Very High Research Activity", counts: [0, 13, 12, 6, 1, 0, 0] }, { type: "Doctoral/Professional", counts: [2, 20, 11, 6, 2, 0, 0] }, { type: "Master's: Larger Programs", counts: [0, 51, 34, 4, 4, 0, 0] }, { type: "Master's: Medium", counts: [1, 23, 11, 7, 1, 0, 0] }, { type: "Master's: Small Programs", counts: [0, 18, 8, 1, 0, 1, 1] },
    ],
};

const sizeSelectivityDistributionData = {
    slate: [
        { size: "<2500", selectivity: "<25%", counts: [0, 4, 11, 8, 1, 0, 0] },
        { size: "<2500", selectivity: "25-50%", counts: [0, 22, 4, 3, 0, 0, 0] },
        { size: "<2500", selectivity: "50-75%", counts: [4, 55, 31, 7, 1, 1, 0] },
        { size: "<2500", selectivity: ">75%", counts: [1, 75, 33, 13, 0, 0, 0] },
        { size: "2500-7500", selectivity: "<25%", counts: [1, 7, 2, 2, 0, 0, 0] },
        { size: "2500-7500", selectivity: "25-50%", counts: [0, 6, 9, 3, 0, 0, 0] },
        { size: "2500-7500", selectivity: "50-75%", counts: [0, 33, 24, 10, 0, 0, 0] },
        { size: "2500-7500", selectivity: ">75%", counts: [2, 84, 58, 13, 4, 0, 0] },
        { size: "7500-20000", selectivity: "<25%", counts: [0, 2, 5, 7, 3, 1, 0] },
        { size: "7500-20000", selectivity: "25-50%", counts: [0, 3, 5, 3, 2, 0, 1] },
        { size: "7500-20000", selectivity: "50-75%", counts: [0, 18, 14, 3, 0, 2, 0] },
        { size: "7500-20000", selectivity: ">75%", counts: [3, 33, 32, 10, 2, 0, 0] },
        { size: ">20000", selectivity: "<25%", counts: [0, 1, 6, 5, 2, 3, 1] },
        { size: ">20000", selectivity: "25-50%", counts: [0, 3, 7, 5, 2, 0, 0] },
        { size: ">20000", selectivity: "50-75%", counts: [0, 9, 6, 6, 1, 0, 0] },
        { size: ">20000", selectivity: ">75%", counts: [0, 12, 18, 7, 3, 0, 0] },
    ],
    other: [
        { size: "<2500", selectivity: "<25%", counts: [0, 1, 1, 0, 0, 0, 0] }, { size: "<2500", selectivity: "25-50%", counts: [8, 40, 22, 10, 0, 0, 0] }, { size: "<2500", selectivity: "50-75%", counts: [5, 30, 15, 5, 0, 0, 0] }, { size: "<2500", selectivity: ">75%", counts: [4, 20, 12, 6, 0, 0, 0] }, { size: "2500-7500", selectivity: "<25%", counts: [0, 0, 1, 1, 1, 0, 0] }, { size: "2500-7500", selectivity: "25-50%", counts: [0, 3, 5, 4, 3, 0, 0] }, { size: "2500-7500", selectivity: "50-75%", counts: [8, 45, 30, 12, 0, 0, 0] }, { size: "2500-7500", selectivity: ">75%", counts: [9, 50, 28, 11, 0, 0, 0] }, { size: "7500-20000", selectivity: "<25%", counts: [0, 0, 0, 0, 0, 0, 0] }, { size: "7500-20000", selectivity: "25-50%", counts: [1, 3, 2, 1, 0, 0, 0] }, { size: "7500-20000", selectivity: "50-75%", counts: [3, 25, 18, 14, 0, 0, 0] }, { size: "7500-20000", selectivity: ">75%", counts: [7, 35, 20, 15, 0, 0, 0] }, { size: ">20000", selectivity: "<25%", counts: [0, 0, 1, 0, 1, 0, 0] }, { size: ">20000", selectivity: "25-50%", counts: [0, 0, 1, 2, 1, 0, 0] }, { size: ">20000", selectivity: "50-75%", counts: [2, 20, 12, 8, 0, 0, 0] }, { size: ">20000", selectivity: ">75%", counts: [5, 25, 18, 12, 0, 0, 0] },
    ]
};

// --- Helper Functions ---
const processDistributionData = (data) => data.map((item) => {
    const defaultPercentages = { "0-1": 0, "2": 0, "3": 0, "4+": 0 };
    if (!item.counts) return { ...item, percentages: defaultPercentages, raw: {}, total: 0 };
    const total = item.counts.reduce((sum, count) => sum + count, 0);
    const buckets = { "0-1": item.counts[0] + item.counts[1], "2": item.counts[2], "3": item.counts[3], "4+": item.counts[4] + item.counts[5] + item.counts[6] };
    if (total === 0) return { ...item, percentages: defaultPercentages, raw: buckets, total };
    const percentages = { "0-1": (buckets["0-1"] / total) * 100, "2": (buckets["2"] / total) * 100, "3": (buckets["3"] / total) * 100, "4+": (buckets["4+"] / total) * 100 };
    return { ...item, percentages, raw: buckets, total };
});

const getHeatmapStyle = (value, min, max, color = 'primary') => {
    if (value === null || value === undefined || value <= 0) return `background-color: #f8f9fa; color: #6c757d;`;
    const range = max - min;
    const position = range > 0 ? (value - min) / range : 1;
    const startColor = [230, 240, 250]; // Lightest Blue
    const endColor = color === 'primary' ? [10, 37, 64] : [212, 160, 86];
    const r = Math.round(startColor[0] + position * (endColor[0] - startColor[0]));
    const g = Math.round(startColor[1] + position * (endColor[1] - startColor[1]));
    const b = Math.round(startColor[2] + position * (endColor[2] - startColor[2]));
    const textColor = position > 0.6 ? '#ffffff' : '#0a2540';
    return `background-color: rgb(${r}, ${g}, ${b}); color: ${textColor};`;
};

// --- Processed Data Structures ---
const hardcodedAverages = {
    "Baccalaureate: Arts & Sciences Focus": 1.584795322,
    "Baccalaureate: Diverse Fields": 1.389830508,
    "Baccalaureate: Mixed Baccalaureate/Associate's": 1.6,
    "Doctoral: High Research Activity": 1.902439024,
    "Doctoral: Very High Research Activity": 2.272727273,
    "Doctoral: Doctoral/Professional": 1.732394366,
    "Master's: Larger Programs": 1.614107884,
    "Master's: Medium Programs": 1.6,
    "Master's: Small Programs": 1.469879518
};

const allInstitutionsAveragesByCarnegie = averageDataByCarnegie.map(item => ({
    type: item.type,
    average: hardcodedAverages[item.type] || 0
}));
const allInstitutionsAveragesBySizeSelectivity = sizeSelectivityAveragesRaw.map(item => ({ ...item, average: ((item.slate || 0) * (item.slate_n || 0) + (item.other || 0) * (item.other_n || 0)) / ((item.slate_n || 0) + (item.other_n || 0)) || 0 }));

const combinedSizeSelectivityDist = sizeSelectivityDistributionData.slate.map((slateItem) => {
    const otherItem = sizeSelectivityDistributionData.other.find(d => d.size === slateItem.size && d.selectivity === slateItem.selectivity);
    const combinedCounts = slateItem.counts.map((count, i) => count + (otherItem?.counts[i] || 0));
    return { ...slateItem, counts: combinedCounts };
});
const processedSizeSelectivityAll = processDistributionData(combinedSizeSelectivityDist);

const carnegieDistributionComparison = averageDataByCarnegie.map(item => ({
    type: item.type,
    slateData: processDistributionData(carnegieDistributionData.slate).find(d => d.type === item.type),
}));
const sizeSelectivityDistributionComparison = sizeSelectivityAveragesRaw.map(item => ({
    ...item,
    slateData: processDistributionData(sizeSelectivityDistributionData.slate).find(d => d.size === item.size && d.selectivity === item.selectivity),
    otherData: processDistributionData(sizeSelectivityDistributionData.other).find(d => d.size === item.size && d.selectivity === item.selectivity),
}));

// --- Ordered Data for Triptychs ---
const allInstitutionsAveragesByCarnegieOrdered = [
    { title: "Baccalaureate Colleges", key: "bacc", data: allInstitutionsAveragesByCarnegie.filter(d => d.type.startsWith("Bacc")) },
    { title: "Master's Colleges & Universities", key: "mast", data: allInstitutionsAveragesByCarnegie.filter(d => d.type.startsWith("Master")) },
    { title: "Doctoral Universities", key: "doct", data: allInstitutionsAveragesByCarnegie.filter(d => d.type.startsWith("Doc")) }
];

const slateVsOtherAveragesByCarnegieOrdered = [
    { title: "Baccalaureate Colleges", key: "bacc", data: averageDataByCarnegie.filter(d => d.type.startsWith("Bacc")) },
    { title: "Master's Colleges & Universities", key: "mast", data: averageDataByCarnegie.filter(d => d.type.startsWith("Master")) },
    { title: "Doctoral Universities", key: "doct", data: averageDataByCarnegie.filter(d => d.type.startsWith("Doc")) }
];


// --- Single Export Object ---
export const chartData = {
    chartMaxY,
    sizeLabels,
    selectivityLabels,
    getHeatmapStyle,
    allInstitutions: {
        averagesByCarnegie: allInstitutionsAveragesByCarnegieOrdered,
        averagesBySizeSelectivity: allInstitutionsAveragesBySizeSelectivity,
        distributionsBySizeSelectivity: processedSizeSelectivityAll,
    },
    slateVsOther: {
        averagesByCarnegie: slateVsOtherAveragesByCarnegieOrdered,
        distributionsByCarnegie: carnegieDistributionComparison,
        averagesBySizeSelectivity: sizeSelectivityAveragesRaw,
        distributionsBySizeSelectivity: sizeSelectivityDistributionComparison,
    },
};