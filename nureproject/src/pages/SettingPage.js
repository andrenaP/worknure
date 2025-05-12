import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./SettingPage.css";

const API_URL = "http://localhost:3000";

function SettingPage() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    first_name: "",
    last_name: "",
    email: "",
    job_tag: "medic",
  });
  const [jobs, setJobs] = useState([]);
  const [subscribersMap, setSubscribersMap] = useState({});
  const [newJob, setNewJob] = useState({
    name: "",
    salary: "",
    description: "",
    tag: "medic",
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();

    // Short polling for subscribersMap when user is an employer
    let pollingInterval;
    if (user?.role === "employer") {
      pollingInterval = setInterval(fetchAllSubscribers, 10000); // Poll every 10 seconds
    }

    // Cleanup interval on component unmount or role change
    return () => clearInterval(pollingInterval);
  }, [user?.role]); // Re-run when user role changes

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/user`, {
        headers: { Authorization: localStorage.token },
      });
      setUser(res.data);
      setSettings({
        first_name: res.data.first_name || "",
        last_name: res.data.last_name || "",
        email: res.data.email || "",
        job_tag: res.data.job_tag || "medic",
      });

      if (res.data.role === "employer") {
        fetchEmployerJobs();
      }
    } catch (err) {
      console.error("Error fetching user", err);
    }
  };

  const fetchEmployerJobs = async () => {
    try {
      const res = await axios.get(`${API_URL}/employer_jobs`, {
        headers: { Authorization: localStorage.token },
      });
      setJobs(res.data);
      fetchAllSubscribers(res.data); // Initial fetch for subscribers
    } catch (err) {
      console.error("Error fetching jobs", err);
    }
  };

  const fetchAllSubscribers = async (jobsToFetch = jobs) => {
    try {
      const newSubscribersMap = {};
      for (const job of jobsToFetch) {
        const subsRes = await axios.get(
          `${API_URL}/job_subscribers/${job.id}`,
          {
            headers: { Authorization: localStorage.token },
          },
        );
        newSubscribersMap[job.id] = subsRes.data;
      }
      setSubscribersMap(newSubscribersMap);
    } catch (err) {
      console.error("Error fetching subscribers", err);
    }
  };

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await axios.post(`${API_URL}/user`, settings, {
        headers: { Authorization: localStorage.token },
      });
      alert("Дані збережені");
    } catch (err) {
      alert("Помилка при збереженні");
    }
  };

  const handleExit = () => {
    navigate("/");
  };

  const handleJobChange = (e) => {
    setNewJob({ ...newJob, [e.target.name]: e.target.value });
  };

  const handleAddJob = async () => {
    try {
      await axios.post(`${API_URL}/jobs`, newJob, {
        headers: { Authorization: localStorage.token },
      });
      alert("Вакансія додана");
      setNewJob({ name: "", salary: "", description: "", tag: "medic" });
      fetchEmployerJobs();
    } catch (err) {
      alert("Помилка при додаванні вакансії");
    }
  };

  const handleDeleteJob = async (id) => {
    try {
      await axios.delete(`${API_URL}/jobs/${id}`, {
        headers: { Authorization: localStorage.token },
      });
      fetchEmployerJobs();
    } catch (err) {
      alert("Помилка при видаленні");
    }
  };

  if (!user) return <div>Загрузка...</div>;

  return (
    <div className="settings-container">
      <h2>Налаштування користувача</h2>

      {/* Общее */}
      <input
        type="text"
        name="first_name"
        placeholder="Ім'я"
        value={settings.first_name}
        onChange={handleChange}
      />
      <input
        type="text"
        name="last_name"
        placeholder="Прізвище"
        value={settings.last_name}
        onChange={handleChange}
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={settings.email}
        onChange={handleChange}
      />
      {user.role === "worker" && (
        <>
          <label>Спеціалізація</label>
          <select
            name="job_tag"
            value={settings.job_tag}
            onChange={handleChange}
          >
            <option value="medic">Медик</option>
            <option value="teacher">Вчитель</option>
            <option value="builder">Будівельник</option>
            <option value="engineer">Інженер</option>
            <option value="astronaut">Космонавт</option>
          </select>
        </>
      )}
      <button onClick={handleSave}>Зберегти</button>
      <button onClick={handleExit}>Вийти</button>

      {/* Раздел для работодателя */}
      {user.role === "employer" && (
        <div className="employer-section">
          <h3>Додати вакансію</h3>
          <input
            type="text"
            name="name"
            placeholder="Назва"
            value={newJob.name}
            onChange={handleJobChange}
          />
          <input
            type="number"
            name="salary"
            placeholder="Зарплата"
            value={newJob.salary}
            onChange={handleJobChange}
          />
          <textarea
            name="description"
            placeholder="Опис"
            value={newJob.description}
            onChange={handleJobChange}
          />
          <select name="tag" value={newJob.tag} onChange={handleJobChange}>
            <option value="medic">Медик</option>
            <option value="teacher">Вчитель</option>
            <option value="builder">Будівельник</option>
            <option value="engineer">Інженер</option>
            <option value="astronaut">Космонавт</option>
          </select>
          <button onClick={handleAddJob}>Додати вакансію</button>

          <h3>Ваші вакансії</h3>
          <ul>
            {jobs.map((job) => (
              <li key={job.id}>
                <strong>{job.name}</strong> — {job.salary}₴
                <br />
                {job.description}
                <br />
                <button onClick={() => handleDeleteJob(job.id)}>Удалить</button>
                {subscribersMap[job.id] && (
                  <>
                    <h4>Подписчики:</h4>
                    <ul>
                      {subscribersMap[job.id].map((worker) => (
                        <li key={worker.id}>{worker.username}</li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SettingPage;
