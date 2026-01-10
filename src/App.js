import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
} from "react";
import {
  Layout,
  Card,
  Row,
  Col,
  Input,
  Button,
  Select,
  Typography,
  Spin,
  Alert,
  message,
  ConfigProvider,
} from "antd";
import {
  RadarChartOutlined,
  DeploymentUnitOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  CopyOutlined,
  PlayCircleFilled,
  LoadingOutlined,
} from "@ant-design/icons";
import {
  triggerWorkflowdispatch,
  getArtifactByDispatchId,
  downloadArtifact,
} from "./service/api";
import { Footer } from "antd/es/layout/layout";
import {
  ResponsiveContext,
  ResponsiveProvider,
} from "./context/ResponsiveProvider";
import { AuthProvider } from "./context/AuthProvider";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const TOOLS = [
  { id: "ping", icon: <RadarChartOutlined />, name: "Ping" },
  { id: "traceroute", icon: <DeploymentUnitOutlined />, name: "Traceroute" },
  { id: "whois", icon: <GlobalOutlined />, name: "Whois" },
  { id: "dig", icon: <DatabaseOutlined />, name: "Dig" },
];

// Connection Loading Component
const ConnectionLoader = () => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(240, 242, 245, 0.95)",
        zIndex: 9999,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "40px",
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          maxWidth: "400px",
          width: "90%",
        }}
      >
        <DeploymentUnitOutlined
          style={{
            fontSize: "48px",
            color: "#1890ff",
            marginBottom: "24px",
            display: "block",
          }}
        />

        <Title
          level={3}
          style={{
            margin: "0 0 16px 0",
            color: "#333",
            fontSize: "24px",
          }}
        >
          Network Tools
        </Title>

        <Spin
          indicator={
            <LoadingOutlined style={{ fontSize: 32, color: "#1890ff" }} spin />
          }
          size="large"
        />

        <div style={{ marginTop: "24px" }}>
          <Text
            style={{
              fontSize: "16px",
              color: "#666",
              display: "block",
              marginBottom: "8px",
            }}
          >
            Establishing connection...
          </Text>
          <Text
            style={{
              fontSize: "14px",
              color: "#999",
            }}
          >
            Please wait while we initialize the network diagnostic tools
          </Text>
        </div>
      </div>
    </div>
  );
};

function App() {
  const { getResponsiveValue, getResponsiveFontSize } =
    useContext(ResponsiveContext);
  const [activeTool, setActiveTool] = useState("ping");
  const [artifacts, setArtifacts] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  const [state, setState] = useState({
    target: "",
    isLoading: false,
    error: null,
    output: null,
    dispatchId: null,
  });

  const { target, isLoading, error, output, dispatchId } = state;

  // Simulate connection establishment
  useEffect(() => {
    const establishConnection = async () => {
      try {
        // Simulate connection delay (you can replace this with actual connection logic)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // You can add actual connection logic here, such as:
        // - API health check
        // - Authentication verification
        // - WebSocket connection
        // - Service availability check

        // For now, we'll just simulate a successful connection
        setIsConnected(true);
      } catch (error) {
        console.error("Connection failed:", error);
        // Handle connection error
        setTimeout(() => establishConnection(), 3000); // Retry after 3 seconds
      }
    };

    establishConnection();
  }, []);

  const resetJobState = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: null,
      output: null,
      dispatchId: null,
    }));
  }, []);

  const fetchData = useCallback(async () => {
    if (!dispatchId || dispatchId.length === 0) return;

    try {
      const response = await getArtifactByDispatchId(dispatchId);

      if (response.length > 0) {
        const { download_url } = response[0];
        const files = await downloadArtifact(download_url);
        if (files[`${dispatchId}.txt`]) {
          const content = files[`${dispatchId}.txt`];
          setState((prev) => ({ ...prev, output: content }));
          setArtifacts((prev) => ({
            ...prev,
            [`${activeTool}-${target}`]: content,
          }));
        }
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error.message,
      }));
    } finally {
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [dispatchId, activeTool, target]);

  useEffect(() => {
    if (dispatchId?.length > 0 && !output) {
      const timer = setTimeout(() => {
        fetchData();
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [dispatchId, output, fetchData]);

  useEffect(() => {
    resetJobState();
  }, [activeTool, resetJobState]);

  const runDiagnostic = useCallback(async () => {
    if (!target) {
      message.error("Please enter a target host or IP.");
      return;
    }

    try {
      resetJobState();
      setState((prev) => ({ ...prev, isLoading: true }));

      const cacheKey = `${activeTool}-${target}`;
      if (artifacts[cacheKey]) {
        setState((prev) => ({
          ...prev,
          output: artifacts[cacheKey],
          isLoading: false,
        }));
        message.info("Results loaded from cache.");
        return;
      }

      const newDispatchId = await triggerWorkflowdispatch(activeTool, target);
      if (newDispatchId) {
        setState((prev) => ({
          ...prev,
          dispatchId: newDispatchId,
          isLoading: true,
        }));
        message.info("Diagnostic started...");
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err.message,
        isLoading: false,
      }));
      message.error(`Failed to start diagnostic: ${err.message}`);
    }
  }, [activeTool, target, artifacts, resetJobState]);

  const renderResults = useMemo(() => {
    if (!output && !isLoading && !error) {
      return (
        <Card
          style={{
            margin: `${getResponsiveValue(16)}px 0`,
            borderRadius: 8,
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ textAlign: "center", padding: getResponsiveValue(24) }}>
            <Text
              type="secondary"
              style={{ fontSize: getResponsiveFontSize(16), lineHeight: 1.5 }}
            >
              Enter a target and select a tool to run your first diagnostic!
              <br />
              Results will appear here.
            </Text>
          </div>
        </Card>
      );
    }

    return (
      <Card
        title={
          output
            ? `${activeTool.toUpperCase()} Results for ${target}`
            : "Diagnostic Results"
        }
        extra={
          output && (
            <Button
              icon={<CopyOutlined />}
              onClick={() =>
                navigator.clipboard
                  .writeText(output)
                  .then(() => message.success("Copied to clipboard!"))
              }
            >
              Copy
            </Button>
          )
        }
        style={{
          margin: `${getResponsiveValue(16)}px 0`,
          borderRadius: 8,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}
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
              <div
                style={{ textAlign: "center", padding: getResponsiveValue(16) }}
              >
                <Spin spinning={true} tip="Running diagnostic..." size="large">
                  <div style={{ minHeight: getResponsiveValue(100) }} />
                </Spin>
              </div>
            )}
            {output && (
              <pre
                style={{
                  background: "#f6f8fa",
                  padding: getResponsiveValue(16),
                  borderRadius: 4,
                  maxHeight: getResponsiveValue(400),
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                  fontSize: getResponsiveFontSize(14),
                  lineHeight: 1.4,
                }}
              >
                <code>{output}</code>
              </pre>
            )}
          </>
        )}
      </Card>
    );
  }, [
    output,
    isLoading,
    error,
    activeTool,
    target,
    getResponsiveValue,
    getResponsiveFontSize,
  ]);

  const customTheme = {
    token: {
      colorPrimary: "#1890ff",
      colorInfo: "#1890ff",
      colorSuccess: "#52c41a",
      colorWarning: "#faad14",
      colorError: "#f5222d",
      colorTextBase: "#333",
      colorTextSecondary: "#666",
      borderRadius: 8,
      fontFamily: "Inter, sans-serif",
      fontSize: parseFloat(getResponsiveFontSize(14)),
    },
    components: {
      Layout: {
        headerBg: "linear-gradient(to right, #001529, #002f5c)",
        footerBg: "linear-gradient(to right, #001529, #002f5c)",
      },
      Button: {
        borderRadius: 8,
        controlHeight: getResponsiveValue(50, 0.05),
        fontSize: parseFloat(getResponsiveFontSize(16)),
        fontWeight: 600,
      },
      Input: {
        controlHeight: getResponsiveValue(50, 0.05),
        borderRadius: 8,
        fontSize: parseFloat(getResponsiveFontSize(16)),
      },
      Select: {
        controlHeight: getResponsiveValue(50, 0.05),
        borderRadius: 8,
        fontSize: parseFloat(getResponsiveFontSize(16)),
      },
      Card: {
        headerBg: "#ffffff",
        extraColor: "#1890ff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      },
      Tabs: {
        inkBarColor: "#1890ff",
        itemSelectedColor: "#1890ff",
        itemHoverColor: "#40a9ff",
      },
      Typography: {
        fontSizeHeading3: parseFloat(getResponsiveFontSize(28)),
        fontSizeHeading4: parseFloat(getResponsiveFontSize(22)),
        fontSizeLG: parseFloat(getResponsiveFontSize(18)),
        fontSizeSM: parseFloat(getResponsiveFontSize(14)),
      },
    },
  };

  // Show connection loader until connected
  if (!isConnected) {
    return <ConnectionLoader />;
  }

  return (
    <ConfigProvider theme={customTheme}>
      <Layout style={{ minHeight: "100vh", backgroundColor: "#f0f2f5" }}>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            padding: `0 ${getResponsiveValue(24)}px`,
            position: "sticky",
            top: 0,
            zIndex: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            background: customTheme.components.Layout.headerBg,
          }}
        >
          <DeploymentUnitOutlined
            style={{
              fontSize: getResponsiveValue(28),
              color: "white",
              marginRight: getResponsiveValue(16),
            }}
          />
          <Title
            level={3}
            style={{
              color: "white",
              margin: 0,
              fontSize: getResponsiveFontSize(28),
              letterSpacing: "0.5px",
            }}
          >
            Network Tools
          </Title>
        </Header>

        <Content
          style={{
            padding: `${getResponsiveValue(24)}px`,
            maxWidth: "1000px",
            margin: `${getResponsiveValue(24)}px auto`,
            width: "100%",
          }}
        >
          <Card
            title={
              <Title
                level={4}
                style={{ margin: 0, fontSize: getResponsiveFontSize(22) }}
              >
                Run Network Diagnostic
              </Title>
            }
            style={{
              marginBottom: getResponsiveValue(24),
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <Text
              type="secondary"
              style={{
                marginBottom: getResponsiveValue(24),
                fontSize: getResponsiveFontSize(14),
                lineHeight: 1.6,
              }}
            >
              Select a network diagnostic tool from the dropdown below and enter
              a target host or IP address (e.g., <code>google.com</code> or{" "}
              <code>8.8.8.8</code>). Click "Run Diagnostic" to initiate the test
              and view the results.
            </Text>
            <Row
              gutter={[getResponsiveValue(16), getResponsiveValue(16)]}
              align="middle"
            >
              <Col xs={24} md={12}>
                <Text strong style={{ fontSize: getResponsiveFontSize(16) }}>
                  Select Tool:
                </Text>
                <Select
                  value={activeTool}
                  onChange={setActiveTool}
                  style={{ width: "100%", marginTop: getResponsiveValue(8) }}
                  size="large"
                  disabled={isLoading}
                >
                  {TOOLS.map((tool) => (
                    <Select.Option key={tool.id} value={tool.id}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {React.cloneElement(tool.icon, {
                          style: {
                            fontSize: getResponsiveFontSize(22),
                            marginRight: getResponsiveValue(8),
                          },
                        })}
                        <Text style={{ fontSize: getResponsiveFontSize(16) }}>
                          {tool.name}
                        </Text>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} md={12}>
                <Text strong style={{ fontSize: getResponsiveFontSize(16) }}>
                  Target Host or IP:
                </Text>
                <Input
                  placeholder="e.g., google.com or 8.8.8.8"
                  value={target}
                  onChange={(e) =>
                    setState((prev) => ({ ...prev, target: e.target.value }))
                  }
                  onPressEnter={runDiagnostic}
                  style={{ width: "100%", marginTop: getResponsiveValue(8) }}
                  size="large"
                  disabled={isLoading}
                />
              </Col>
              <Col xs={24}>
                <Button
                  type="primary"
                  icon={<PlayCircleFilled />}
                  onClick={runDiagnostic}
                  loading={isLoading}
                  disabled={!target}
                  size="large"
                  block
                  style={{ height: getResponsiveValue(50, 0.05) }}
                >
                  Run Diagnostic
                </Button>
              </Col>
            </Row>

            {artifacts[`${activeTool}-${target}`] &&
              !isLoading &&
              !output &&
              !error && (
                <Alert
                  message="Cached results available."
                  description="Results for this query are available from a previous run. Click 'Run Diagnostic' to load them instantly."
                  type="info"
                  showIcon
                  style={{ marginTop: getResponsiveValue(16), borderRadius: 8 }}
                />
              )}
          </Card>

          {error && (
            <Alert
              message="Operation Error"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setState((prev) => ({ ...prev, error: null }))}
              style={{ borderRadius: 8, marginBottom: getResponsiveValue(24) }}
            />
          )}

          {renderResults}

          <div style={{ marginTop: getResponsiveValue(32) }}>
            <Title
              level={4}
              style={{
                marginBottom: getResponsiveValue(16),
                textAlign: "center",
                fontSize: getResponsiveFontSize(22),
              }}
            >
              Explore Other Tools
            </Title>
            <Row gutter={[getResponsiveValue(16), getResponsiveValue(16)]}>
              {TOOLS.map((tool) => (
                <Col xs={12} sm={8} md={6} key={tool.id}>
                  <Card
                    hoverable
                    onClick={() => !isLoading && setActiveTool(tool.id)}
                    style={{
                      textAlign: "center",
                      cursor: "pointer",
                      borderRadius: 8,
                      height: "100%",
                      padding: getResponsiveValue(16),
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                      transition: "all 0.3s ease",
                      border: "1px solid #e8e8e8",
                    }}
                    bodyStyle={{ padding: 0 }}
                  >
                    <div
                      style={{
                        fontSize: getResponsiveFontSize(40),
                        marginBottom: getResponsiveValue(8),
                        color: customTheme.token.colorPrimary,
                        lineHeight: 1,
                      }}
                    >
                      {React.cloneElement(tool.icon, {
                        style: { fontSize: getResponsiveFontSize(40) },
                      })}
                    </div>
                    <Text
                      strong
                      style={{
                        fontSize: getResponsiveFontSize(16),
                        display: "block",
                        marginTop: getResponsiveValue(8),
                      }}
                    >
                      {tool.name}
                    </Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </Content>
        <Footer
          style={{
            textAlign: "center",
            background: customTheme.components.Layout.footerBg,
            padding: `${getResponsiveValue(16)}px ${getResponsiveValue(24)}px`,
            borderTop: "1px solid #e8e8e8",
            color: "white",
          }}
        >
          <Text style={{ color: "white", fontSize: getResponsiveFontSize(14) }}>
            Network Diagnostics Tool ©{new Date().getFullYear()}
          </Text>
        </Footer>
      </Layout>
    </ConfigProvider>
  );
}

export default function AppWrapper() {
  return (
    <AuthProvider>
      <ResponsiveProvider>
        <App />
      </ResponsiveProvider>
    </AuthProvider>
  );
}
