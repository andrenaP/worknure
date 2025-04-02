import React, { useState, useEffect } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import SettingPageW from "./pages/SettingPageW";
import SettingPageE from "./pages/SettingPageE"; // Импортируем страницу для работодателя
import './App.css';

const API_URL = "http://localhost:3000";

function App() {
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/jobs`);
      setJobs(response.data);
    } catch (error) {
      console.error("Error fetching jobs", error);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const HomePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user] = useState({role: localStorage.role});

    const handleLoginClick = () => {
      navigate("/login");
    };

    const handleRegisterClick = () => {
      navigate("/register");
    };

    const handleSettingsClick = () => {
      if (user?.role === "employer") {
        navigate("/settings-employer");
      } else if (user?.role === "worker") {
        navigate("/settings-worker");
      } else {
        console.log(user)
        alert("Сначала войдите в систему");
      }
    };

    const handleSubscribeJob = async (jobId) => {
      if (!user || user.role !== "worker") {
        alert("Требуется авторизация как работник");
        return;
      }
      try {
        await axios.post(
          `${API_URL}/subscribe`,
          { job_id: jobId },
          { headers: { Authorization: user.token } }
        );
        alert("Subscribed successfully");
      } catch (error) {
        alert("Subscription failed");
      }
    };

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
            {jobs.map((job) => (
              <li key={job.id}>
                {job.name} - ${job.salary}
                {user?.role === "worker" && (
                  <button onClick={() => handleSubscribeJob(job.id)}>Subscribe</button>
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
        <Route path="/settings-worker" element={<SettingPageW />} />
        <Route path="/settings-employer" element={<SettingPageE />} /> {/* Новый маршрут */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;