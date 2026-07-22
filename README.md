<h1 align="center">🛡️ Foresight — AI-Driven IT Incident Prediction & Financial Risk Detection</h1>

<p align="center">
  <strong>An intelligent monitoring and prediction system capable of integrating operational and financial data, predicting outages, detecting transaction fraud, and providing automated AI remediation support.</strong>
</p>

<p align="center">
  <em><b>Foresight</b> — Shifting from reactive monitoring to proactive prediction for enterprise IT operations.</em><br/>
</p>

<p align="center">
  <b>🚀 <a href="#">Live Demo (Coming Soon)</a></b> •
  <b>🎥 <a href="#">Watch our Pitching Video</a></b>
</p>

<div align="center">
  <h3>🔑 Test Credentials (Demo Accounts)</h3>
  <p>To explore the platform, sign in using these pre-configured credentials (if authentication is enabled):</p>
  <table style="margin: 0 auto; text-align: left; border-collapse: collapse;">
    <thead>
      <tr style="border-bottom: 2px solid #ddd;">
        <th style="padding: 10px 15px;">Role</th>
        <th style="padding: 10px 15px;">Email</th>
        <th style="padding: 10px 15px;">Password</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px 15px;">🛠️ <b>SRE / DevOps</b></td>
        <td style="padding: 10px 15px;"><code>sre@foresight.app</code></td>
        <td style="padding: 10px 15px;"><code>12345678</code></td>
      </tr>
      <tr>
        <td style="padding: 10px 15px;">💼 <b>Financial Analyst</b></td>
        <td style="padding: 10px 15px;"><code>analyst@foresight.app</code></td>
        <td style="padding: 10px 15px;"><code>12346578</code></td>
      </tr>
    </tbody>
  </table>
</div>

---

## 👥 Team Details & Responsibilities

* **Team Name**: [Your Team Name]

| Member | Role | Responsibility |
| :--- | :--- | :--- |
| **[Chun Yao Ting]** | Leader | **Backend & ML Architecture**: Developing the FastAPI service, training Scikit-Learn models, and managing data pipelines. |
| **[Angela Ngu Xin Yi]** | Member | **Frontend & Data Visualization**: Developing the React UI, interactive dashboard widgets, live telemetry charts, and financial monitor. |
| **[Evelyn Ang]** | Member | **AI Models & Intelligence**: Developing Gemini-powered incident analysis, remediation planning, and RAG-based context integration. |
| **[Teoh Xin Yee]** | Member | **Core Logic & Integration**: Implementing topology-aware correlation, real-time WebSocket ingestion, and SRE feedback loops. |

---

## 📋 Project Overview

### Problem Statement
Modern enterprises rely heavily on complex IT environments consisting of cloud platforms, enterprise applications, databases, and financial systems distributed across multiple regions. Any unexpected system outage or financial anomaly can directly affect business continuity and reputation.
Traditionally, IT support responds to incidents only after users report problems, and fraud detection relies on reactive business rules. Modern IT environments generate massive volumes of system logs, metrics, and transaction records that are difficult for human operators to analyze in real time.

### 💡 Proposed Solution
**Foresight** addresses these challenges by acting as a proactive, intelligent cockpit for SREs and Financial Analysts:
* **Real-Time Operational Risk Dashboard**: Provides real-time visibility into infrastructure health, throughput, latency, and error rates across all microservices.
* **Accurate Prediction of IT Incidents**: Uses unsupervised and supervised machine learning (`IsolationForest`, `GradientBoostingClassifier`) to detect metrics anomalies and predict system outages *before* they escalate.
* **Financial Anomaly Detection**: Uses a `RandomForestClassifier` to detect fraudulent financial transactions based on causal historical features, correlating them with infrastructure events using a topology map to avoid false positives during system failures.
* **Automated AI Remediation (Gemini)**: Acts as an AI SRE Agent to analyze incidents, identify root causes, and propose structured, safety-classified remediation steps.

### 📈 Compelling Market Opportunity
Foresight tackles a massive and growing problem for global enterprises:
* **Cost of Downtime**: According to Gartner, the average cost of IT downtime is **$5,600 per minute**, translating to over **$300,000 per hour**. For financial institutions, this cost is significantly higher due to lost transaction revenue.
* **Financial Fraud Escalation**: Global losses from payment fraud are projected to exceed **$40 billion annually by 2027**. 
* **The AIOps Market**: The global AIOps (Artificial Intelligence for IT Operations) market is projected to grow from **$11.7 billion in 2023 to $32.4 billion by 2028**.
There is a clear, data-backed demand for a unified platform that bridges the gap between IT operational health and financial security.

### 🚀 Breakthrough Innovation & Methodology
Unlike traditional Application Performance Monitoring (APM) tools (like Datadog or New Relic) that rely on isolated alerts, Foresight introduces a **totally new paradigm** combining AI with deep system context:
1. **Cross-Domain Topology Understanding**: It is the first platform to deterministically link infrastructural degradations directly to financial transaction failures in real-time, eliminating false positive fraud alerts caused by backend outages.
2. **Customized Rule-Based Thresholds & Escalation Routing**: Rather than relying purely on black-box AI, the system merges unsupervised ML (`IsolationForest`) with user-customized, rule-based thresholds configurable in the settings. When anomalies are detected, an intelligent escalation routing engine ensures the right team (SRE vs. Financial Analyst) is notified instantly based on the topology impact.
3. **Three-Tier Safety Architecture for AI Remediation**: To solve the danger of autonomous AI executing infrastructure changes incorrectly, the Gemini-powered SRE agent strictly categorizes all generated remediation plans into three tiers: **Automated Execution**, **Manual Approval Required**, or **Escalate to Human**. This ensures absolute safety and control over AI actions.
4. **Experience Memory (Human-in-the-Loop)**: By capturing SRE feedback on rejected remediation steps and injecting it into future AI contexts, the system continuously learns the specific operational boundaries of *your* enterprise—a highly inventive approach to safe, self-improving AI automation.
5. **Methodology Alignment**: This hybrid technical approach—fast ML for high-throughput novelty detection, deterministic topology graphs, and LLM-driven structured reasoning—perfectly aligns with the project goal of creating a highly accurate, computationally feasible real-time operations center.



### 💡 System Features

| Feature | Explanation |
| :--- | :--- |
| **Live Telemetry & Dashboard** | Aggregates high-volume metrics (CPU, Memory, Latency, RPS) via real-time WebSockets, downsampled for performant dashboard rendering. |
| **Topology-Aware Correlation** | A deterministic rule engine that links flagged financial transactions to active infrastructure incidents on the component or its upstream dependencies. |
| **Predictive Forecasting** | Uses ML rolling-window feature engineering to forecast component metrics 30 minutes ahead, highlighting predicted anomaly windows. |
| **AI Incident Root Cause Analysis** | Utilizes Google Gemini to parse topology and telemetry data, generating structured Root Cause and Impact analyses. |
| **Safety-Tiered Remediation Plan** | Generates step-by-step mitigation plans classified by risk (Automated vs Requires Approval), allowing one-click execution or human escalation. |
| **Experience Memory (Human-in-the-Loop)** | Captures human SRE feedback on rejected remediation steps, injecting it into future LLM contexts to continuously improve AI accuracy. |

### SDG Alignment
* **SDG 9: Industry, Innovation, and Infrastructure**: Builds resilient infrastructure, promotes inclusive and sustainable industrialization, and fosters innovation by preventing critical downtime.
* **SDG 16: Peace, Justice, and Strong Institutions**: Combats financial fraud and illicit financial flows through proactive, ML-driven transaction monitoring.

---

## 🏗️ System Architecture

<p align="center">
  <img src="public/Foresight_Architecture Diagram.png" alt="System Architecture Diagram" width="800" />
  <br/>
</p>

---

## 🛠️ Technologies Used

* **Frontend**: React 18, Vite 5, Tailwind CSS, Lucide Icons, React Router.
* **Backend**: Python 3.10+, FastAPI, Uvicorn, WebSockets.
* **AI / ML**: Scikit-Learn (Isolation Forest, Gradient Boosting, Random Forest), Pandas, NumPy, Google Gemini (Vertex AI).
* **Data Processing**: Real-time event ingestion and deterministic rule engines.

---

## 🧩 Challenges and Approaches

### 1. Integrating Large Volumes of Data
* **Challenge**: The system must ingest massive amounts of infrastructure metrics and transaction data without dropping frames or freezing the UI.
* **Approach**: We implemented a real-time WebSocket ingestion pipeline (`/api/stream`) on the FastAPI backend. For the frontend, data is aggregated and dynamically downsampled (e.g., using linear regression interpolation) to ensure the DOM remains highly responsive.

### 2. Accurate Prediction & Reducing False Positives
* **Challenge**: High-frequency metrics trigger frequent false-positive alerts, causing SRE alert fatigue.
* **Approach**: Our `OutageDetector` uses a strict logical "AND" gate: an anomaly is only flagged if it exceeds a per-component historical z-score threshold (e.g., > 2.5) **and** is independently flagged by an unsupervised `IsolationForest` model. Furthermore, financial anomalies are cross-referenced with the service `topology.json` to prevent infra-induced errors (like retry storms) from being misclassified as fraud.

### 3. Safe Automated Response
* **Challenge**: Fully autonomous AI remediation can be dangerous if it executes destructive actions (e.g., dropping a database) incorrectly.
* **Approach**: The Gemini AI agent categorizes remediation steps by safety tiers (`automated`, `requires_approval`, `escalated`). We also implemented an **Experience Memory** system: if an SRE rejects a step, their feedback is logged and included in future AI prompts, ensuring the system learns operational boundaries over time.

---

## 💻 Usage Instructions

### 1. Prerequisites
* **Node.js**: Version 18.0.0 or higher.
* **Python**: Version 3.10 or higher.

### 2. Installation & Setup

**Clone the Repository**:
```bash
git clone <repository-url>
cd foresight
```

**Frontend Setup**:
```bash
npm install
```

**Backend Setup**:
```bash
# Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r server/requirements.txt
pip install -r ml/requirements.txt
```

**Configure Environment Variables**:
Create a `credentials/google.json` file with your Google Cloud Vertex AI credentials, or set up the API key natively depending on your Gemini configuration.

### 3. Running Locally

**Start the Backend Server** (from the root directory):
```bash
python -m server.main
```
* Backend API & WebSockets will run on `http://localhost:8000`

**Start the Frontend Dev Server**:
```bash
npm run dev
```
* Local UI URL: `http://localhost:5173`

---

## 🌍 Social Impact

Foresight provides a positive impact on both the technology industry and the broader financial ecosystem:

* **Protecting the Digital Economy**: By predicting outages before they happen, critical digital services (banking, healthcare, logistics) remain online, preventing widespread disruption to consumers and businesses.
* **Preventing Financial Fraud**: The real-time ML transaction monitor actively detects and blocks suspicious activities, safeguarding consumer wealth and reducing illicit financial flows.
* **Reducing SRE Burnout**: By filtering out false-positive alerts, automating safe remediation tasks, and generating instant root-cause analyses, Foresight significantly reduces the cognitive load and burnout experienced by IT and DevOps professionals.

---

## 🔮 Future Improvements

1. **Incremental Online Learning**: Transition from static, startup-trained ML models to continuous online learning where models update their coefficients based on incoming WebSocket telemetry streams.
2. **Persistent Database Integration**: Replace in-memory Pandas dataframes and JSON logs with a robust time-series database (e.g., InfluxDB or Prometheus) for metrics, and PostgreSQL for persisting Experience Memory logs.
3. **Advanced Semantic Search**: Implement vector embeddings for past incident reports, allowing SREs to query the system (e.g., *"Show me all past incidents related to connection pool exhaustion during Black Friday"*).
4. **Autonomous Execution Webhooks**: Connect the `automated` remediation plans directly to Kubernetes APIs or Terraform to actually execute the infrastructure changes in real-time.

---

## 🎯 Implementation Plan

To scale Foresight from a hackathon prototype to an enterprise-grade production system, we have defined a robust implementation plan leveraging industry-standard infrastructure:

* **Phase 1 (Data Ingestion & Streaming Backbone)**: Replace the current direct WebSocket/FastAPI ingestion with **Apache Kafka** or **Amazon Kinesis**. This ensures high-throughput, fault-tolerant real-time data pipelines capable of handling enterprise-scale telemetry and financial transactions without data loss.
* **Phase 2 (Dynamic Topology & API Integration)**: Rather than relying on a static `topology.json`, integrate with **AWS API Gateway** and AWS X-Ray (or AWS App Mesh) to dynamically discover microservice topologies and fetch real-time dependency data.
* **Phase 3 (Execution & Remediation Loop)**: Connect the safety-tiered AI remediation plans (the `automated` tier) directly to **Kubernetes APIs** and **Terraform Cloud webhooks** to execute infrastructure self-healing in real-time.
* **Phase 4 (Storage & Persistence)**: Transition in-memory Pandas DataFrames and JSON logs to a robust time-series database like **Prometheus** (for metrics) and **PostgreSQL** (for persisting Experience Memory and user settings).
