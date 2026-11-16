import api, { devApi } from './api';

export const feedbackService = {
  /**
   * Submit new feedback or issue report
   */
  submitFeedback: async (payload) => {
    const res = await api.post('/feedback', payload);
    return res.data;
  },

  /**
   * Get feedbacks list (scoped to user/tenant)
   */
  getFeedbacks: async (params = {}) => {
    const res = await api.get('/feedback', { params });
    return res.data;
  },

  /**
   * Respond to feedback (Company Owner / Management)
   */
  respondToFeedback: async (id, payload) => {
    const res = await api.post(`/feedback/${id}/respond`, payload);
    return res.data;
  },

  /**
   * Developer Authority: Get all system-wide feedbacks
   */
  getDeveloperFeedbacks: async (params = {}) => {
    const res = await devApi.get('/developer/feedbacks', { params });
    return res.data;
  },

  /**
   * Developer Authority: Respond to any feedback
   */
  respondDeveloperFeedback: async (id, payload) => {
    const res = await devApi.post(`/developer/feedbacks/${id}/respond`, payload);
    return res.data;
  },
};

export default feedbackService;
