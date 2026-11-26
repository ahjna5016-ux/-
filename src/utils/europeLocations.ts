export type CountryCode =
  | 'FR'
  | 'CH'
  | 'IT'
  | 'VA'
  | 'GB'
  | 'ES'
  | 'DE'
  | 'AT'
  | 'CZ'
  | 'NL'
  | 'BE'
  | 'PT'
  | 'GR'
  | 'EU';

export type CityLandmarkTheme =
  | 'paris'
  | 'swiss_alps'
  | 'lucerne'
  | 'florence'
  | 'rome'
  | 'europe';

export interface CountryCityInfo {
  country: string;
  countryCode: CountryCode;
  flag: string;
  city: string;
  cityTheme: CityLandmarkTheme;
  cityTagline: string;
}

interface CountryRule {
  country: string;
  countryCode: CountryCode;
  flag: string;
  keywords: string[];
}

const COUNTRY_RULES: CountryRule[] = [
  {
    country: '프랑스',
    countryCode: 'FR',
    flag: '🇫🇷',
    keywords: [
      '프랑스',
      'france',
      '파리',
      'paris',
      '베르사유',
      'versailles',
      'roissy',
      '리옹',
      'lyon',
      '니스',
      'nice',
      '마르세유',
      'marseille',
      '스트라스부르',
      'strasbourg',
      '콜마르',
      'colmar',
      '몽생미셸',
      'mont-saint-michel',
      '샤모니',
      'chamonix',
    ],
  },
  {
    country: '스위스',
    countryCode: 'CH',
    flag: '🇨🇭',
    keywords: [
      '스위스',
      'switzerland',
      'schweiz',
      'suisse',
      '인터라켄',
      'interlaken',
      '그린델발트',
      'grindelwald',
      '루체른',
      'luzern',
      'lucerne',
      '융프라우',
      'jungfrau',
      '라우터브루넨',
      'lauterbrunnen',
      '체르마트',
      'zermatt',
      '취리히',
      'zurich',
      'zürich',
      '베른',
      'bern',
      '제네바',
      'geneva',
      'genève',
      '몽트뢰',
      'montreux',
      '바젤',
      'basel',
    ],
  },
  {
    country: '이탈리아',
    countryCode: 'IT',
    flag: '🇮🇹',
    keywords: [
      '이탈리아',
      'italy',
      'italia',
      '로마',
      'roma',
      'rome',
      '피렌체',
      'firenze',
      'florence',
      '베네치아',
      '베니스',
      'venezia',
      'venice',
      '밀라노',
      'milano',
      'milan',
      '나폴리',
      'napoli',
      'naples',
      '피사',
      'pisa',
      '베로나',
      'verona',
      '볼로냐',
      'bologna',
      '아말피',
      'amalfi',
      '소렌토',
      'sorrento',
      'fiumicino',
    ],
  },
  {
    country: '바티칸',
    countryCode: 'VA',
    flag: '🇻🇦',
    keywords: ['바티칸', 'vatican', 'vaticano'],
  },
  {
    country: '영국',
    countryCode: 'GB',
    flag: '🇬🇧',
    keywords: ['영국', 'united kingdom', 'uk', 'england', '런던', 'london', '에든버러', 'edinburgh', '옥스퍼드', 'oxford'],
  },
  {
    country: '스페인',
    countryCode: 'ES',
    flag: '🇪🇸',
    keywords: ['스페인', 'spain', 'españa', '바르셀로나', 'barcelona', '마드리드', 'madrid', '세비야', 'sevilla', 'seville', '그라나다', 'granada'],
  },
  {
    country: '독일',
    countryCode: 'DE',
    flag: '🇩🇪',
    keywords: ['독일', 'germany', 'deutschland', '뮌헨', 'munich', 'münchen', '프랑크푸르트', 'frankfurt', '베를린', 'berlin', '하이델베르크', 'heidelberg'],
  },
  {
    country: '오스트리아',
    countryCode: 'AT',
    flag: '🇦🇹',
    keywords: ['오스트리아', 'austria', 'österreich', '빈', '비엔나', 'vienna', 'wien', '잘츠부르크', 'salzburg', '할슈타트', 'hallstatt'],
  },
  {
    country: '체코',
    countryCode: 'CZ',
    flag: '🇨🇿',
    keywords: ['체코', 'czech', '프라하', 'prague', 'praha', '체스키', 'cesky'],
  },
  {
    country: '네덜란드',
    countryCode: 'NL',
    flag: '🇳🇱',
    keywords: ['네덜란드', 'netherlands', '암스테르담', 'amsterdam', '로테르담', 'rotterdam'],
  },
  {
    country: '벨기에',
    countryCode: 'BE',
    flag: '🇧🇪',
    keywords: ['벨기에', 'belgium', '브뤼셀', 'brussels', '브뤼헤', 'bruges'],
  },
  {
    country: '포르투갈',
    countryCode: 'PT',
    flag: '🇵🇹',
    keywords: ['포르투갈', 'portugal', '리스본', 'lisbon', 'lisboa', '포르투', 'porto'],
  },
  {
    country: '그리스',
    countryCode: 'GR',
    flag: '🇬🇷',
    keywords: ['그리스', 'greece', '아테네', 'athens', '산토리니', 'santorini'],
  },
];

function matchRule(text: string): CountryRule | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return null;
  for (const rule of COUNTRY_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      return rule;
    }
  }
  return null;
}

function resolveCityTheme(
  city: string,
  address: string | undefined,
  countryCode: CountryCode
): { cityTheme: CityLandmarkTheme; cityTagline: string } {
  const combined = `${city} ${address || ''}`.toLowerCase();
  if (combined.includes('파리') || combined.includes('paris') || combined.includes('베르사유') || combined.includes('versailles')) {
    return { cityTheme: 'paris', cityTagline: '에펠탑·세느강' };
  }
  if (combined.includes('루체른') || combined.includes('luzern') || combined.includes('lucerne')) {
    return { cityTheme: 'lucerne', cityTagline: '카펠교·호수' };
  }
  if (
    combined.includes('인터라켄') ||
    combined.includes('interlaken') ||
    combined.includes('그린델발트') ||
    combined.includes('grindelwald') ||
    combined.includes('융프라우') ||
    countryCode === 'CH'
  ) {
    return { cityTheme: 'swiss_alps', cityTagline: '알프스 설산' };
  }
  if (combined.includes('피렌체') || combined.includes('firenze') || combined.includes('florence')) {
    return { cityTheme: 'florence', cityTagline: '두오모·르네상스' };
  }
  if (combined.includes('로마') || combined.includes('roma') || combined.includes('rome') || combined.includes('바티칸')) {
    return { cityTheme: 'rome', cityTagline: '콜로세움·고대유적' };
  }
  if (countryCode === 'FR') return { cityTheme: 'paris', cityTagline: '프랑스 도시' };
  if (countryCode === 'IT' || countryCode === 'VA') return { cityTheme: 'rome', cityTagline: '이탈리아 도시' };
  return { cityTheme: 'europe', cityTagline: '유럽 여행지' };
}

export function getCountryAndCityInfo(city: string, address?: string): CountryCityInfo {
  const cleanCity = city.trim() || '유럽';
  const rule = matchRule(cleanCity) || (address ? matchRule(address) : null);
  const countryCode: CountryCode = rule ? rule.countryCode : 'EU';
  const { cityTheme, cityTagline } = resolveCityTheme(cleanCity, address, countryCode);

  if (rule) {
    return {
      country: rule.country,
      countryCode: rule.countryCode,
      flag: rule.flag,
      city: cleanCity,
      cityTheme,
      cityTagline,
    };
  }

  return {
    country: '유럽',
    countryCode: 'EU',
    flag: '🇪🇺',
    city: cleanCity,
    cityTheme,
    cityTagline,
  };
}
