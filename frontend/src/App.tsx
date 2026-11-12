
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import AIAssistant from "./pages/AIAssistant";
import FieldMonitoring from "./pages/FieldMonitoring";
import SoilWeather from "./pages/SoilWeather";
import RegionExplorer from "./pages/RegionExplorer";

type Page =
  | "Overview"
  | "Field Monitoring"
  | "Region Explorer"
  | "Soil & Weather"
  | "AI Assistant";

function App() {
  const [activePage, setActivePage] = useState<Page>("Overview");

  return (
    <div className="min-h-screen bg-[#F5F8F4] flex">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      {activePage === "Overview" && <Dashboard />}
      {activePage === "Field Monitoring" && <FieldMonitoring />}
      {activePage === "AI Assistant" && <AIAssistant />}
      {activePage === "Soil & Weather" && <SoilWeather />}
      {activePage === "Region Explorer" && <RegionExplorer />}

    </div>
  );
}

export default App;
