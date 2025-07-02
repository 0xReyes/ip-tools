import axios from 'axios';

const API_BASE_URL = 'https://utils-api.onrender.com/api.github.com';

/**
 * Triggers a GitHub Actions workflow via the proxy.
 */
export const triggerWorkflowDispatch = async (workflowFilename, payload) => {
  const response = await axios.post(
    `${API_BASE_URL}/repos/0xreyes/ip-tools/actions/workflows/${workflowFilename}/dispatches`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

/**
 * Optional: Check workflow run status via proxy.
 */
export const getWorkflowRunStatus = async (runId) => {
  const response = await axios.get(
    `${API_BASE_URL}/repos/0xreyes/ip-tools/actions/runs/${runId}`
  );
  return response.data;
};
