import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Shell from "@/components/Shell";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SimulatorPage from "@/pages/SimulatorPage";
import MapPage from "@/pages/MapPage";
import GraphPage from "@/pages/GraphPage";
import DataPage from "@/pages/DataPage";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<AnalyticsPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/data" element={<DataPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
