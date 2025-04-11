import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import SettingPage from "./pages/SettingPage"; // Объединённая страница настроек
import "./App.css";

const API_URL = "http://localhost:3000";

const App = () => {
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [subscribedJobIds, setSubscribedJobIds] = useState([]);

  const userRole = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchJobs();
    if (userRole === "worker" && token) {
      fetchSubscribedJobs();
    }
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/jobs`);
      setJobs(response.data);
    } catch (error) {
      console.error("Ошибка при получении работ", error);
    }
  };

  const fetchSubscribedJobs = async () => {
     if(localStorage.token){
      const response = await axios.get(`${API_URL}/user/subscriptions`, {
        headers: { Authorization: localStorage.token },
      });
      setSubscribedJobIds(response.data.map((job) => job.id));
    }

  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const HomePage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLoginClick = () => navigate("/login");
    const handleRegisterClick = () => navigate("/register");
    const handleSettingsClick = () => {
      if (!userRole) {
        alert("Сначала войдите в систему");
        return;
      }
      navigate("/settings");
    };

    const handleSubscribeJob = async (jobId) => {
      try {
        await axios.post(
          `${API_URL}/subscribe`,
          { job_id: jobId },
          { headers: { Authorization: token } }
        );
        setSubscribedJobIds([...subscribedJobIds, jobId]);
      } catch (error) {
        console.error("Ошибка при подписке", error);
        alert("Не удалось подписаться");
      }
    };

    const handleUnsubscribeJob = async (jobId) => {
      try {
        await axios.post(
          `${API_URL}/unsubscribe`,
          { job_id: jobId },
          { headers: { Authorization: token } }
        );
        setSubscribedJobIds(subscribedJobIds.filter((id) => id !== jobId));
      } catch (error) {
        console.error("Ошибка при отписке", error);
        alert("Не удалось отписаться");
      }
    };

    const filteredJobs = jobs.filter((job) =>
      job.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="app-container">
        <header className="header">
          <h1 className="nurework-title">Nurework</h1>
          <div className="search-container">
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
            />
            <button className="search-button">Найти</button>
          </div>
          <div className="nav-buttons">
            <button onClick={handleLoginClick}>Вход</button>
            <button onClick={handleRegisterClick}>Регистрация</button>
            <button onClick={handleSettingsClick}>Настройки</button>
          </div>
        </header>

        <main>
          <ul className="jobs-list">
            {filteredJobs.map((job) => (
              <li key={job.id}>
                <strong>{job.name}</strong> — {job.salary}₴
                <br />
                <em>{job.description}</em>
                {userRole === "worker" && (
                  <div>
                    {subscribedJobIds.includes(job.id) ? (
                      <button onClick={() => handleUnsubscribeJob(job.id)}>
                        Отписаться
                      </button>
                    ) : (
                      <button onClick={() => handleSubscribeJob(job.id)}>
                        Подписаться
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </main>
      </div>
    );
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/settings" element={<SettingPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
