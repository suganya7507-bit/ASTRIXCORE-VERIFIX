const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * Helper function for standard API requests
 */
export const api = {
  get: async (endpoint: string) => {
    const res = await fetch(`${BASE_URL}${endpoint}`);
    if (!res.ok) throw new Error(`API GET request failed: ${res.statusText}`);
    return res.json();
  },
  post: async (endpoint: string, body: any) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API POST request failed: ${res.statusText}`);
    return res.json();
  },
};

/**
 * Verification API endpoints
 */
export const verificationApi = {
  verify: async (data: { code?: string; language?: string }) => {
    return api.post("/api/verify", data);
  },
  generatePlan: async (rtlContent: any, specification?: any) => {
    return api.post("/api/generate-plan", { rtlContent, specification });
  },
  getHealth: async () => {
    return api.get("/api/health");
  },
};

/**
 * Simulation API endpoints
 */
export const simulationApi = {
  compile: async (data: any) => {
    return api.post("/api/simulation/compile", data);
  },
  run: async (data: any) => {
    return api.post("/api/simulation/run", data);
  },
  getStatus: async (id: string) => {
    return api.get(`/api/simulation/status/${id}`);
  },
  getResults: async (id: string) => {
    return api.get(`/api/simulation/results/${id}`);
  },
};

/**
 * Projects API endpoints
 */
export const projectsApi = {
  getAll: async () => {
    return api.get("/api/projects");
  },
  getById: async (id: string) => {
    return api.get(`/api/projects/${id}`);
  },
  create: async (projectData: any) => {
    return api.post("/api/projects", projectData);
  },
};