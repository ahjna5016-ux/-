export type WeatherKind =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'fog';

export interface CityWeatherData {
  temperatureC: number;
  feelsLikeC: number;
  minTempC: number | null;
  maxTempC: number | null;
  humidityPercent: number | null;
  windSpeedKmh: number | null;
  precipitationMm: number;
  conditionText: string;
  weatherKind: WeatherKind;
  outfitTip: string;
  source: 'google_weather' | 'open_meteo';
  fetchedAt: number;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const CACHE_TTL_MS = 15 * 60 * 1000;
const weatherCache = new Map<string, CityWeatherData>();

export function buildOutfitTip(params: {
  feelsLikeC: number;
  precipitationMm: number;
  windSpeedKmh: number | null;
  weatherKind: WeatherKind;
}): string {
  const { feelsLikeC, precipitationMm, windSpeedKmh, weatherKind } = params;

  let base = '';
  if (feelsLikeC <= 0) {
    base = '두꺼운 롱패딩·기모 이너·장갑·목도리·방한모자 필수';
  } else if (feelsLikeC <= 6) {
    base = '겨울 패딩·울 코트·니트 겹쳐 입기·목도리 추천';
  } else if (feelsLikeC <= 12) {
    base = '경량 패딩 또는 도톰한 자켓·가디건 겹쳐 입기';
  } else if (feelsLikeC <= 18) {
    base = '트렌치코트·바람막이·긴팔 니트 추천';
  } else {
    base = '가벼운 긴팔 또는 얇은 겉옷 챙기기';
  }

  const extras: string[] = [];
  if (weatherKind === 'snow' || (feelsLikeC <= 2 && precipitationMm > 0)) {
    extras.push('미끄럼 방지 신발');
  } else if (weatherKind === 'rain' || weatherKind === 'storm' || precipitationMm >= 0.3) {
    extras.push('접이식 우산·방수 겉옷');
  }
  if ((windSpeedKmh ?? 0) >= 22) {
    extras.push('바람막이 유의');
  }

  return extras.length > 0 ? `${base} (${extras.join(', ')})` : base;
}

function mapGoogleWeatherType(type?: string): { kind: WeatherKind; koText: string } {
  const t = (type || '').toUpperCase();
  if (t.includes('THUNDER') || t.includes('STORM')) return { kind: 'storm', koText: '천둥·번개' };
  if (t.includes('SNOW') || t.includes('SLEET') || t.includes('BLIZZARD') || t.includes('ICE')) {
    return { kind: 'snow', koText: '눈' };
  }
  if (t.includes('RAIN') || t.includes('SHOWER') || t.includes('DRIZZLE')) {
    return { kind: 'rain', koText: '비' };
  }
  if (t.includes('FOG') || t.includes('MIST') || t.includes('HAZE')) {
    return { kind: 'fog', koText: '안개' };
  }
  if (t.includes('PARTLY') || t.includes('MOSTLY_CLEAR') || t.includes('FEW_CLOUDS')) {
    return { kind: 'partly_cloudy', koText: '구름 조금' };
  }
  if (t.includes('CLOUD') || t.includes('OVERCAST')) {
    return { kind: 'cloudy', koText: '흐림' };
  }
  return { kind: 'clear', koText: '맑음' };
}

function mapWmoWeatherCode(code: number): { kind: WeatherKind; koText: string } {
  if (code === 0) return { kind: 'clear', koText: '맑음' };
  if (code === 1 || code === 2) return { kind: 'partly_cloudy', koText: '구름 조금' };
  if (code === 3) return { kind: 'cloudy', koText: '흐림' };
  if (code === 45 || code === 48) return { kind: 'fog', koText: '안개' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { kind: 'rain', koText: '비' };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { kind: 'snow', koText: '눈' };
  }
  if (code >= 95) return { kind: 'storm', koText: '뇌우' };
  return { kind: 'partly_cloudy', koText: '구름 조금' };
}

async function fetchFromGoogleWeather(lat: number, lng: number): Promise<CityWeatherData> {
  const url = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
  url.searchParams.set('location.latitude', lat.toFixed(4));
  url.searchParams.set('location.longitude', lng.toFixed(4));
  url.searchParams.set('unitsSystem', 'METRIC');
  url.searchParams.set('languageCode', 'ko');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
    },
  });

  if (response.status === 429) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    throw new Error('RESOURCE_EXHAUSTED');
  }

  if (!response.ok) {
    throw new Error(`Google Weather HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    weatherCondition?: { type?: string; description?: { text?: string } };
    temperature?: { degrees?: number };
    feelsLikeTemperature?: { degrees?: number };
    relativeHumidity?: number;
    wind?: { speed?: { value?: number } };
    precipitation?: { qpf?: { quantity?: number } };
    currentConditionsHistory?: {
      minTemperature?: { degrees?: number };
      maxTemperature?: { degrees?: number };
    };
  };

  if (typeof data.temperature?.degrees !== 'number') {
    throw new Error('Invalid Google Weather payload');
  }

  const mapped = mapGoogleWeatherType(data.weatherCondition?.type);
  const temperatureC = Math.round(data.temperature.degrees);
  const feelsLikeC = Math.round(data.feelsLikeTemperature?.degrees ?? data.temperature.degrees);
  const precipitationMm = Number((data.precipitation?.qpf?.quantity ?? 0).toFixed(1));
  const windSpeedKmh =
    typeof data.wind?.speed?.value === 'number' ? Math.round(data.wind.speed.value) : null;

  return {
    temperatureC,
    feelsLikeC,
    minTempC:
      typeof data.currentConditionsHistory?.minTemperature?.degrees === 'number'
        ? Math.round(data.currentConditionsHistory.minTemperature.degrees)
        : null,
    maxTempC:
      typeof data.currentConditionsHistory?.maxTemperature?.degrees === 'number'
        ? Math.round(data.currentConditionsHistory.maxTemperature.degrees)
        : null,
    humidityPercent:
      typeof data.relativeHumidity === 'number' ? Math.round(data.relativeHumidity) : null,
    windSpeedKmh,
    precipitationMm,
    conditionText: data.weatherCondition?.description?.text || mapped.koText,
    weatherKind: mapped.kind,
    outfitTip: buildOutfitTip({
      feelsLikeC,
      precipitationMm,
      windSpeedKmh,
      weatherKind: mapped.kind,
    }),
    source: 'google_weather',
    fetchedAt: Date.now(),
  };
}

async function fetchFromOpenMeteo(lat: number, lng: number): Promise<CityWeatherData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lng.toFixed(4));
  url.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m'
  );
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '1');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Open-Meteo HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    current?: {
      temperature_2m?: number;
      apparent_temperature?: number;
      relative_humidity_2m?: number;
      precipitation?: number;
      weather_code?: number;
      wind_speed_10m?: number;
    };
    daily?: {
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
    };
  };

  const cur = data.current;
  if (!cur || typeof cur.temperature_2m !== 'number') {
    throw new Error('Invalid Open-Meteo payload');
  }

  const mapped = mapWmoWeatherCode(cur.weather_code ?? 0);
  const temperatureC = Math.round(cur.temperature_2m);
  const feelsLikeC = Math.round(cur.apparent_temperature ?? cur.temperature_2m);
  const precipitationMm = Number((cur.precipitation ?? 0).toFixed(1));
  const windSpeedKmh =
    typeof cur.wind_speed_10m === 'number' ? Math.round(cur.wind_speed_10m) : null;

  return {
    temperatureC,
    feelsLikeC,
    minTempC:
      typeof data.daily?.temperature_2m_min?.[0] === 'number'
        ? Math.round(data.daily.temperature_2m_min[0])
        : null,
    maxTempC:
      typeof data.daily?.temperature_2m_max?.[0] === 'number'
        ? Math.round(data.daily.temperature_2m_max[0])
        : null,
    humidityPercent:
      typeof cur.relative_humidity_2m === 'number' ? Math.round(cur.relative_humidity_2m) : null,
    windSpeedKmh,
    precipitationMm,
    conditionText: mapped.koText,
    weatherKind: mapped.kind,
    outfitTip: buildOutfitTip({
      feelsLikeC,
      precipitationMm,
      windSpeedKmh,
      weatherKind: mapped.kind,
    }),
    source: 'open_meteo',
    fetchedAt: Date.now(),
  };
}

export async function getCityLiveWeather(lat: number, lng: number): Promise<CityWeatherData> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  let result: CityWeatherData;
  if (GOOGLE_MAPS_API_KEY) {
    try {
      result = await fetchFromGoogleWeather(lat, lng);
    } catch {
      result = await fetchFromOpenMeteo(lat, lng);
    }
  } else {
    result = await fetchFromOpenMeteo(lat, lng);
  }

  weatherCache.set(key, result);
  return result;
}
