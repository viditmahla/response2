import axios from "axios";
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const api = axios.create({ baseURL: API });

export const fetchUploadStatus    = ()                    => api.get("/upload/status").then(r => r.data);
export const fetchDashboardOverview = (fs = "calcite", o = 5) => api.get(`/dashboard/overview?feedstock=${fs}&omega=${o}`).then(r => r.data);
export const fetchSummary         = (fs = "calcite", o = 5)  => api.get(`/summary?feedstock=${fs}&omega=${o}`).then(r => r.data);
export const fetchRegionsCdr      = (fs = "calcite", o = 5)  => api.get(`/regions/cdr?feedstock=${fs}&omega=${o}`).then(r => r.data);
export const fetchStatesCdr       = (fs = "calcite", o = 5)  => api.get(`/states/cdr?feedstock=${fs}&omega=${o}`).then(r => r.data);
export const fetchTopRivers       = (fs = "calcite", o = 5, lim = 20) => api.get(`/rivers/top?feedstock=${fs}&omega=${o}&limit=${lim}`).then(r => r.data);
export const fetchSamples         = (fs = "calcite", o = 5, region, state, limit = 200) => {
  let url = `/samples?feedstock=${fs}&omega=${o}&limit=${limit}`;
  if (region) url += `&region=${encodeURIComponent(region)}`;
  if (state)  url += `&state=${encodeURIComponent(state)}`;
  return api.get(url).then(r => r.data);
};
export const fetchMapData         = (fs = "calcite", o = 5)  => api.get(`/samples/map?feedstock=${fs}&omega=${o}`).then(r => r.data);
export const fetchFilters         = (fs = "calcite", o = 5)  => api.get(`/filters?feedstock=${fs}&omega=${o}`).then(r => r.data);
export const fetchAnalyticsFull   = (fs = "calcite", o = 5)  => api.get(`/analytics/full?feedstock=${fs}&omega=${o}`).then(r => r.data);
export const fetchBasinStats      = (fs = "calcite", o = 5)  => api.get(`/analytics/basin-stats?feedstock=${fs}&omega=${o}`).then(r => r.data);
export const fetchNicbQuality     = (fs = "calcite", o = 5)  => api.get(`/analytics/nicb-quality?feedstock=${fs}&omega=${o}`).then(r => r.data);
export const fetchFeedstocks      = ()                        => api.get("/feedstocks").then(r => r.data);
export const fetchComparison      = (fs = "calcite")          => api.get(`/comparison?feedstock=${fs}`).then(r => r.data);
export const fetchSimulatorData   = ()                        => api.get("/simulator/full-data").then(r => r.data);
export const fetchSimulatorCombos = ()                        => api.get("/simulator/available-combos").then(r => r.data);
export const sendChatMessage      = (msg, sid = "default")    => api.post("/chat", { message: msg, session_id: sid }).then(r => r.data);
export const fetchChatHistory     = (sid = "default")         => api.get(`/chat/history?session_id=${sid}`).then(r => r.data);

export const uploadFeedstock = (file, name, omega, dataCategory = "baseline") => {
  const fd = new FormData();
  fd.append("file", file);
  return api.post(
    `/feedstock/upload?feedstock_name=${encodeURIComponent(name)}&omega_threshold=${omega}&data_category=${dataCategory}`,
    fd,
    { headers: { "Content-Type": "multipart/form-data" } }
  ).then(r => r.data);
};
