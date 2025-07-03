// src/service/api.js
import axios from 'axios'
import JSZip from 'jszip';
import { v4 as uuidv4 } from "uuid";

const API_BASE_URL = window.API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://github-utils-api.onrender.com/api.github.com";
const OWNER = "0xReyes";
const REPO = "ip-tools";
const WORKFLOW_FILENAME = "backend-api-trigger.yml";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/vnd.github.v3+json',
  }
});

export const triggerWorkflowdispatch = async (tool, target) => {
  const dispatch_id = uuidv4();
  const payload = {
    ref: "main",
    inputs: {
      tool_command: tool,
      target_host: target,
      dispatch_id,
    },
  };

  const url = `/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILENAME}/dispatches`;

  try {
    const response = await api.post(url, payload);
    if (response.status !== 204) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
    console.log('dispatch_id', dispatch_id)
    return dispatch_id;
  } catch (error) {
    console.error("Error triggering workflow:", error.response?.data || error.message);
    throw new Error(`Failed to trigger workflow: ${error.message}`);
  }
};

export const getArtifacts = async () => {
  const url = `/repos/${OWNER}/${REPO}/actions/artifacts`;
  try {
    const response = await api.get(url);
    return response.data.artifacts.map(artifact => ({
      id: artifact.id,
      name: artifact.name,
      created: artifact.created_at,
      download_url: artifact.archive_download_url.replace('https://api.github.com', API_BASE_URL),
    }));
  } catch (error) {
    console.error("Error getting artifacts:", error.response?.data || error.message);
    throw new Error(`Failed to get artifacts: ${error.message}`);
  }
};

export const getArtifactByDispatchId = async (dispatchId) => {
  try {
    const artifacts = await getArtifacts();
    if (artifacts && artifacts.length > 0){
      console.log('getArtifactByDispatchId',dispatchId, artifacts)
      return artifacts.filter((artifact) => artifact.name.includes(dispatchId))
    } else {
      throw new Error(`Failed to fetch artifact`);
    }
  } catch (error) {
    console.error("Error getting artifact by ID:", error);
    throw new Error(`Failed to find artifact: ${error.message}`);
  }
};

export const downloadArtifact = async (url) => {
  try {
    console.log(url);
    const response = await api.get(url, {
      responseType: 'arraybuffer',
    });
    
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(response.data);
    const files = {};

    await Promise.all(
      Object.keys(zipContent.files).map(async filename => {
        console.log(filename)
        files[filename] = await zipContent.files[filename].async("string");
      })
    );
    console.log('files', files)
    return files;
  } catch (error) {
    console.error("Error downloading artifact:", error);
    throw new Error(`Failed to download artifact: ${error.message}`);
  }
};
