const SEARCH_TERM_GROUPS = [
    ['sarj', 'şarj', 'charger', 'adaptör', 'adaptor', 'powerbank', 'batarya', 'power', 'usb', 'typec', 'type c'],
    ['telefon', 'phone', 'iphone', 'android', 'cep'],
    ['bilgisayar', 'laptop', 'notebook', 'macbook', 'pc'],
    ['tablet', 'ipad'],
    ['kulaklik', 'kulaklık', 'headphone', 'headset', 'airpods', 'earbuds'],
    ['kitap', 'ders', 'kaynak', 'not', 'özet', 'ozet'],
    ['bisiklet', 'bike', 'scooter'],
    ['oyun', 'game', 'playstation', 'ps5', 'xbox', 'konsol'],
    ['kiyafet', 'giyim', 'mont', 'ceket', 'ayakkabı', 'ayakkabi'],
    ['kablo', 'hdmi', 'usb', 'typec', 'type c'],
    ['mouse', 'fare', 'mause'],
];

export const normalizeSearchText = (value = '') =>
    String(value)
        .toLocaleLowerCase('tr-TR')
        .replace(/[ç]/g, 'c')
        .replace(/[ğ]/g, 'g')
        .replace(/[ı]/g, 'i')
        .replace(/[ö]/g, 'o')
        .replace(/[ş]/g, 's')
        .replace(/[ü]/g, 'u')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

export const tokenizeSearch = (value) =>
    normalizeSearchText(value)
        .split(/\s+/)
        .filter(Boolean);

const buildSynonymMap = () => {
    const map = {};

    SEARCH_TERM_GROUPS.forEach((group) => {
        const normalizedGroup = [...new Set(group.flatMap((term) => tokenizeSearch(term)))];

        normalizedGroup.forEach((term) => {
            map[term] = [...new Set([...(map[term] || []), ...normalizedGroup.filter((item) => item !== term)])];
        });
    });

    return map;
};

export const SEARCH_SYNONYMS = buildSynonymMap();

export const getCanonicalSearchText = (value) => tokenizeSearch(value).join(' ');

export const levenshteinDistance = (a, b) => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    const current = Array(b.length + 1).fill(0);

    for (let i = 1; i <= a.length; i += 1) {
        current[0] = i;

        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            current[j] = Math.min(
                current[j - 1] + 1,
                previous[j] + 1,
                previous[j - 1] + cost
            );
        }

        for (let j = 0; j <= b.length; j += 1) {
            previous[j] = current[j];
        }
    }

    return previous[b.length];
};

const isSingleAdjacentTransposition = (a, b) => {
    if (a.length !== b.length) return false;

    const mismatches = [];

    for (let index = 0; index < a.length; index += 1) {
        if (a[index] !== b[index]) {
            mismatches.push(index);
        }
    }

    return mismatches.length === 2 &&
        mismatches[1] === mismatches[0] + 1 &&
        a[mismatches[0]] === b[mismatches[1]] &&
        a[mismatches[1]] === b[mismatches[0]];
};

export const getAllowedTypoDistance = (token) => {
    if (token.length <= 3) return 0;
    if (token.length <= 5) return 1;
    return 2;
};

export const tokenMatchesWord = (token, word, { allowTypo = true } = {}) => {
    if (token === word) return true;
    if (token.length >= 3 && word.includes(token)) return true;
    if (token.length >= 5 && word.length >= 5 && token.includes(word)) return true;

    if (!allowTypo) return false;

    const allowedDistance = getAllowedTypoDistance(token);
    if (allowedDistance === 0) return false;
    if (Math.abs(token.length - word.length) > allowedDistance) return false;
    if (token[0] !== word[0]) return false;

    if (isSingleAdjacentTransposition(token, word)) return true;

    return levenshteinDistance(token, word) <= allowedDistance;
};

export const getSynonymKeyForToken = (token) => {
    if (SEARCH_SYNONYMS[token]) return token;

    return Object.keys(SEARCH_SYNONYMS).find((key) =>
        tokenMatchesWord(token, key, { allowTypo: true })
    );
};

export const expandSearchToken = (token) => {
    const synonymKey = getSynonymKeyForToken(token);
    const synonyms = synonymKey ? SEARCH_SYNONYMS[synonymKey] : [];

    return [...new Set([token, synonymKey, ...synonyms.flatMap(tokenizeSearch)].filter(Boolean))];
};

export const getBackendSearchTerms = (value = '') => {
    const original = value.trim();
    const canonical = getCanonicalSearchText(value);
    const synonymTerms = tokenizeSearch(value)
        .flatMap((token) => {
            const synonymKey = getSynonymKeyForToken(token);
            return synonymKey ? SEARCH_SYNONYMS[synonymKey] : [];
        })
        .map((term) => term.trim())
        .filter(Boolean);

    return [...new Set([original, canonical, ...synonymTerms].filter(Boolean))];
};

const normalizedField = (value = '') => normalizeSearchText(value);

export const getSearchScore = (item, query) => {
    const queryTokens = tokenizeSearch(query);
    if (queryTokens.length === 0) return 1;

    const titleText = normalizedField(item.title);
    const descriptionText = normalizedField(item.description);
    const categoryText = normalizedField(item.categoryName ?? item.category);
    const searchableText = [
        item.title,
        item.description,
        item.categoryName,
        item.category,
    ].filter(Boolean).join(' ');

    const queryText = getCanonicalSearchText(query);
    const haystackText = normalizeSearchText(searchableText);
    const titleTokens = titleText.split(/\s+/).filter(Boolean);
    const descriptionTokens = descriptionText.split(/\s+/).filter(Boolean);
    const categoryTokens = categoryText.split(/\s+/).filter(Boolean);
    const haystackTokens = haystackText.split(/\s+/).filter(Boolean);
    let score = 0;

    if (titleText.includes(queryText)) score += 120;
    else if (descriptionText.includes(queryText)) score += 90;
    else if (categoryText.includes(queryText)) score += 45;

    const allTokensMatched = queryTokens.every((queryToken) => {
        const alternatives = expandSearchToken(queryToken);

        return alternatives.some((alternative, alternativeIndex) => {
            const isOriginalToken = alternativeIndex === 0;

            if (titleTokens.some((word) => tokenMatchesWord(alternative, word, { allowTypo: isOriginalToken }))) {
                score += isOriginalToken ? 80 : 55;
                return true;
            }

            if (descriptionTokens.some((word) => tokenMatchesWord(alternative, word, { allowTypo: isOriginalToken }))) {
                score += isOriginalToken ? 55 : 35;
                return true;
            }

            if (categoryTokens.some((word) => tokenMatchesWord(alternative, word, { allowTypo: isOriginalToken }))) {
                score += 25;
                return true;
            }

            if (haystackTokens.some((word) => tokenMatchesWord(alternative, word, { allowTypo: false }))) {
                score += 10;
                return true;
            }

            return false;
        });
    });

    return allTokensMatched ? score : 0;
};
