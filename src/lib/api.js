/**
 * API Client for the Foresight Backend
 */

export const api = {
  /**
   * Check if the backend is running and ML models are initialized
   */
  async getStatus() {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('API Error (getStatus):', error);
      return { status: 'error', ml_initialized: false };
    }
  },

  /**
   * Predict fraud for a transaction
   * @param {Object} transaction 
   */
  async predictFraud(transaction) {
    try {
      const response = await fetch('/api/predict/fraud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('API Error (predictFraud):', error);
      throw error;
    }
  },

  /**
   * Predict outage for a component's metrics
   * @param {Object} metrics 
   */
  async predictOutage(metrics) {
    try {
      const response = await fetch('/api/predict/outage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('API Error (predictOutage):', error);
      throw error;
    }
  },

  /**
   * Analyze an incident using AI
   * @param {Object} incident 
   */
  async analyzeIncident(incident) {
    try {
      const response = await fetch('/api/analyze-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incident),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('API Error (analyzeIncident):', error);
      throw error;
    }
  }
};
