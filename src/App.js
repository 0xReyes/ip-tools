import React, { useState, useEffect } from 'react';
import {
  Layout,
  Space,
  Input,
  Select,
  Button,
  Typography,
  Spin,
  Alert,
  Form,
  Card,
  message,
} from 'antd';
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { startIpToolJob, getJobStatus } from './service/api'; // Import API functions


const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

const queryClient = new QueryClient();

/**
 * Main application component.
 * This component handles the UI for starting IP tool jobs and displaying their status and results.
 */
function App() {
  const [form] = Form.useForm(); // Form instance for Ant Design Form
  const [jobId, setJobId] = useState(null); // State to store the current job ID
  const [jobStatus, setJobStatus] = useState(null); // State to store the current job status
  const [jobResult, setJobResult] = useState(null); // State to store the job result
  const [errorMessage, setErrorMessage] = useState(null); // State to store any error messages

  // Mutation to start the IP tool job using React Query's useMutation hook
  const startJobMutation = useMutation({
    mutationFn: startIpToolJob, // The function to call when the mutation is triggered
    onSuccess: (data) => {
      // Callback for successful job initiation
      setJobId(data.jobId);
      setJobStatus(data.status);
      setJobResult(null); // Clear previous results when a new job starts
      setErrorMessage(null); // Clear any previous error messages
      message.success(`Job ${data.jobId} queued successfully!`); // Ant Design success message
    },
    onError: (error) => {
      // Callback for failed job initiation
      setErrorMessage(`Failed to start job: ${error.message}`); // Set error message
      message.error(`Failed to start job: ${error.message}`); // Ant Design error message
      setJobId(null); // Reset job ID
      setJobStatus(null); // Reset job status
      setJobResult(null); // Reset job result
    },
  });

  // Query to poll for job status using React Query's useQuery hook
  const jobStatusQuery = useQuery({
    queryKey: ['jobStatus', jobId], // Unique key for this query, dependent on jobId
    queryFn: () => getJobStatus(jobId), // The function to call to fetch job status
    // Only enable polling if jobId exists and the job is not yet completed or failed
    enabled: !!jobId && jobStatus !== 'completed' && jobStatus !== 'failed',
    // refetchInterval determines how often the query will refetch
    refetchInterval: (query) => {
      // Stop polling if the job status is completed or failed
      if (query.state.data?.status === 'completed' || query.state.data?.status === 'failed') {
        return false; // Stop refetching
      }
      return 3000; // Poll every 3 seconds
    },
    onSuccess: (data) => {
      // Callback for successful job status fetch
      setJobStatus(data.status); // Update job status
      if (data.status === 'completed') {
        setJobResult(data.result); // Set job result if completed
        message.success(`Job ${jobId} completed!`); // Ant Design success message
      } else if (data.status === 'failed') {
        setJobResult(data.result || 'Job failed with no specific output.'); // Set result for failed job
        setErrorMessage(`Job ${jobId} failed.`); // Set error message
        message.error(`Job ${jobId} failed.`); // Ant Design error message
      }
    },
    onError: (error) => {
      // Callback for error during job status fetching
      setErrorMessage(`Error fetching job status: ${error.message}`); // Set error message
      message.error(`Error fetching job status: ${error.message}`); // Ant Design error message
      setJobStatus('failed'); // Mark job as failed if polling itself errors
      setJobResult('Could not retrieve job results due to a network error or backend issue.'); // Set a generic error result
    },
  });

  /**
   * Handler for when the form is submitted.
   * @param {object} values - The form values (tool, target).
   */
  const onFinish = (values) => {
    startJobMutation.mutate(values); // Trigger the mutation to start the job
  };

  // Determine if any loading state is active (either starting a job or fetching status)
  const isLoading = startJobMutation.isPending || jobStatusQuery.isFetching;

  return (
    // Layout component from Ant Design for overall page structure
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header section */}
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', backgroundColor: '#001529' }}>
        <Title level={3} style={{ color: 'white', margin: 0 }}>
          IP Tool
        </Title>
      </Header>

      {/* Main content area */}
      <Content style={{ padding: '50px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {/* Card for the IP tool input form */}
        <Card title="Run IP Diagnostic Tool" style={{ marginBottom: 24, borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <Form
            form={form} // Bind the form instance
            layout="vertical" // Vertical layout for form items
            onFinish={onFinish} // Callback when form is submitted
            initialValues={{ tool: 'dig' }} // Default value for the tool select
          >
            {/* Form item for target host/domain input */}
            <Form.Item
              name="target"
              label="Target Host/Domain"
              rules={[{ required: true, message: 'Please enter a target host or domain!' }]}
            >
              <Search
                placeholder="e.g., google.com or 8.8.8.8"
                enterButton="Run"
                size="large"
                onSearch={() => form.submit()} // Trigger form submission on search button click
                loading={isLoading} // Show loading state on the search button
                style={{ borderRadius: '4px' }}
              />
            </Form.Item>

            {/* Form item for tool selection */}
            <Form.Item
              name="tool"
              label="Select Tool"
              rules={[{ required: true, message: 'Please select an IP tool!' }]}
            >
              <Select size="large" disabled={isLoading} style={{ borderRadius: '4px' }}>
                <Select.Option value="dig">dig</Select.Option>
                <Select.Option value="nslookup">nslookup</Select.Option>
              </Select>
            </Form.Item>

            {/* Form item for the submit button */}
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={isLoading}
                style={{ borderRadius: '4px' }}
              >
                Run IP Tool
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* Display error message if any */}
        {errorMessage && (
          <Alert
            message="Error"
            description={errorMessage}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMessage(null)} // Allow closing the alert
            style={{ marginBottom: 24, borderRadius: '8px' }}
          />
        )}

        {/* Display job status and results if a job has been initiated */}
        {jobId && (
          <Card title="Job Status" style={{ marginBottom: 24, borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Paragraph>
                <Text strong>Job ID:</Text> {jobId}
              </Paragraph>
              <Paragraph>
                <Text strong>Status:</Text>{' '}
                {/* Display job status with appropriate styling and icons */}
                {jobStatus === 'queued' && <Text type="warning">Queued</Text>}
                {jobStatus === 'in_progress' && (
                  <Text type="success"> {/* Changed to success type for in_progress to show green */}
                    <Spin size="small" /> In Progress...
                  </Text>
                )}
                {jobStatus === 'completed' && <Text type="success">Completed</Text>}
                {jobStatus === 'failed' && <Text type="danger">Failed</Text>}
                {jobStatus === null && <Text type="secondary">Waiting for initiation...</Text>}
              </Paragraph>
              {/* Display job results if available */}
              {jobResult && (
                <>
                  <Title level={5}>Results:</Title>
                  <pre
                    style={{
                      backgroundColor: '#f5f5f5',
                      padding: '10px',
                      borderRadius: '4px',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap', // Preserve whitespace and wrap long lines
                      wordBreak: 'break-all', // Break words to prevent overflow
                      border: '1px solid #e0e0e0',
                      maxHeight: '300px' // Limit height for long results
                    }}
                  >
                    {jobResult}
                  </pre>
                </>
              )}
            </Space>
          </Card>
        )}
      </Content>

      {/* Footer section */}
      <Footer style={{ textAlign: 'center', backgroundColor: '#f0f2f5', padding: '24px 50px' }}>
        IP Tool Application ©{new Date().getFullYear()} Created by Your Name
      </Footer>
    </Layout>
  );
}

// Wrap the App component with QueryClientProvider to enable React Query
export default function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
