
import { useEffect, useState } from "react";
import { RefreshCw, Droplets, Thermometer, Wind, Sprout } from "lucide-react";
import api from "../services/api";

interface SoilRecord {
  soil_id: number;
  region_id: number;
  region_name: string;
  recorded_at: string;
  soil_moisture_pct: number | null;
  soil_ph: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
}

interface WeatherRecord {
  weather_id: number;
  region_id: number;
  region_name: string;
  recorded_at: string;
  rainfall_mm: number | null;
  temperature_c: number | null;
  humidity_pct: number | null;
  wind_speed: number | null;
}

const value = (n: number | null | undefined, digits = 2) =>
  n == null ? "N/A" : Number(n).toFixed(digits);

export default function SoilWeather() {
  const [soil, setSoil] = useState<SoilRecord[]>([]);
  const [weather, setWeather] = useState<WeatherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [soilResponse, weatherResponse] = await Promise.all([
        api.get<SoilRecord[]>("/soil", { params: { limit: 200 } }),
        api.get<WeatherRecord[]>("/weather", { params: { limit: 200 } }),
      ]);

      setSoil(soilResponse.data);
      setWeather(weatherResponse.data);
    } catch (err) {
      console.error("Soil/weather API error:", err);
      setError("Unable to load soil and weather data. Check the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const latestSoil = Array.from(
    new Map(soil.map((item) => [item.region_id, item])).values()
  );

  const latestWeather = Array.from(
    new Map(weather.map((item) => [item.region_id, item])).values()
  );

  if (loading) {
    return (
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-[#183729]">Soil & Weather</h1>
        <p className="mt-4 text-gray-500">Loading environmental data...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-[#183729]">Soil & Weather</h1>
        <p className="mt-5 rounded-xl bg-red-50 p-5 text-red-700">{error}</p>
        <button onClick={loadData} className="mt-4 flex gap-2 text-sm text-red-700">
          <RefreshCw size={16} /> Retry
        </button>
      </main>
    );
  }

  return (
    <main className="min-w-0 flex-1 p-5 md:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Agricultural Intelligence / Environment</p>
          <h1 className="mt-2 text-3xl font-bold text-[#183729]">Soil & Weather</h1>
          <p className="mt-1 text-gray-500">
            Track soil nutrients, moisture and local weather conditions.
          </p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>

      <section className="mb-8">
        <div className="mb-5 flex items-center gap-2">
          <Sprout className="text-green-700" />
          <h2 className="text-xl font-bold text-[#183729]">Latest Soil Conditions</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {latestSoil.map((item) => (
            <div key={item.region_id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex justify-between">
                <h3 className="font-bold text-[#183729]">{item.region_name}</h3>
                <span className="text-xs text-gray-400">
                  {new Date(item.recorded_at).toLocaleDateString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                {[
                  ["Soil Moisture", value(item.soil_moisture_pct) + (item.soil_moisture_pct == null ? "" : "%")],
                  ["Soil pH", value(item.soil_ph)],
                  ["Nitrogen", value(item.nitrogen)],
                  ["Phosphorus", value(item.phosphorus)],
                  ["Potassium", value(item.potassium)],
                ].map(([label, reading]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="mt-1 text-xl font-bold text-[#183729]">{reading}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center gap-2">
          <Thermometer className="text-orange-600" />
          <h2 className="text-xl font-bold text-[#183729]">Latest Weather Conditions</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {latestWeather.map((item) => (
            <div key={item.region_id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex justify-between">
                <h3 className="font-bold text-[#183729]">{item.region_name}</h3>
                <span className="text-xs text-gray-400">
                  {new Date(item.recorded_at).toLocaleDateString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                <div>
                  <Thermometer size={18} className="mb-2 text-orange-600" />
                  <p className="text-xs text-gray-400">Temperature</p>
                  <p className="mt-1 text-xl font-bold text-[#183729]">
                    {value(item.temperature_c)}°C
                  </p>
                </div>
                <div>
                  <Droplets size={18} className="mb-2 text-blue-600" />
                  <p className="text-xs text-gray-400">Rainfall</p>
                  <p className="mt-1 text-xl font-bold text-[#183729]">
                    {value(item.rainfall_mm)} mm
                  </p>
                </div>
                <div>
                  <Droplets size={18} className="mb-2 text-cyan-600" />
                  <p className="text-xs text-gray-400">Humidity</p>
                  <p className="mt-1 text-xl font-bold text-[#183729]">
                    {value(item.humidity_pct)}%
                  </p>
                </div>
                <div>
                  <Wind size={18} className="mb-2 text-gray-600" />
                  <p className="text-xs text-gray-400">Wind Speed</p>
                  <p className="mt-1 text-xl font-bold text-[#183729]">
                    {value(item.wind_speed)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-bold text-[#183729]">Soil Observation History</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left">
            <thead>
              <tr className="border-b text-xs uppercase text-gray-400">
                <th className="pb-4">Field</th>
                <th className="pb-4">Date</th>
                <th className="pb-4">Moisture</th>
                <th className="pb-4">pH</th>
                <th className="pb-4">Nitrogen</th>
                <th className="pb-4">Phosphorus</th>
                <th className="pb-4">Potassium</th>
              </tr>
            </thead>
            <tbody>
              {soil.map((item) => (
                <tr key={item.soil_id} className="border-b last:border-0">
                  <td className="py-4 font-semibold">{item.region_name}</td>
                  <td className="py-4 text-sm text-gray-500">
                    {new Date(item.recorded_at).toLocaleDateString()}
                  </td>
                  <td className="py-4">{value(item.soil_moisture_pct)}</td>
                  <td className="py-4">{value(item.soil_ph)}</td>
                  <td className="py-4">{value(item.nitrogen)}</td>
                  <td className="py-4">{value(item.phosphorus)}</td>
                  <td className="py-4">{value(item.potassium)}</td>
                </tr>
              ))}
              {soil.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No soil records available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
