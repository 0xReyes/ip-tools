import axios from 'axios';

const API_BASE_URL = 'https://utils-api.onrender.com/api.github.com';

/**
 * Trigger a GitHub Actions workflow for IP diagnostics via proxy.
 */
export const triggerIpToolWorkflow = async (tool, target) => {
  const workflowFilename = 'backend-api-trigger.yml';
  const payload = {
    ref: 'main',
    inputs: {
      tool_command: tool,
      target_host: target,
    },
  };

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
 * Fetch the most recent workflow run ID for the given workflow.
 */
export const getLatestRunId = async () => {
  const response = await axios.get(
    `${API_BASE_URL}/repos/0xreyes/ip-tools/actions/workflows/backend-api-trigger.yml/runs?per_page=1`
  );
  const runId = response.data?.workflow_runs?.[0]?.id;
  return runId;
};

/**
 * Get status and output of a workflow run.
 */
export const getWorkflowRunStatus = async (runId) => {
  const response = await axios.get(
    `${API_BASE_URL}/repos/0xreyes/ip-tools/actions/runs/${runId}`
  );
  return response.data;
};
