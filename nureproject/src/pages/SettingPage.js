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
  }, []);

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

      // Загружаем подписчиков для каждой вакансии
      res.data.forEach(async (job) => {
        try {
          const subsRes = await axios.get(`${API_URL}/job_subscribers/${job.id}`, {
            headers: { Authorization: localStorage.token },
          });
          setSubscribersMap(prev => ({ ...prev, [job.id]: subsRes.data }));
        } catch (err) {
          console.error(`Ошибка при получении подписчиков для job ${job.id}`, err);
        }
      });
    } catch (err) {
      console.error("Error fetching jobs", err);
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
      alert("Данные сохранены");
    } catch (err) {
      alert("Ошибка при сохранении");
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
      alert("Вакансия добавлена");
      setNewJob({ name: "", salary: "", description: "", tag: "medic" });
      fetchEmployerJobs();
    } catch (err) {
      alert("Ошибка при добавлении вакансии");
    }
  };

  const handleDeleteJob = async (id) => {
    try {
      await axios.delete(`${API_URL}/jobs/${id}`, {
        headers: { Authorization: localStorage.token },
      });
      fetchEmployerJobs();
    } catch (err) {
      alert("Ошибка при удалении");
    }
  };

  if (!user) return <div>Загрузка...</div>;

  return (
    <div className="settings-container">
      <h2>Настройки пользователя</h2>

      {/* Общее */}
      <input
        type="text"
        name="first_name"
        placeholder="Имя"
        value={settings.first_name}
        onChange={handleChange}
      />
      <input
        type="text"
        name="last_name"
        placeholder="Фамилия"
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
          <label>Специализация</label>
          <select
            name="job_tag"
            value={settings.job_tag}
            onChange={handleChange}
          >
            <option value="medic">Медик</option>
            <option value="teacher">Учитель</option>
            <option value="builder">Строитель</option>
            <option value="engineer">Инженер</option>
            <option value="astronaut">Космонавт</option>
          </select>
        </>
      )}
      <button onClick={handleSave}>Сохранить</button>
      <button onClick={handleExit}>Выйти</button>

      {/* Раздел для работодателя */}
      {user.role === "employer" && (
        <div className="employer-section">
          <h3>Добавить вакансию</h3>
          <input
            type="text"
            name="name"
            placeholder="Название"
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
            placeholder="Описание"
            value={newJob.description}
            onChange={handleJobChange}
          />
          <select
            name="tag"
            value={newJob.tag}
            onChange={handleJobChange}
          >
            <option value="medic">Медик</option>
            <option value="teacher">Учитель</option>
            <option value="builder">Строитель</option>
            <option value="engineer">Инженер</option>
            <option value="astronaut">Космонавт</option>
          </select>
          <button onClick={handleAddJob}>Добавить вакансию</button>

          <h3>Ваши вакансии</h3>
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
