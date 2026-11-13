// GBS Service API Client: payment.service.js
export const executeService = async (endpoint = '/', options = {}) => {
  try {
    const response = await fetch(`/api/v1${endpoint}`, options);
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default { executeService };
