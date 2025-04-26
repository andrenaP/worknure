// src/controllers/jobController.js
import axios from "axios";

const API_URL = "http://localhost:3000";

export const getJobs = async () => {
  const response = await axios.get(`${API_URL}/jobs`);
  return response.data;
};

export const getSubscribedJobIds = async (token) => {
  const response = await axios.get(`${API_URL}/user/subscriptions`, {
    headers: { Authorization: token },
  });
  return response.data.map((job) => job.id);
};

export const subscribeJob = async (jobId, token) => {
  await axios.post(
    `${API_URL}/subscribe`,
    { job_id: jobId },
    { headers: { Authorization: token } }
  );
};

export const unsubscribeJob = async (jobId, token) => {
  await axios.post(
    `${API_URL}/unsubscribe`,
    { job_id: jobId },
    { headers: { Authorization: token } }
  );
};
