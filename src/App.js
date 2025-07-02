import React, { useState, useCallback, useEffect } from 'react';
import {
  Layout,
  Input,
  Select,
  Typography,
  Card,
  Form,
  message,
  Alert,
  Spin,
} from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  triggerIpToolWorkflow,
  getLatestRunId,
  getWorkflowRunStatus,
} from './service/api';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;
const { Search } = Input;

const queryClient = new QueryClient();

function App() {
  const [form] = Form.useForm();
  const [jobStatus, setJobStatus] = useState(null);
  const [runId, setRunId] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const pollRunStatus = useCallback(async (runId) => {
    const interval = setInterval(async () => {
      try {
        const run = await getWorkflowRunStatus(runId);
        setJobStatus(run.status);
        if (run.status === 'completed') {
          clearInterval(interval);
          setResult(run.conclusion);
          message.success(`Job ${runId} completed with status: ${run.conclusion}`);
        }
      } catch (err) {
        clearInterval(interval);
        setErrorMessage('Error polling workflow status');
        setJobStatus('error');
      }
    }, 5000);
  }, []);

  const onFinish = useCallback(async ({ tool, target }) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await triggerIpToolWorkflow(tool, target);
      setJobStatus('dispatched');
      message.success(`${tool} workflow dispatched for ${target}`);

      const latestRunId = await getLatestRunId();
      if (latestRunId) {
        setRunId(latestRunId);
        pollRunStatus(latestRunId);
      }
    } catch (err) {
      setErrorMessage(`Failed to dispatch workflow: ${err.message}`);
      message.error(`Failed to dispatch workflow: ${err.message}`);
      setJobStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [pollRunStatus]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', backgroundColor: '#001529' }}>
        <Title level={3} style={{ color: 'white', margin: 0 }}>IP Tool</Title>
      </Header>

      <Content style={{ padding: '50px', maxWidth: '800px', margin: '0 auto' }}>
        <Card title="Run IP Diagnostic Tool" style={{ borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ tool: 'dig' }}
          >
            <Form.Item
              name="target"
              label="Target Host or IP"
              rules={[{ required: true, message: 'Please enter a target!' }]}
            >
              <Search
                placeholder="e.g., google.com or 8.8.8.8"
                enterButton="Run"
                size="large"
                onSearch={() => form.submit()}
                loading={isLoading}
              />
            </Form.Item>

            <Form.Item
              name="tool"
              label="Select Tool"
              rules={[{ required: true, message: 'Please select a tool!' }]}
            >
              <Select size="large" disabled={isLoading}>
                {['dig', 'nslookup', 'ping', 'whois', 'traceroute'].map(tool => (
                  <Select.Option key={tool} value={tool}>{tool}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Card>

        {errorMessage && (
          <Alert
            message="Error"
            description={errorMessage}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMessage(null)}
            style={{ marginTop: 24, borderRadius: '8px' }}
          />
        )}

        {(jobStatus && jobStatus !== 'error') && (
          <Card title="Workflow Status" style={{ marginTop: 24 }}>
            <Paragraph>Status: <strong>{jobStatus}</strong></Paragraph>
            {jobStatus === 'in_progress' && <Spin />}
            {result && <Paragraph>Result: <strong>{result}</strong></Paragraph>}
          </Card>
        )}
      </Content>

      <Footer style={{ textAlign: 'center', backgroundColor: '#f0f2f5' }}>
        IP Tool Application ©{new Date().getFullYear()} Created by Henry Argueta
      </Footer>
    </Layout>
  );
}

export default function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
