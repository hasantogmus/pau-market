import { getSearchScore, normalizeSearchText, tokenizeSearch } from '../src/utils/search.js';

const API_BASE_URL = process.env.PAUMARKET_API_URL || 'http://127.0.0.1:5251/api';
const TARGET_ATTEMPTS = Number(process.env.SEARCH_FUZZ_ATTEMPTS || 100000);
const PAGE_SIZE = Number(process.env.SEARCH_FUZZ_PAGE_SIZE || 200);
const MAX_PAGES = Number(process.env.SEARCH_FUZZ_MAX_PAGES || 10);
const TOP_N = Number(process.env.SEARCH_FUZZ_TOP_N || 20);

const STOP_WORDS = new Set([
    'acil',
    'artık',
    'artik',
    'atabilir',
    'durumda',
    'edilir',
    'firsat',
    'fiyat',
    'hemen',
    'icin',
    'ile',
    'bir',
    'cok',
    'az',
    'sifir',
    'kullanilmis',
    'kampusu',
    'pau',
    'pazari',
    'satilik',
    'satiliktir',
    'temiz',
]);

const normalizeListing = (item) => ({
    ...item,
    categoryName: item.categoryName ?? item.category ?? null,
    imageUrls: Array.isArray(item.imageUrls)
        ? item.imageUrls
        : item.imageUrl
            ? [item.imageUrl]
            : [],
});

const fetchPage = async (pageNumber) => {
    const url = new URL(`${API_BASE_URL}/listings`);
    url.searchParams.set('pageNumber', String(pageNumber));
    url.searchParams.set('pageSize', String(PAGE_SIZE));

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Backend ${response.status} returned for ${url}`);
    }

    const data = await response.json();
    return {
        totalPages: Number(data.totalPages || 1),
        items: Array.isArray(data.items) ? data.items.map(normalizeListing) : [],
    };
};

const fetchListings = async () => {
    const firstPage = await fetchPage(1);
    const totalPages = Math.min(firstPage.totalPages, MAX_PAGES);
    const restPages = [];

    for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
        restPages.push(fetchPage(pageNumber));
    }

    const pages = await Promise.all(restPages);
    const byId = new Map();

    [firstPage, ...pages].forEach((page) => {
        page.items.forEach((item) => byId.set(item.id, item));
    });

    return [...byId.values()];
};

const createSeededRandom = (seed = 42) => {
    let value = seed >>> 0;

    return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 0x100000000;
    };
};

const randomInt = (random, max) => Math.floor(random() * max);

const typoAlphabet = 'abcçdefgğhıijklmnoöprsştuüvyz';

const deleteOne = (word, random) => {
    if (word.length <= 3) return word;
    const index = 1 + randomInt(random, word.length - 1);
    return `${word.slice(0, index)}${word.slice(index + 1)}`;
};

const swapAdjacent = (word, random) => {
    if (word.length <= 3) return word;
    const index = 1 + randomInt(random, word.length - 2);
    return `${word.slice(0, index)}${word[index + 1]}${word[index]}${word.slice(index + 2)}`;
};

const replaceOne = (word, random) => {
    if (word.length <= 3) return word;
    const index = 1 + randomInt(random, word.length - 1);
    const replacement = typoAlphabet[randomInt(random, typoAlphabet.length)];
    return `${word.slice(0, index)}${replacement}${word.slice(index + 1)}`;
};

const duplicateOne = (word, random) => {
    if (word.length <= 3) return word;
    const index = 1 + randomInt(random, word.length - 1);
    return `${word.slice(0, index)}${word[index]}${word.slice(index)}`;
};

const keyboardNeighbor = (word, random) => {
    const neighbors = {
        a: 'se',
        e: 'wr',
        i: 'uo',
        o: 'ip',
        r: 'te',
        s: 'ad',
        t: 'ry',
        u: 'yi',
        y: 'tu',
    };
    const replaceableIndexes = [...word]
        .map((char, index) => ({ char, index }))
        .filter(({ char, index }) => index > 0 && neighbors[char]);

    if (replaceableIndexes.length === 0) return replaceOne(word, random);

    const { char, index } = replaceableIndexes[randomInt(random, replaceableIndexes.length)];
    const replacementSet = neighbors[char];
    const replacement = replacementSet[randomInt(random, replacementSet.length)];

    return `${word.slice(0, index)}${replacement}${word.slice(index + 1)}`;
};

const typoGenerators = [deleteOne, swapAdjacent, replaceOne, duplicateOne, keyboardNeighbor];

const collectTokenCases = (listings) => {
    const cases = [];

    listings.forEach((listing) => {
        // Title tokens identify a specific product better than generic category/description
        // words such as "elektronik", "temiz", "acil" or "satiliktir".
        const sourceText = listing.title || '';

        tokenizeSearch(sourceText)
            .filter((token) => token.length >= 4)
            .filter((token) => !/^\d+$/.test(token))
            .filter((token) => !STOP_WORDS.has(token))
            .forEach((token) => {
                cases.push({ listing, token });
            });
    });

    return cases;
};

const createRanker = (listings) => {
    const cache = new Map();

    return (query) => {
        const normalizedQuery = normalizeSearchText(query);
        if (cache.has(normalizedQuery)) {
            return cache.get(normalizedQuery);
        }

        const ranked = listings
            .map((listing) => ({
                listing,
                score: getSearchScore(listing, query),
            }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score);

        cache.set(normalizedQuery, ranked);
        return ranked;
    };
};

const run = async () => {
    const listings = await fetchListings();
    const tokenCases = collectTokenCases(listings);
    const rankListings = createRanker(listings);

    if (listings.length === 0) {
        throw new Error('No listings returned from backend.');
    }

    if (tokenCases.length === 0) {
        throw new Error('No searchable tokens collected from listings.');
    }

    const random = createSeededRandom();
    const samples = [];
    let matched = 0;
    let topNMatched = 0;
    let exactNormalizedQueries = 0;

    for (let attempt = 0; attempt < TARGET_ATTEMPTS; attempt += 1) {
        const tokenCase = tokenCases[randomInt(random, tokenCases.length)];
        const generator = typoGenerators[randomInt(random, typoGenerators.length)];
        const query = generator(tokenCase.token, random);
        const normalizedQuery = normalizeSearchText(query);

        if (normalizedQuery === tokenCase.token) {
            exactNormalizedQueries += 1;
        }

        const ranked = rankListings(query);
        const rankIndex = ranked.findIndex(({ listing }) => listing.id === tokenCase.listing.id);

        if (rankIndex >= 0) {
            matched += 1;
        }

        if (rankIndex >= 0 && rankIndex < TOP_N) {
            topNMatched += 1;
        } else if (samples.length < 8) {
            samples.push({
                query,
                expectedToken: tokenCase.token,
                expectedListing: tokenCase.listing.title,
                topResult: ranked[0]?.listing?.title ?? null,
                topScore: ranked[0]?.score ?? 0,
            });
        }
    }

    const matchedPercent = ((matched / TARGET_ATTEMPTS) * 100).toFixed(2);
    const topNPercent = ((topNMatched / TARGET_ATTEMPTS) * 100).toFixed(2);

    console.log(JSON.stringify({
        apiBaseUrl: API_BASE_URL,
        listings: listings.length,
        tokenCases: tokenCases.length,
        attempts: TARGET_ATTEMPTS,
        exactNormalizedQueries,
        matched,
        matchedPercent,
        topN: TOP_N,
        topNMatched,
        topNPercent,
        sampleMisses: samples,
    }, null, 2));
};

run().catch((error) => {
    console.error(`Search fuzz check failed: ${error.message}`);
    process.exitCode = 1;
});
