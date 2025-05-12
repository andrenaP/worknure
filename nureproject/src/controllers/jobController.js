import axios from "axios";

const API_URL = "http://localhost:3000";

export const fetchJobs = async () => {
  try {
    const response = await axios.get(`${API_URL}/jobs`);
    return response.data;
  } catch (error) {
    console.error("Ошибка при получении работ", error);
    throw error;
  }
};

export const fetchSubscribedJobs = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/user/subscriptions`, {
      headers: { Authorization: token },
    });
    return response.data.map((job) => job.id);
  } catch (error) {
    console.error("Ошибка при получении подписок", error);
    throw error;
  }
};

export const handleSubscribeJob = async (jobId, token) => {
  try {
    await axios.post(
      `${API_URL}/subscribe`,
      { job_id: jobId },
      { headers: { Authorization: token } },
    );
    return jobId;
  } catch (error) {
    console.error("Ошибка при подписке", error);
    throw error;
  }
};

export const handleUnsubscribeJob = async (jobId, token) => {
  try {
    await axios.post(
      `${API_URL}/unsubscribe`,
      { job_id: jobId },
      { headers: { Authorization: token } },
    );
    return jobId;
  } catch (error) {
    console.error("Ошибка при отписке", error);
    throw error;
  }
};
