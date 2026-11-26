import React, { useEffect, useState } from 'react';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Shirt,
  Sun,
  Wind,
} from 'lucide-react';
import { CityWeatherData, getCityLiveWeather, WeatherKind } from '../services/weatherService';
import { getCountryAndCityInfo } from '../utils/europeLocations';
import { CountryFlagIcon } from './EuropeLocationVisuals';

interface CityWeatherWidgetProps {
  city: string;
  address?: string;
  lat: number;
  lng: number;
  dayIndex: number;
}

function renderWeatherIcon(kind: WeatherKind) {
  switch (kind) {
    case 'clear':
      return <Sun className="w-5 h-5 text-amber-500 shrink-0" />;
    case 'partly_cloudy':
      return <CloudSun className="w-5 h-5 text-amber-500 shrink-0" />;
    case 'cloudy':
      return <Cloud className="w-5 h-5 text-slate-500 shrink-0" />;
    case 'rain':
      return <CloudRain className="w-5 h-5 text-blue-600 shrink-0" />;
    case 'snow':
      return <CloudSnow className="w-5 h-5 text-sky-500 shrink-0" />;
    case 'storm':
      return <CloudLightning className="w-5 h-5 text-indigo-600 shrink-0" />;
    case 'fog':
      return <CloudFog className="w-5 h-5 text-slate-400 shrink-0" />;
  }
}

export const CityWeatherWidget: React.FC<CityWeatherWidgetProps> = ({
  city,
  address,
  lat,
  lng,
  dayIndex,
}) => {
  const [weather, setWeather] = useState<CityWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const locationInfo = getCountryAndCityInfo(city, address);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    getCityLiveWeather(lat, lng)
      .then((data) => {
        if (!cancelled) {
          setWeather(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return (
    <div className="mb-4 bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4">
      {/* Left: Active City & Weather Summary */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <CountryFlagIcon
            code={locationInfo.countryCode}
            className="w-[18px] h-[13px]"
            label={locationInfo.country}
          />
          <span>
            {locationInfo.country} · {locationInfo.city}
          </span>
          <span className="text-[11px] font-medium text-slate-400 font-mono-tabular">
            ({dayIndex}일차 기준)
          </span>
        </div>

        <span className="hidden sm:inline text-slate-200" aria-hidden="true">
          |
        </span>

        {loading ? (
          <span className="text-xs text-slate-400">실시간 날씨 불러오는 중...</span>
        ) : failed || !weather ? (
          <span className="text-xs text-slate-500">
            일시적으로 날씨를 불러오지 못했습니다 (겉옷·방한용품 준비 권장)
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <div className="inline-flex items-center gap-1.5 font-bold text-slate-900">
              {renderWeatherIcon(weather.weatherKind)}
              <span className="text-sm font-mono-tabular">{weather.temperatureC}°C</span>
              <span className="font-medium text-slate-600">{weather.conditionText}</span>
            </div>

            <span className="text-slate-500 font-mono-tabular">
              체감 {weather.feelsLikeC}°C
              {weather.minTempC !== null && weather.maxTempC !== null
                ? ` · 최저 ${weather.minTempC}° / 최고 ${weather.maxTempC}°`
                : ''}
            </span>

            <div className="inline-flex items-center gap-2.5 text-[11px] text-slate-500 font-mono-tabular">
              {weather.humidityPercent !== null && (
                <span className="inline-flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-sky-600" />
                  습도 {weather.humidityPercent}%
                </span>
              )}
              {weather.windSpeedKmh !== null && (
                <span className="inline-flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-slate-400" />
                  바람 {weather.windSpeedKmh}km/h
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Practical Outfit Guidance */}
      {weather && !loading && !failed && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 shrink-0">
          <Shirt className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span className="font-semibold">옷차림:</span>
          <span>{weather.outfitTip}</span>
        </div>
      )}
    </div>
  );
};
