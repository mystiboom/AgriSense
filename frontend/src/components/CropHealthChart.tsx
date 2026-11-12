
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  getCropObservations,
  type CropObservation,
} from "../services/api";

export default function CropHealthChart() {
  const [observations, setObservations] = useState<CropObservation[]>([]);
  const [selectedField, setSelectedField] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchObservations = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getCropObservations();

        setObservations(data);

        const fieldNames = [...new Set(
          data.map((item) => item.region_name)
        )];

        if (fieldNames.length > 0) {
          setSelectedField((current) =>
            current && fieldNames.includes(current)
              ? current
              : fieldNames[0]
          );
        }
      } catch (err) {
        console.error("NDVI chart error:", err);
        setError("Unable to load crop observation history.");
      } finally {
        setLoading(false);
      }
    };

    fetchObservations();
  }, []);

  const fieldNames = useMemo(
    () => [...new Set(observations.map((item) => item.region_name))],
    [observations]
  );

  const chartData = useMemo(() => {
    return observations
      .filter((item) => item.region_name === selectedField)
      .sort(
        (a, b) =>
          new Date(a.observed_at).getTime() -
          new Date(b.observed_at).getTime()
      )
      .map((item) => ({
        date: new Date(item.observed_at).toLocaleDateString(
          "en-IN",
          { day: "numeric", month: "short" }
        ),
        ndvi: item.ndvi,
        evi: item.evi,
        stress: item.stress_score,
      }));
  }, [observations, selectedField]);

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-8">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h3 className="font-bold text-lg text-[#183729]">
            Crop Health Trends
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Historical vegetation index for the selected field
          </p>
        </div>

        <select
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value)}
          disabled={fieldNames.length === 0}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-[#183729] bg-white outline-none focus:ring-2 focus:ring-green-200"
        >
          {fieldNames.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="h-72 flex items-center justify-center text-gray-400">
          Loading NDVI history...
        </div>
      ) : error ? (
        <div className="h-72 flex items-center justify-center text-red-600">
          {error}
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-gray-400">
          No historical observations available.
        </div>
      ) : (
        <>
          <div className="flex gap-5 mb-4 text-xs text-gray-500">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#4C956C]" />
              NDVI
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E9A23B]" />
              EVI
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E8EEE8"
                />

                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#829087" }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  domain={[0, 1]}
                  tick={{ fontSize: 11, fill: "#829087" }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E8EEE8",
                    fontSize: "12px",
                  }}
                  formatter={(value, name) => [
                    Number(value).toFixed(4),
                    name,
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="ndvi"
                  name="NDVI"
                  stroke="#4C956C"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#4C956C" }}
                  activeDot={{ r: 6 }}
                />

                <Line
                  type="monotone"
                  dataKey="evi"
                  name="EVI"
                  stroke="#E9A23B"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Showing {chartData.length} observations for {selectedField}.
          </p>
        </>
      )}
    </section>
  );
}
