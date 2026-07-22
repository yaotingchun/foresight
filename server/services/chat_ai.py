import os
import json
from google import genai
from google.genai import types

def get_gemini_client():
    creds_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "credentials", "google.json")
    if os.path.exists(creds_path) and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path
        
    project_id = "foresight-503112"
    if os.path.exists(creds_path):
        with open(creds_path, 'r') as f:
            creds = json.load(f)
            project_id = creds.get("project_id", project_id)
    
    client = genai.Client(vertexai=True, project=project_id, location="us-central1")
    return client

def chat_with_system_context(messages: list, system_context: dict):
    client = get_gemini_client()
    
    # Extract only the active incident if any, plus topology and business rules to keep context window tight
    context_str = json.dumps({
        "topology": system_context.get("topology"),
        "business_rules": system_context.get("businessContext"),
        "active_incidents": system_context.get("incidents", [])[:2], # top 2 recent
        "current_metrics": system_context.get("metrics")
    }, indent=2)
    
    system_instruction = f"""
You are the Foresight AI Assistant, a virtual Site Reliability Engineer (SRE).
You are helping the user manage their microservices architecture.
Use the following real-time system context to answer their questions accurately.

SYSTEM CONTEXT:
{context_str}

Guidelines:
1. Be concise, helpful, and professional.
2. If asked about the current state, reference the active incidents or metrics from the context.
3. If asked for recommendations, refer to the business rules if applicable.
4. Format your responses using markdown for readability (e.g. bolding service names).
"""

    gemini_messages = []
    for m in messages:
        role = "user" if m.get("role") == "user" else "model"
        gemini_messages.append(types.Content(role=role, parts=[types.Part.from_text(text=m.get("content"))]))

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=gemini_messages,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4,
            ),
        )
        return response.text
    except Exception as e:
        print(f"Error calling Gemini Chat: {e}")
        return "I'm sorry, I am currently experiencing connection issues and cannot answer your request."
