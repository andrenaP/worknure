import axios from "axios";

const API_URL = "http://localhost:3000";

export const fetchAllJobs = async () => {
  const res = await axios.get(`${API_URL}/jobs`);
  console.log(res);
  return res.data;
};

export const fetchUserSubscriptions = async (token) => {
  const res = await axios.get(`${API_URL}/user/subscriptions`, {
    headers: { Authorization: token },
  });
  return res.data.map((job) => job.id);
};

export const subscribeToJob = async (jobId, token) => {
  await axios.post(
    `${API_URL}/subscribe`,
    { job_id: jobId },
    { headers: { Authorization: token } },
  );
};

export const unsubscribeFromJob = async (jobId, token) => {
  await axios.post(
    `${API_URL}/unsubscribe`,
    { job_id: jobId },
    { headers: { Authorization: token } },
  );
};
