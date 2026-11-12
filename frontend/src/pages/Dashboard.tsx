import CropHealthChart from "../components/CropHealthChart";
import { useEffect, useState } from "react";
import {
  Sprout,
  Activity,
  AlertTriangle,
  MapPin,
  RefreshCw,
} from "lucide-react";
import {
  getStressSummary,
  type StressSummary,
} from "../services/api";

export default function Dashboard() {
  const [fields, setFields] = useState<StressSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getStressSummary();

      const fieldData = data.filter(
        (item) => item.region_level.toLowerCase() === "field"
      );

      setFields(fieldData);
    } catch (err) {
      console.error("Dashboard API error:", err);
      setError(
        "Unable to load dashboard data. Please check whether the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const validNdvi = fields
    .map((field) => field.avg_ndvi)
    .filter((value): value is number => value !== null);

  const validStress = fields
    .map((field) => field.latest_stress)
    .filter((value): value is number => value !== null);

  const average = (values: number[]) =>
    values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;

  const averageNdvi = average(validNdvi);
  const averageStress = average(validStress);

  const severeCount = fields.filter(
    (field) =>
      field.latest_stress_level?.toLowerCase() === "severe"
  ).length;

  const stats = [
    {
      title: "Total Fields",
      value: String(fields.length).padStart(2, "0"),
      subtitle: "Across monitored blocks",
      icon: MapPin,
    },
    {
      title: "Average NDVI",
      value: averageNdvi?.toFixed(4) ?? "N/A",
      subtitle: "Latest field averages",
      icon: Sprout,
    },
    {
      title: "Severe Stress",
      value: String(severeCount).padStart(2, "0"),
      subtitle: "Fields requiring attention",
      icon: AlertTriangle,
    },
    {
      title: "Average Stress",
      value: averageStress?.toFixed(2) ?? "N/A",
      subtitle: "Latest stress score",
      icon: Activity,
    },
  ];

  if (loading) {
    return (
      <main className="flex-1 p-8">
        <h2 className="text-3xl font-bold text-[#183729]">
          Dashboard Overview
        </h2>
        <p className="text-gray-500 mt-3">
          Loading agricultural data...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 p-8">
        <h2 className="text-3xl font-bold text-[#183729]">
          Dashboard Overview
        </h2>

        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-red-700">{error}</p>

          <button
            onClick={fetchDashboardData}
            className="mt-4 flex items-center gap-2 text-sm font-semibold text-red-700"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8">
      <div className="flex justify-between items-center mb-9">
        <div>
          <p className="text-sm text-gray-500">
            Agricultural Intelligence / Overview
          </p>

          <h2 className="text-3xl font-bold text-[#183729] mt-2">
            Dashboard Overview
          </h2>

          <p className="text-gray-500 mt-1">
            Monitor crop health and agricultural conditions.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 bg-white border rounded-xl px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <div className="bg-white border rounded-xl px-4 py-3 text-sm text-gray-600">
            <span className="text-green-600">●</span> System Operational
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
            >
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {stat.title}
                </p>

                <div className="bg-[#EEF5E8] p-2 rounded-lg">
                  <Icon className="text-[#477B39]" size={20} />
                </div>
              </div>

              <h3 className="text-3xl font-bold text-[#183729] mt-5">
                {stat.value}
              </h3>

              <p className="text-xs text-gray-400 mt-2">
                {stat.subtitle}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-lg text-[#183729]">
              Field Health Monitoring
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Latest crop health observations
            </p>
          </div>

          <span className="text-xs text-gray-400">
            Live database data
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase text-gray-400 border-b">
                <th className="pb-4">Field</th>
                <th className="pb-4">NDVI</th>
                <th className="pb-4">Stress Score</th>
                <th className="pb-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {fields.map((field) => (
                <tr
                  key={field.region_id}
                  className="border-b last:border-0"
                >
                  <td className="py-5 font-semibold text-[#183729]">
                    {field.region_name}
                  </td>

                  <td className="py-5 font-medium">
                    {field.avg_ndvi?.toFixed(4) ?? "N/A"}
                  </td>

                  <td className="py-5">
                    {field.latest_stress ?? "N/A"}
                  </td>

                  <td className="py-5">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        field.latest_stress_level?.toLowerCase() ===
                        "severe"
                          ? "bg-red-50 text-red-700"
                          : field.latest_stress_level?.toLowerCase() ===
                            "high"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {field.latest_stress_level ?? "Unknown"}
                    </span>
                  </td>
                </tr>
              ))}

              {fields.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-gray-400"
                  >
                    No field data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <CropHealthChart />
    </main>
  );
}
