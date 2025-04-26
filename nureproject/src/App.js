import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import SettingPage from "./pages/SettingPage";
import {
  getJobs,
  getSubscribedJobIds,
  subscribeJob,
  unsubscribeJob,
} from "./controllers/jobController";
import "./App.css";

const App = () => {
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [subscribedJobIds, setSubscribedJobIds] = useState([]);

  const userRole = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  useEffect(() => {
    getJobs(setJobs);
    if (userRole === "worker" && token) {
      getSubscribedJobIds(setSubscribedJobIds, token);
    }
  }, []);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const HomePage = () => {
    const navigate = useNavigate();
    const handleLoginClick = () => navigate("/login");
    const handleRegisterClick = () => navigate("/register");
    const handleSettingsClick = () => {
      if (!userRole) {
        alert("Сначала войдите в систему");
        return;
      }
      navigate("/settings");
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
                      <button
                        onClick={() => unsubscribeJob(job.id, token, subscribedJobIds, setSubscribedJobIds)}
                      >
                        Отписаться
                      </button>
                    ) : (
                      <button
                        onClick={() => subscribeJob(job.id, token, subscribedJobIds, setSubscribedJobIds)}
                      >
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
