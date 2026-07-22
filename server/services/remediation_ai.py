import os
import json
from google import genai
from google.genai import types

def get_gemini_client():
    # Set the credentials env var if not already set (for Vertex AI)
    creds_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "credentials", "google.json")
    if os.path.exists(creds_path) and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path
        
    project_id = "foresight-503112"
    if os.path.exists(creds_path):
        with open(creds_path, 'r') as f:
            creds = json.load(f)
            project_id = creds.get("project_id", project_id)
    
    # Initialize client for Vertex AI
    # Defaults to us-central1
    client = genai.Client(vertexai=True, project=project_id, location="us-central1")
    return client

def analyze_incident_with_ai(incident: dict, topology: dict):
    client = get_gemini_client()
    
    # Prevent data leakage: only give the AI the raw metrics and anomaly alerts, NOT the simulation's title or summary.
    sanitized_incident = {
        "anomalous_components": [
            {
                "component": s.get("component"),
                "detected_fault": s.get("faultType"),
                "severity": s.get("severity")
            }
            for s in incident.get("stages", [])
        ],
        "metrics_before": incident.get("beforeMetrics", {}),
        "metrics_peak": incident.get("peakMetrics", {})
    }

    prompt = f"""
    You are an expert AI DevOps and Site Reliability Engineer (SRE).
    A severe incident has occurred in the system. Analyze the provided topology map, incident anomalies, and metrics, and produce a structured, hierarchical Root Cause Analysis and Impact Report.
    
    Guidelines:
    1. **Root Cause Analysis**: Use a clear bulleted hierarchy.
       - **Primary Failure**: 1-2 sentences on what broke first.
       - **Cascade Effect**: Bullet points on how it affected dependencies.
       - **Key Metrics**: 1 concise point on the most critical metric shift.
       Keep it concise and highly scannable. Do NOT write walls of text.
    2. **Impact Analysis**: Use a clear bulleted hierarchy.
       - **Business Impact**: 1 sentence summary.
       - **System Impact**: Concise bullet points for each affected service and its degradation.
    3. **Formatting**: Use markdown bolding for emphasis on service names and metrics.
       - IMPORTANT: Do NOT include top-level headings like "# Root Cause Analysis" or "# Impact Analysis" in your output text. We already have titles for these sections in the UI. Just provide the bullet points directly.

    Topology Data (Service Map):
    {json.dumps(topology, indent=2)}

    Monitoring Data (Anomalies & Metrics before/during the incident):
    {json.dumps(sanitized_incident, indent=2)}

    Please respond with a JSON object strictly matching this schema:
    {{
      "rootCause": "A concise, hierarchically structured markdown summary using bullet points (Primary Failure, Cascade Effect).",
      "affectedServices": ["list", "of", "service", "names", "based", "on", "topology"],
      "impact": "A concise, hierarchically structured markdown breakdown (Business Impact, System Impact).",
      "remediationPlan": [
        {{
          "step": "Short Step Name",
          "description": "A clear, actionable markdown description of how to execute this step.",
          "type": "automated" // or "requires_approval" for actions that critically affect the system
        }}
      ],
      "flawsDetected": ["Brief flaw 1", "Brief flaw 2"],
      "preventiveMeasures": ["Brief measure 1", "Brief measure 2"]
    }}
    
    Ensure your response is valid JSON and nothing else.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        # Return a fallback or raise
        raise RuntimeError(f"Failed to analyze incident with AI: {str(e)}")
