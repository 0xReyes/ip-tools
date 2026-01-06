import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Input,
  Tag,
  Table,
  Space,
  Typography,
  Card,
  Row,
  Col,
  Layout,
  Spin,
  Modal,
  Form,
  message,
  Divider,
} from "antd";

import {
  SearchOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  LinkOutlined,
  EditOutlined,
  FileTextOutlined,
  ApartmentOutlined,
  GlobalOutlined,
} from "@ant-design/icons";

import { AuthProvider, useAuth } from "./context/AuthProvider.js";

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// --- Helper for consistent styling ---
const theme = {
  primaryColor: "#4A90E2",
  textColor: "#333",
  textSecondaryColor: "#666",
  backgroundColor: "#f7f9fc",
  cardShadow: "0 4px 12px rgba(0,0,0,0.08)",
  borderRadius: "12px",
};

// --- Modal Component ---
const CoverLetterModal = ({ visible, onClose, job, onSave, initialData }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      initialData ? form.setFieldsValue(initialData) : form.resetFields();
    }
  }, [visible, initialData, form]);

  const handleSave = () => {
    form
      .validateFields()
      .then((values) => {
        onSave(job.id, values);
        onClose();
        message.success("Application notes saved!");
      })
      .catch((error) => console.error("Form validation failed:", error));
  };

  return (
    <Modal
      title={
        <Title level={4} style={{ margin: 0 }}>
          Notes for {job?.title} at {job?.company}
        </Title>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSave}>
          Save
        </Button>,
      ]}
      width={700}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="coverLetter" label="Cover Letter Snippets">
          <TextArea
            rows={6}
            placeholder="Jot down key points for your cover letter..."
          />
        </Form.Item>
        <Form.Item name="notes" label="General Notes">
          <TextArea
            rows={3}
            placeholder="Salary expectations, follow-up dates, contacts, etc."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// --- Header Component ---
const AppHeader = ({ onRefresh, isRefreshing }) => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <Header
      style={{
        background: "#fff",
        padding: "0 24px",
        borderBottom: "1px solid #e8e8e8",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Title level={3} style={{ margin: 0, color: theme.primaryColor }}>
        <ApartmentOutlined style={{ marginRight: 8 }} />
        engineers4hire
      </Title>
      <Space>
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={isRefreshing}
        >
          Refresh
        </Button>
        {isAuthenticated && (
          <Button danger onClick={logout}>
            Logout
          </Button>
        )}
      </Space>
    </Header>
  );
};

// --- Main App Component ---
function App() {
  const { isAuthenticated, loading, login, getJobData } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicationData, setApplicationData] = useState({});

  const loadJobs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await getJobData();
      const rawData = response.data;

      if (Array.isArray(rawData)) {
        const transformedData = rawData.map((item, index) => ({
          id: item.link || index,
          company: item.company_name || "N/A",
          title: item.title,
          location: "Remote",
          posted: item.date_fetched,
          source: item.source
            ? new URL(item.link).hostname.replace("www.", "")
            : "Unknown",
          link: item.link,
          snippet: item.snippet,
        }));
        setJobs(transformedData);
        setFilteredJobs(transformedData);
      } else {
        setJobs([]);
        setFilteredJobs([]);
      }
    } catch (error) {
      console.error("Error loading jobs:", error);
      message.error("Failed to load jobs.");
      setJobs([]);
      setFilteredJobs([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [getJobData]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const searchTerm = search.toLowerCase().trim();
    if (!searchTerm) {
      setFilteredJobs(jobs);
      return;
    }
    const filtered = jobs.filter(
      (job) =>
        job.title?.toLowerCase().includes(searchTerm) ||
        job.company?.toLowerCase().includes(searchTerm) ||
        job.snippet?.toLowerCase().includes(searchTerm)
    );
    setFilteredJobs(filtered);
  }, [search, jobs]);

  const handleEditApplication = useCallback((job) => {
    setSelectedJob(job);
    setModalVisible(true);
  }, []);

  const handleSaveApplication = useCallback((jobId, data) => {
    setApplicationData((prev) => ({ ...prev, [jobId]: data }));
  }, []);

  const columns = [
    {
      title: "Role",
      dataIndex: "title",
      key: "role",
      render: (text, record) => (
        <div>
          <Title
            level={5}
            style={{
              marginBottom: "4px",
              color: theme.textColor,
              fontWeight: 500,
            }}
          >
            {record.title}
          </Title>
          <Text type="secondary">{record.company}</Text>
        </div>
      ),
    },
    {
      title: "Details",
      key: "details",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>
            <EnvironmentOutlined
              style={{ color: theme.textSecondaryColor, marginRight: "8px" }}
            />{" "}
            {record.location}
          </Text>
          <Text type="secondary">
            <ClockCircleOutlined style={{ marginRight: "8px" }} />{" "}
            {record.posted}
          </Text>
        </Space>
      ),
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      render: (source) => (
        <Tag icon={<GlobalOutlined />} color="cyan">
          {source}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      render: (_, record) => {
        const hasNotes = !!applicationData[record.id];
        return (
          <Space>
            <Button
              icon={hasNotes ? <FileTextOutlined /> : <EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleEditApplication(record);
              }}
            >
              {hasNotes ? "View Notes" : "Add Notes"}
            </Button>
            <Button
              type="primary"
              icon={<LinkOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                window.open(record.link, "_blank");
              }}
            >
              Apply
            </Button>
          </Space>
        );
      },
    },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "100px 0" }}>
          <Spin size="large" />
          <Title level={5} type="secondary" style={{ marginTop: "20px" }}>
            Loading Application...
          </Title>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <Row
          justify="center"
          align="middle"
          style={{ minHeight: "calc(100vh - 65px)" }}
        >
          <Col>
            <Card
              style={{
                width: 350,
                textAlign: "center",
                boxShadow: theme.cardShadow,
                borderRadius: theme.borderRadius,
              }}
            >
              <Title level={3}>Welcome</Title>
              <Text type="secondary">Please log in to view job listings.</Text>
              <Divider />
              <Button type="primary" size="large" onClick={login} block>
                Login with Google
              </Button>
            </Card>
          </Col>
        </Row>
      );
    }

    return (
      <Content
        style={{
          padding: "24px",
          maxWidth: "1200px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Card
          style={{
            marginBottom: "24px",
            borderRadius: theme.borderRadius,
            boxShadow: theme.cardShadow,
          }}
        >
          <Input
            size="large"
            placeholder="Search by role, company, or keyword..."
            prefix={<SearchOutlined style={{ color: "#aaa" }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ borderRadius: "8px" }}
            allowClear
          />
        </Card>

        <Card
          style={{
            borderRadius: theme.borderRadius,
            boxShadow: theme.cardShadow,
            overflowX: "auto",
          }}
        >
          <Title level={4} style={{ marginBottom: 20 }}>
            Open Positions ({filteredJobs.length})
          </Title>
          <Table
            columns={columns}
            dataSource={filteredJobs}
            rowKey="id"
            loading={isRefreshing}
            pagination={{
              pageSize: 15,
              showSizeChanger: false,
              simple: true,
              position: ["bottomCenter"],
            }}
            expandable={{
              expandedRowRender: (record) => (
                <Paragraph
                  type="secondary"
                  style={{ margin: 0, padding: "8px 16px" }}
                >
                  {record.snippet}
                </Paragraph>
              ),
              rowExpandable: (record) => record.snippet,
            }}
            onRow={(record) => ({
              onClick: () => handleEditApplication(record),
              style: { cursor: "pointer" },
            })}
            rowClassName={() => "table-row-hover"}
          />
        </Card>

        {selectedJob && (
          <CoverLetterModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            job={selectedJob}
            onSave={handleSaveApplication}
            initialData={applicationData[selectedJob.id]}
          />
        )}
      </Content>
    );
  };

  return (
    <Layout style={{ minHeight: "100vh", background: theme.backgroundColor }}>
      <AppHeader onRefresh={loadJobs} isRefreshing={isRefreshing} />
      {renderContent()}
    </Layout>
  );
}

export default function AppWrapper() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
