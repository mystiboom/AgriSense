
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Sprout,
  TrendingUp,
} from "lucide-react";
import {
  getCropObservations,
  getStressSummary,
  type CropObservation,
  type StressSummary,
} from "../services/api";

const formatValue = (value: number | null | undefined, digits = 3) =>
  value == null ? "N/A" : value.toFixed(digits);

const statusStyle = (level: string | null | undefined) => {
  switch (level?.toLowerCase()) {
    case "severe":
      return "bg-red-50 text-red-700";
    case "high":
      return "bg-orange-50 text-orange-700";
    case "moderate":
      return "bg-yellow-50 text-yellow-700";
    default:
      return "bg-green-50 text-green-700";
  }
};

export default function FieldMonitoring() {
  const [fields, setFields] = useState<StressSummary[]>([]);
  const [observations, setObservations] = useState<CropObservation[]>([]);
  const [selectedField, setSelectedField] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryData, observationData] = await Promise.all([
        getStressSummary(),
        getCropObservations(),
      ]);

      setFields(
        summaryData.filter(
          (field) => field.region_level.toLowerCase() === "field"
        )
      );
      setObservations(observationData);
    } catch (err) {
      console.error("Field monitoring error:", err);
      setError("Unable to load field observations. Check the backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredObservations = useMemo(() => {
    return observations
      .filter(
        (item) =>
          selectedField === "all" || item.region_id === selectedField
      )
      .sort(
        (a, b) =>
          new Date(b.observed_at).getTime() -
          new Date(a.observed_at).getTime()
      );
  }, [observations, selectedField]);

  const latestByField = useMemo(() => {
    const latest = new Map<number, CropObservation>();

    [...observations]
      .sort(
        (a, b) =>
          new Date(b.observed_at).getTime() -
          new Date(a.observed_at).getTime()
      )
      .forEach((item) => {
        if (!latest.has(item.region_id)) {
          latest.set(item.region_id, item);
        }
      });

    return Array.from(latest.values());
  }, [observations]);

  const selectedSummary =
    selectedField === "all"
      ? null
      : fields.find((field) => field.region_id === selectedField);

  const selectedLatest =
    selectedField === "all"
      ? null
      : latestByField.find((item) => item.region_id === selectedField);

  const stats = [
    {
      label: "Monitored Fields",
      value: fields.length,
      icon: Sprout,
      color: "text-green-700",
      bg: "bg-green-50",
    },
    {
      label: "Total Observations",
      value: filteredObservations.length,
      icon: Activity,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Severe Stress Fields",
      value: fields.filter(
        (field) => field.latest_stress_level?.toLowerCase() === "severe"
      ).length,
      icon: AlertTriangle,
      color: "text-red-700",
      bg: "bg-red-50",
    },
    {
      label: "Latest Records",
      value: latestByField.length,
      icon: TrendingUp,
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
  ];

  if (loading) {
    return (
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-[#183729]">Field Monitoring</h1>
        <p className="mt-4 text-gray-500">Loading field observations...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-[#183729]">Field Monitoring</h1>
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 flex items-center gap-2 text-sm font-semibold text-red-700"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-w-0 flex-1 p-5 md:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">
            Agricultural Intelligence / Field Monitoring
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#183729]">
            Field Monitoring
          </h1>
          <p className="mt-1 text-gray-500">
            Monitor crop health and stress across individual fields.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <Icon size={20} className={stat.color} />
                </div>
              </div>
              <h2 className="mt-4 text-3xl font-bold text-[#183729]">
                {stat.value}
              </h2>
            </div>
          );
        })}
      </div>

      <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#183729]">
              Individual Field Health
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Latest available crop-health readings.
            </p>
          </div>

          <select
            value={selectedField}
            onChange={(e) =>
              setSelectedField(
                e.target.value === "all" ? "all" : Number(e.target.value)
              )
            }
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-green-600"
          >
            <option value="all">All Fields</option>
            {fields.map((field) => (
              <option key={field.region_id} value={field.region_id}>
                {field.region_name}
              </option>
            ))}
          </select>
        </div>

        {selectedField === "all" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {latestByField.map((item) => (
              <button
                key={item.region_id}
                onClick={() => setSelectedField(item.region_id)}
                className="rounded-xl border border-gray-100 p-5 text-left transition hover:border-green-300 hover:bg-green-50/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-[#183729]">
                    {item.region_name}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(item.stress_level)}`}
                  >
                    {item.stress_level}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">NDVI</p>
                    <p className="mt-1 text-lg font-bold text-[#183729]">
                      {formatValue(item.ndvi)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">EVI</p>
                    <p className="mt-1 text-lg font-bold text-[#183729]">
                      {formatValue(item.evi)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Stress</p>
                    <p className="mt-1 text-lg font-bold text-[#183729]">
                      {formatValue(item.stress_score, 1)}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs text-gray-400">
                  Recorded: {new Date(item.observed_at).toLocaleString()}
                </p>
                <p className="mt-3 text-xs font-semibold text-green-700">
                  View field history →
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-sm text-green-800">Latest NDVI</p>
                <p className="mt-2 text-2xl font-bold text-[#183729]">
                  {formatValue(selectedLatest?.ndvi)}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-sm text-blue-800">Latest EVI</p>
                <p className="mt-2 text-2xl font-bold text-[#183729]">
                  {formatValue(selectedLatest?.evi)}
                </p>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-sm text-red-800">Stress Score</p>
                <p className="mt-2 text-2xl font-bold text-[#183729]">
                  {formatValue(selectedLatest?.stress_score, 1)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#183729]">
                  {selectedSummary?.region_name ?? selectedLatest?.region_name}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedSummary?.latest_stress_level ?? "Status unavailable"}
                </p>
              </div>
              <button
                onClick={() => setSelectedField("all")}
                className="rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                ← Back to all fields
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-[#183729]">
            Observation History
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Historical crop-health measurements from the database.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b text-xs uppercase text-gray-400">
                <th className="pb-4">Field</th>
                <th className="pb-4">Crop</th>
                <th className="pb-4">Date</th>
                <th className="pb-4">NDVI</th>
                <th className="pb-4">EVI</th>
                <th className="pb-4">Stress</th>
                <th className="pb-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredObservations.map((item) => (
                <tr
                  key={item.observation_id}
                  className="border-b last:border-0"
                >
                  <td className="py-4 font-semibold text-[#183729]">
                    {item.region_name}
                  </td>
                  <td className="py-4">{item.crop_type}</td>
                  <td className="py-4 text-sm text-gray-500">
                    {new Date(item.observed_at).toLocaleDateString()}
                  </td>
                  <td className="py-4">{formatValue(item.ndvi)}</td>
                  <td className="py-4">{formatValue(item.evi)}</td>
                  <td className="py-4">{formatValue(item.stress_score, 1)}</td>
                  <td className="py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(item.stress_level)}`}
                    >
                      {item.stress_level}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredObservations.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No observations found for this field.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
