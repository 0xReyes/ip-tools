import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Layout, Card, Row, Col, Input, Button, Select, Typography, Spin, Alert, message,
  Divider
} from 'antd';
import { 
  RadarChartOutlined, DeploymentUnitOutlined, 
  GlobalOutlined, DatabaseOutlined, 
  CopyOutlined, PlayCircleFilled
} from '@ant-design/icons';
import { 
  triggerWorkflowdispatch, 
  getArtifactByDispatchId,
  downloadArtifact
} from './service/api';
import {useStateStore} from './store/useStateStore';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const TOOLS = [
  { id: 'ping', icon: <RadarChartOutlined />, name: 'Ping' },
  { id: 'traceroute', icon: <DeploymentUnitOutlined />, name: 'Traceroute' },
  { id: 'whois', icon: <GlobalOutlined />, name: 'Whois' },
  { id: 'dig', icon: <DatabaseOutlined />, name: 'Dig' },
];

function App() {
  const [activeTool, setActiveTool] = useState('ping');
  const { artifacts } = useStateStore();

  // Consolidated state
  const [state, setState] = useState({
    target: '',
    isLoading: false,
    error: null,
    output: null,
    dispatchId: null
  });
  
  const { target, isLoading, error, output, dispatchId } = state;

  // Reset function
  const resetJobState = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: null,
      output: null,
      dispatchId: null
    }));
  }, []);

  const fetchData = useCallback(async () => {
    if (!dispatchId) return;
    if (dispatchId.length === 0) return;
    console.log(dispatchId)

    try {
      const response = await getArtifactByDispatchId(dispatchId);
      console.log('response', response)

      if (response.length > 0){
        const { download_url } = response[0];
        const files = await downloadArtifact(download_url);
        if (files[`${dispatchId}.txt`]){
          const content = files[`${dispatchId}.txt`];
          console.log('content', content)
          setState(prev => ({...prev, output: content}));
        }
      }
    } catch (error) {
      console.log('error fetchdata', error)
      setState(prev => ({
        ...prev,
        error: error.message
      }));
    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  },[dispatchId])


  useEffect(() => {
    if (dispatchId?.length > 0 && !output){
      const timer = setTimeout(() => {
        fetchData()
      }, 25000);

      return () => clearTimeout(timer);
    }
  }, [dispatchId, output, fetchData]);

  useEffect(() => {
    resetJobState()
  }, [activeTool, resetJobState]);



  const runDiagnostic = useCallback(async () => {
    if (!target) return;
    
    try {
      resetJobState();
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Check cache first
      const cacheKey = `${activeTool}-${target}`;
      if (artifacts[cacheKey]) {
        setState(prev => ({
          ...prev,
          output: artifacts[cacheKey],
          isLoading: false
        }));
      }

      // Trigger workflow
      console.log(activeTool, target)
      const newDispatchId = await triggerWorkflowdispatch(activeTool, target);
      setState(prev => ({
        ...prev,
        dispatchId: newDispatchId,
        isLoading: true
      }));
      message.info('Diagnostic started...');
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err.message,
        isLoading: false
      }));
    }
  }, [activeTool, target, artifacts, resetJobState]);

  // Memoized results rendering
  const renderResults = useMemo(() => {
    if (!output && !isLoading && !error) return null;
    
    return (
      <Card 
        title={`${activeTool.toUpperCase()} Results for ${target}`}
        extra={output && <Button icon={<CopyOutlined />} onClick={() => 
          navigator.clipboard.writeText(output).then(() => message.success('Copied to clipboard!'))
        }>Copy</Button>}
        style={{ margin: '24px 0' }}
      >
        {error ? (
          <Alert
            message="Diagnostic Failed"
            description={error}
            type="error"
            showIcon
          />
        ) : (
          <>
            {isLoading && (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin spinning={true} tip="Running diagnostic..." size="large">
                  <div style={{ minHeight: 150 }} />
                </Spin>
              </div>
            )}
            {output && (
              <pre style={{ 
                background: '#f6f8fa', 
                padding: 16, 
                borderRadius: 4,
                maxHeight: 400,
                overflow: 'auto'
              }}>
                <code>{output}</code>
              </pre>
            )}
          </>
        )}
      </Card>
    );
  }, [output, isLoading, error, activeTool, target]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#1890ff', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <DeploymentUnitOutlined style={{ fontSize: 24, color: 'white', marginRight: 16 }} />
          <Title level={3} style={{ color: 'white', margin: 0 }}>Network Tools</Title>
        </div>
      </Header>

      <Content style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <Card title="Run Diagnostic" style={{ marginBottom: 24 }}>
          <Row gutter={16} align="bottom">
            <Col flex="auto">
                <Select
                  value={activeTool}
                  displayName={activeTool}
                  onChange={setActiveTool}
                  style={{ width: '100%', marginTop: 8 }}
                  disabled={isLoading}
                >
                  {TOOLS.map(tool => (
                    <Select.Option key={tool.id} value={tool.id}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {tool.icon}
                        <Text style={{ marginLeft: 8 }}>{tool.name}</Text>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
                <Divider/>
                <Input 
                  placeholder="e.g., google.com or 8.8.8.8"
                  value={target}
                  addonBefore={"Target"}
                  onChange={e => setState(prev => ({ ...prev, target: e.target.value }))}
                  onPressEnter={runDiagnostic}
                  style={{ marginTop: 8 }}
                  disabled={isLoading}
                />
            </Col>
            <Col>
              <Button 
                type="primary" 
                icon={<PlayCircleFilled />}
                onClick={runDiagnostic}
                loading={isLoading}
                disabled={!target}
              >
                Run
              </Button>
            </Col>
          </Row>
          
          {artifacts[`${activeTool}-${target}`] && !isLoading && !output && !error && (
            <Alert
              message="Cached results available"
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>

        {renderResults}

        <div style={{ marginTop: 24 }}>
          <Title level={4} style={{ marginBottom: 16 }}>Available Tools</Title>
          <Row gutter={16}>
            {TOOLS.map(tool => (
              <Col xs={24} sm={12} key={tool.id}>
                <Card 
                  hoverable
                  onClick={() => !isLoading && setActiveTool(tool.id)}
                  style={{ textAlign: 'center', cursor: 'pointer', marginBottom: 16 }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>
                    {tool.icon}
                  </div>
                  <Text strong>{tool.name}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Content>
    </Layout>
  );
}

export default App;