import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import SettingPage from "./pages/SettingPage";
import {
  fetchJobs,
  fetchSubscribedJobs,
  handleSubscribeJob,
  handleUnsubscribeJob,
} from "./controllers/jobController";
import "./App.css";

const App = () => {
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [subscribedJobIds, setSubscribedJobIds] = useState([]);

  const userRole = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  useEffect(() => {
    const init = async () => {
      try {
        const jobsData = await fetchJobs();
        setJobs(jobsData);
        if (userRole === "worker" && token) {
          const subscribedIds = await fetchSubscribedJobs(token);
          setSubscribedJobIds(subscribedIds);
        }
      } catch (error) {
        console.error("Помилка під час ініціалізації даних", error);
      }
    };
    init();
  }, []);

  const subscribeJob = async (jobId) => {
    try {
      await handleSubscribeJob(jobId, token);
      setSubscribedJobIds([...subscribedJobIds, jobId]);
    } catch (error) {
      alert("Не вдалось підписатися");
    }
  };

  const unsubscribeJob = async (jobId) => {
    try {
      await handleUnsubscribeJob(jobId, token);
      setSubscribedJobIds(subscribedJobIds.filter((id) => id !== jobId));
    } catch (error) {
      alert("Не вдалося відписатись");
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const HomePage = () => {
    const navigate = useNavigate();
    const handleLoginClick = () => navigate("/login");
    const handleRegisterClick = () => navigate("/register");
    const handleSettingsClick = () => {
      if (!userRole) {
        alert("Спочатку увійдіть у систему");
        return;
      }
      navigate("/settings");
    };

    const filteredJobs = jobs.filter((job) =>
      job.name.toLowerCase().includes(searchQuery.toLowerCase()),
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
            <button className="search-button">Знайти</button>
          </div>
          <div className="nav-buttons">
            <button onClick={handleLoginClick}>Вхід</button>
            <button onClick={handleRegisterClick}>Реєстрація</button>
            <button onClick={handleSettingsClick}>Налаштування</button>
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
                      <button onClick={() => unsubscribeJob(job.id)}>
                        Відписатися
                      </button>
                    ) : (
                      <button onClick={() => subscribeJob(job.id)}>
                        Підписатися
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
