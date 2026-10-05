const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Generic API client helper for general requests
export const api = {
  async get(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `GET ${endpoint} failed with status ${response.status}`);
    }
    return response.json();
  },

  async post(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `POST ${endpoint} failed with status ${response.status}`);
    }
    return response.json();
  },

  async put(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `PUT ${endpoint} failed with status ${response.status}`);
    }
    return response.json();
  },

  async delete(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `DELETE ${endpoint} failed with status ${response.status}`);
    }
    return response.json();
  },
};

export const simulationApi = {
  async run(data: {
    rtl_content: string;
    test_code: string;
    top_module: string;
    simulator: string;
    timeout: number;
  }) {
    const response = await fetch(`${API_BASE_URL}/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Simulation failed with status ${response.status}`);
    }

    return response.json();
  },

  async compile(data: {
    rtl_files: string[];
    testbench: string;
    top_module: string;
    simulator: string;
    timeout: number;
  }) {
    const response = await fetch(`${API_BASE_URL}/simulation/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Compilation failed with status ${response.status}`);
    }

    return response.json();
  },
};

export const traceabilityApi = {
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/traceability`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to fetch traceability items`);
    }
    return response.json();
  },

  async generate(data: any) {
    const response = await fetch(`${API_BASE_URL}/traceability/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Traceability generation failed`);
    }
    return response.json();
  },
};