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
    
    prompt = f"""
    You are an expert AI DevOps and SRE (Site Reliability Engineer) Remediation Agent.
    An incident has occurred in the system. Analyze the following data and provide a concise root cause, impact, and remediation plan.
    Keep your explanations extremely brief, punchy, and easy to visualize. Use markdown formatting (like **bolding** and `-` lists) inside the text fields.

    Topology Data:
    {json.dumps(topology, indent=2)}

    Incident Data (including timeline stages, and metrics before/after):
    {json.dumps(incident, indent=2)}

    Please respond with a JSON object strictly matching this schema:
    {{
      "rootCause": "A concise, bulleted markdown summary of the root cause.",
      "affectedServices": ["list", "of", "service", "names", "based", "on", "topology"],
      "impact": "A concise, bulleted markdown summary of business and system impact.",
      "remediationPlan": [
        {{
          "step": "Short Step Name",
          "description": "Very brief markdown description (1 sentence).",
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
