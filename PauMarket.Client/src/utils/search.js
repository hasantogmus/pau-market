const SEARCH_TERM_GROUPS = [
    ['sarj', 'şarj', 'sarz', 'şarz', 'charger', 'adaptör', 'adaptor', 'powerbank', 'batarya', 'power', 'usb', 'typec', 'type c'],
    ['telefon', 'phone', 'iphone', 'android', 'cep', 'kılıf', 'kilif', 'ekran koruyucu', 'lightning'],
    ['bilgisayar', 'laptop', 'notebook', 'macbook', 'pc', 'monitör', 'monitor', 'ekran', 'klavye', 'keyboard', 'masaüstü', 'masaustu', 'desktop', 'gaming'],
    ['tablet', 'ipad'],
    ['kulaklik', 'kulaklık', 'headphone', 'headset', 'airpods', 'earbuds'],
    ['kitap', 'ders', 'kaynak', 'not', 'özet', 'ozet', 'çıkmış', 'cikmis', 'vize', 'final', 'slayt', 'pdf', 'fotokopi', 'defter', 'lab', 'föy', 'foy', 'ödev', 'odev', 'atlas', 'soru bankası', 'soru bankasi'],
    ['bisiklet', 'bike', 'scooter'],
    ['oyun', 'game', 'playstation', 'play station', 'ps', 'ps4', 'ps5', 'xbox', 'kol', 'joystick', 'dualshock', 'dualsense', 'nintendo', 'switch', 'konsol'],
    ['kiyafet', 'giyim', 'mont', 'ceket', 'ayakkabı', 'ayakkabi', 'bot', 'sneaker', 'eşofman', 'esofman', 'pantolon', 'kazak', 'forma', 'çanta', 'canta', 'gözlük', 'gozluk', 'saat', 'bere'],
    ['ev', 'eşya', 'esya', 'yurt', 'oda', 'masa', 'sandalye', 'lamba', 'buzdolabı', 'buzdolabi', 'mini dolap', 'kettle', 'ütü', 'utu', 'yatak', 'halı', 'hali'],
    ['kablo', 'hdmi', 'usb', 'typec', 'type c'],
    ['mouse', 'fare', 'mause'],
];

const OPTIONAL_QUERY_TOKENS = new Set([
    'alet',
    'aleti',
    'baslik',
    'basligi',
    'cihaz',
    'cihazi',
    'cep',
    'cikmis',
    'ev',
    'icin',
    'iphone',
    'oda',
    'orijinal',
    'phone',
    'spor',
    'telefon',
    'uyumlu',
    've',
    'yurt',
]);

const EXACT_ONLY_QUERY_TOKENS = new Set([
    'bej',
    'beyaz',
    'gri',
    'kahverengi',
    'kirmizi',
    'lacivert',
    'mavi',
    'mor',
    'pembe',
    'sari',
    'siyah',
    'turuncu',
    'yesil',
]);

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
        const normalizedGroup = [...new Set(group.flatMap((term) => {
            const phrase = normalizeSearchText(term);
            const tokens = tokenizeSearch(term).filter((token) => token.length > 1);

            return [phrase, ...tokens].filter((item) => item.length > 1);
        }))];

        normalizedGroup.forEach((term) => {
            map[term] = [...new Set([...(map[term] || []), ...normalizedGroup.filter((item) => item !== term)])];
        });
    });

    return map;
};

export const SEARCH_SYNONYMS = buildSynonymMap();

export const getCanonicalSearchText = (value) => tokenizeSearch(value).join(' ');

const getEffectiveQueryTokens = (value) => {
    const tokens = tokenizeSearch(value);

    if (tokens.length <= 1) return tokens;

    const requiredTokens = tokens.filter((token) => !OPTIONAL_QUERY_TOKENS.has(token));
    return requiredTokens.length > 0 ? requiredTokens : tokens;
};

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
        key.length > 4 && tokenMatchesWord(token, key, { allowTypo: true })
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
    const effectiveCanonical = getEffectiveQueryTokens(value).join(' ');
    const synonymTerms = getEffectiveQueryTokens(value)
        .flatMap((token) => {
            const synonymKey = getSynonymKeyForToken(token);
            return synonymKey ? SEARCH_SYNONYMS[synonymKey] : [];
        })
        .map((term) => term.trim())
        .filter(Boolean);

    return [...new Set([original, canonical, effectiveCanonical, ...synonymTerms].filter(Boolean))];
};

const normalizedField = (value = '') => normalizeSearchText(value);

export const getSearchScore = (item, query) => {
    const queryTokens = getEffectiveQueryTokens(query);
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
            const allowOriginalTypo = isOriginalToken && !EXACT_ONLY_QUERY_TOKENS.has(queryToken);

            if (titleTokens.some((word) => tokenMatchesWord(alternative, word, { allowTypo: allowOriginalTypo }))) {
                score += isOriginalToken ? 80 : 55;
                return true;
            }

            if (descriptionTokens.some((word) => tokenMatchesWord(alternative, word, { allowTypo: allowOriginalTypo }))) {
                score += isOriginalToken ? 55 : 35;
                return true;
            }

            if (categoryTokens.some((word) => tokenMatchesWord(alternative, word, { allowTypo: allowOriginalTypo }))) {
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
