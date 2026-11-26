import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Search, Loader2 } from 'lucide-react';

export interface SelectedPlaceResult {
  placeName: string;
  address: string;
  placeId: string;
  lat: number;
  lng: number;
  city?: string;
}

interface PlaceAutocompleteInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace: (place: SelectedPlaceResult) => void;
  placeholder?: string;
}

const HAS_MAPS_KEY = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

const PlacesPoweredInput: React.FC<PlaceAutocompleteInputProps> = ({
  value,
  onChangeText,
  onSelectPlace,
  placeholder,
}) => {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!placesLib) return;
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        setIsSearching(true);
        const res = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          language: 'ko',
        });
        setSuggestions(res.suggestions || []);
        setIsOpen((res.suggestions || []).length > 0);
      } catch (err) {
        console.warn('Autocomplete suggestion failed:', err);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [placesLib, value]);

  const handleChooseSuggestion = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;

    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents'],
      });

      const loc = place.location;
      const lat = loc ? loc.lat() : 48.8566;
      const lng = loc ? loc.lng() : 2.3522;
      const placeName = place.displayName || prediction.text.text;
      const address = place.formattedAddress || '';

      let city = '';
      if (place.addressComponents) {
        const locality = place.addressComponents.find(
          (c: google.maps.places.AddressComponent) =>
            c.types.includes('locality') || c.types.includes('administrative_area_level_1')
        );
        if (locality?.longText) {
          city = locality.longText;
        }
      }

      onChangeText(placeName);
      onSelectPlace({
        placeName,
        address,
        placeId: place.id || '',
        lat,
        lng,
        city,
      });

      sessionTokenRef.current = null;
      setSuggestions([]);
      setIsOpen(false);
    } catch (err) {
      console.warn('Place fetchFields failed:', err);
      onChangeText(prediction.text.text);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 min-h-[44px]"
        />
        {isSearching && (
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-3.5" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
          {suggestions.map((suggestion, idx) => {
            const text = suggestion.placePrediction?.text.text || '';
            return (
              <li key={`${text}-${idx}`}>
                <button
                  type="button"
                  onClick={() => void handleChooseSuggestion(suggestion)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-start gap-2.5 text-sm text-slate-800 min-h-[44px]"
                >
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export const PlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = (props) => {
  const placeholder =
    props.placeholder || '유럽 장소나 식당 이름을 검색하세요 (예: 에펠탑, 지올리띠)';

  if (!HAS_MAPS_KEY) {
    return (
      <div className="relative flex items-center">
        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={props.value}
          onChange={(e) => props.onChangeText(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 min-h-[44px]"
        />
      </div>
    );
  }

  return <PlacesPoweredInput {...props} placeholder={placeholder} />;
};
