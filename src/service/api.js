// src/service/api.js
import axios from "axios";
import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";

const DEFAULT_API_BASE_URL = "https://github-utils-api.onrender.com";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL;

// Expose for debugging in the browser (optional)
window.API_BASE_URL = API_BASE_URL;

const OWNER = "0xReyes";
const REPO = "ip-tools";
const WORKFLOW_FILENAME = "backend-api-trigger.yml";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/vnd.github.v3+json",
};

// Main API instance (used for downloads / raw axios calls)
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/vnd.github.v3+json" },
  withCredentials: true,
});

// Auth API instance
const authApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// -------------------------
// Auth
// -------------------------
export const login = async () => {
  try {
    const response = await authApi.post(`${API_BASE_URL}/auth/login`);

    if (response.status === 200 && response.data?.success) {
      return {
        success: true,
        token: response.data.token,
        message: response.data.message,
      };
    }

    return {
      success: false,
      error: response.data?.message || "Authentication failed",
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Network error during login",
    };
  }
};

export const verifyAuth = async () => {
  try {
    const response = await authApi.post(`${API_BASE_URL}/auth/verify`);
    return response.status === 200 && !!response.data?.success;
  } catch (error) {
    console.error("Auth verification error:", error);
    return false;
  }
};

// Placeholder (no backend endpoint yet)
export const logout = async () => ({ success: true });

// -------------------------
// Helpers
// -------------------------
export const authenticatedFetch = async (url, options = {}) => {
  const fetchOptions = {
    ...options,
    credentials: "include",
    headers: {
      ...JSON_HEADERS,
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, fetchOptions);

    if (response.status === 401) {
      throw new Error("Authentication required or session expired");
    }

    return response;
  } catch (error) {
    console.error("Authenticated fetch error:", error);
    throw error;
  }
};

// -------------------------
// Data
// -------------------------
export const fetchJobData = async () => {
  try {
    // NOTE: this is a proxy path your backend serves, not a direct GitHub URL.
    const jobDataUrl = `${API_BASE_URL}/raw.githubusercontent.com/0xReyes/job-data-warehouse/feature/test/data/jobs_data.json`;
    const response = await authenticatedFetch(jobDataUrl, { method: "GET" });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch job data: ${response.status} ${response.statusText}`
      );
    }

    const jobData = await response.json();
    return { success: true, data: jobData };
  } catch (error) {
    console.error("Job data fetch error:", error);
    return { success: false, error: error.message };
  }
};

// -------------------------
// Axios interceptors
// -------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      console.log("Authentication failed or expired");
    }
    return Promise.reject(error);
  }
);

// -------------------------
// GitHub Actions / Artifacts
// -------------------------
export const triggerWorkflowdispatch = async (tool, target) => {
  const dispatchId = uuidv4();

  const payload = {
    ref: "main",
    inputs: {
      tool_command: tool,
      target_host: target,
      dispatch_id: dispatchId,
    },
  };

  const url = `${API_BASE_URL}/api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILENAME}/dispatches`;

  try {
    const response = await authenticatedFetch(url, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to trigger workflow: ${response.status} ${response.statusText}`
      );
    }

    console.log("dispatch_id", dispatchId);
    return dispatchId;
  } catch (error) {
    console.error("Error triggering workflow:", error?.message || error);
    throw error;
  }
};

export const getArtifacts = async () => {
  const url = `${API_BASE_URL}/api.github.com/repos/${OWNER}/${REPO}/actions/artifacts`;

  try {
    const response = await authenticatedFetch(url, {
      method: "GET",
      headers: { Accept: "application/vnd.github.v3+json" },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get artifacts: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const artifacts = Array.isArray(data?.artifacts) ? data.artifacts : [];

    return artifacts.map((artifact) => ({
      id: artifact.id,
      name: artifact.name,
      created: artifact.created_at,
      download_url: artifact.archive_download_url.replace(
        "https://api.github.com",
        `${API_BASE_URL}/api.github.com`
      ),
    }));
  } catch (error) {
    console.error("Error getting artifacts:", error?.message || error);
    throw error;
  }
};

export const getArtifactByDispatchId = async (dispatchId) => {
  const artifacts = await getArtifacts();
  return artifacts.filter((artifact) => artifact.name?.includes(dispatchId));
};

export const downloadArtifact = async (url) => {
  try {
    const response = await api.get(url, { responseType: "arraybuffer" });

    const zip = new JSZip();
    const zipContent = await zip.loadAsync(response.data);

    const files = {};
    await Promise.all(
      Object.keys(zipContent.files).map(async (filename) => {
        files[filename] = await zipContent.files[filename].async("string");
      })
    );

    return files;
  } catch (error) {
    console.error("Error downloading artifact:", error);
    throw new Error(`Failed to download artifact: ${error.message}`);
  }
};
