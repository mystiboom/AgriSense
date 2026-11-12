
import { useEffect, useMemo, useState } from "react";
import {
  Map,
  MapPin,
  Sprout,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Activity,
} from "lucide-react";
import api from "../services/api";

interface Region {
  region_id: number;
  region_name: string;
  region_level: string;
  parent_region_id: number | null;
  parent_region?: string | null;
}

interface RegionSummary {
  region_id: number;
  region_name: string;
  region_level: string;
  avg_ndvi: number | null;
  avg_evi: number | null;
  latest_observation: string | null;
  latest_stress: number | null;
  latest_stress_level: string | null;
  avg_rainfall: number | null;
  avg_temperature: number | null;
  avg_humidity: number | null;
  avg_soil_moisture: number | null;
  avg_soil_ph: number | null;
}

const format = (value: number | null | undefined) =>
  value == null ? "N/A" : Number(value).toFixed(3);

const stressStyle = (level: string | null | undefined) => {
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

export default function RegionExplorer() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [summaries, setSummaries] = useState<RegionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [regionResponse, summaryResponse] = await Promise.all([
        api.get<Region[]>("/regions"),
        api.get<RegionSummary[]>("/stress-summary"),
      ]);

      setRegions(regionResponse.data);
      setSummaries(summaryResponse.data);
    } catch (err) {
      console.error("Region explorer error:", err);
      setError("Unable to load regional information. Please check the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedRegion = regions.find(
    (region) => region.region_id === selectedId
  );

  const childrenOf = (parentId: number | null) =>
    regions.filter((region) => region.parent_region_id === parentId);

  const getDescendants = (regionId: number): Region[] => {
    const children = childrenOf(regionId);
    return [
      ...children,
      ...children.flatMap((child) => getDescendants(child.region_id)),
    ];
  };

  const visibleRegions = useMemo(() => {
    if (selectedId === "all") return regions;

    return [
      selectedRegion!,
      ...getDescendants(selectedId),
    ].filter(Boolean);
  }, [regions, selectedId]);

  const visibleIds = new Set(visibleRegions.map((region) => region.region_id));

  const visibleSummaries = summaries.filter((summary) =>
    visibleIds.has(summary.region_id)
  );

  const fieldRegions = visibleRegions.filter(
    (region) => region.region_level.toLowerCase() === "field"
  );

  const severeCount = visibleSummaries.filter(
    (item) => item.latest_stress_level?.toLowerCase() === "severe"
  ).length;

  const averageNdvi =
    fieldRegions.length > 0
      ? fieldRegions.reduce((total, region) => {
          const summary = summaries.find(
            (item) => item.region_id === region.region_id
          );
          return total + (summary?.avg_ndvi ?? 0);
        }, 0) /
        fieldRegions.filter((region) =>
          summaries.some(
            (item) => item.region_id === region.region_id && item.avg_ndvi != null
          )
        ).length
      : 0;

  const renderTree = (parentId: number | null, depth = 0): React.ReactNode => {
    return childrenOf(parentId).map((region) => {
      const isSelected = selectedId === region.region_id;

      return (
        <div key={region.region_id}>
          <button
            onClick={() => setSelectedId(region.region_id)}
            style={{ marginLeft: `${depth * 18}px` }}
            className={`mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
              isSelected
                ? "border-green-400 bg-green-50"
                : "border-gray-100 bg-white hover:border-green-300"
            }`}
          >
            <MapPin
              size={17}
              className={isSelected ? "text-green-700" : "text-gray-400"}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#183729]">
                {region.region_name}
              </p>
              <p className="text-xs capitalize text-gray-400">
                {region.region_level}
              </p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>

          {renderTree(region.region_id, depth + 1)}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-[#183729]">Region Explorer</h1>
        <p className="mt-4 text-gray-500">Loading regional data...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-[#183729]">Region Explorer</h1>
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
          <p className="text-sm text-gray-500">
            Agricultural Intelligence / Regional Analysis
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#183729]">
            Region Explorer
          </h1>
          <p className="mt-1 text-gray-500">
            Explore your agricultural regions and compare crop health.
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
        {[
          { label: "Total Regions", value: visibleRegions.length, icon: Map },
          { label: "Monitored Fields", value: fieldRegions.length, icon: Sprout },
          { label: "Severe Stress Fields", value: severeCount, icon: AlertTriangle },
          {
            label: "Average Field NDVI",
            value: Number.isFinite(averageNdvi) ? format(averageNdvi) : "N/A",
            icon: Activity,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <Icon size={20} className="text-green-700" />
              </div>
              <p className="mt-4 text-3xl font-bold text-[#183729]">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-[#183729]">
            Regional Hierarchy
          </h2>
          <p className="mb-5 text-sm text-gray-500">
            Select a region to inspect its data and child regions.
          </p>

          <button
            onClick={() => setSelectedId("all")}
            className={`mb-4 w-full rounded-xl border p-3 text-left text-sm font-semibold ${
              selectedId === "all"
                ? "border-green-400 bg-green-50 text-green-800"
                : "border-gray-100 hover:bg-gray-50"
            }`}
          >
            All Regions
          </button>

          <div className="max-h-[600px] overflow-y-auto">
            {renderTree(null)}
          </div>
        </section>

        <section className="xl:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-[#183729]">
            {selectedRegion?.region_name ?? "Regional Overview"}
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            {selectedRegion
              ? `${selectedRegion.region_level} · ${selectedRegion.parent_region ?? "Top-level region"}`
              : "Aggregated information across all available regions."}
          </p>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visibleSummaries.map((item) => (
              <div key={item.region_id} className="rounded-xl border border-gray-100 p-4">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-[#183729]">
                      {item.region_name}
                    </h3>
                    <p className="text-xs capitalize text-gray-400">
                      {item.region_level}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stressStyle(item.latest_stress_level)}`}>
                    {item.latest_stress_level ?? "No data"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Average NDVI</p>
                    <p className="mt-1 font-bold text-[#183729]">
                      {format(item.avg_ndvi)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Average EVI</p>
                    <p className="mt-1 font-bold text-[#183729]">
                      {format(item.avg_evi)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Stress Score</p>
                    <p className="mt-1 font-bold text-[#183729]">
                      {format(item.latest_stress)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Soil Moisture</p>
                    <p className="mt-1 font-bold text-[#183729]">
                      {item.avg_soil_moisture == null
                        ? "N/A"
                        : `${format(item.avg_soil_moisture)}%`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3">
                  <div>
                    <p className="text-xs text-gray-400">Temperature</p>
                    <p className="mt-1 text-sm font-semibold">
                      {item.avg_temperature == null
                        ? "N/A"
                        : `${format(item.avg_temperature)}°C`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Rainfall</p>
                    <p className="mt-1 text-sm font-semibold">
                      {item.avg_rainfall == null
                        ? "N/A"
                        : `${format(item.avg_rainfall)} mm`}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {visibleSummaries.length === 0 && (
              <p className="col-span-2 rounded-xl bg-gray-50 p-8 text-center text-gray-500">
                No agricultural observations are available for this region.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">
              Regional insights
            </p>
            <p className="mt-1 text-sm leading-6 text-green-800">
              {fieldRegions.length > 0
                ? `${fieldRegions.length} field(s) are included in this selection. ${severeCount} region(s) in the selected hierarchy have a severe stress classification.`
                : "Select a region with monitored fields to view its agricultural insights."}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
