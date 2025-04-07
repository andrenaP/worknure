import React, { useState,useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './SettingPageE.css';

const API_URL = "http://localhost:3000";


function SettingPageE() {
  const [settings, setSettings] = useState({
    first_name: "",
    last_name: "",
    email: "",
    jobInfo: ""
  });
  const [jobs, setJobs] = useState([]); // Список добавленных работ
  const navigate = useNavigate();

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleAddJob = () => {
    if (settings.jobInfo.trim()) {
      setJobs([...jobs, settings.jobInfo]); // Добавляем работу в список
      setSettings({ ...settings, jobInfo: "" }); // Очищаем поле ввода
    } else {
      alert("Введите информацию о работе перед добавлением");
    }
  };

  useEffect(() => {
    fetchuser();
  }, []);

  const fetchuser = async () => {
    try {
      const response = await axios.get(`${API_URL}/user`, { headers: { Authorization: localStorage.token } });
      setSettings(response.data);
      console.log(response.data)
    } catch (error) {
      console.error("Error fetching user", error);
    }
  };



  const handleSave = async () =>  {
    // Здесь можно добавить запрос к API для сохранения настроек
    const dataToSave = { ...settings, jobs };
    alert("Настройки сохранены: " + JSON.stringify(dataToSave));
    // Например: await axios.put(`${API_URL}/employer/settings`, dataToSave, { headers: { Authorization: token } });
    console.log(dataToSave)
    const response = await axios.post(`${API_URL}/user`, dataToSave, { headers: { Authorization: localStorage.token } });
  };

  const handleCancel = () => {
    navigate("/"); // Возврат на главную страницу
  };

  return (
    <div className="settings-employer-container">
      <h2>Настройки работодателя</h2>
      
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
        placeholder="Почта" 
        value={settings.email}
        onChange={handleChange}
      />
      
      <div className="job-select-container">
        <select name="jobs" value="" onChange={(e) => setSettings({ ...settings, jobInfo: e.target.value })}>
          <option value="" disabled>Выберите работу</option>
          {jobs.map((job, index) => (
            <option key={index} value={job}>{job}</option>
          ))}
        </select>
        <button onClick={handleAddJob}>Добавить работу</button>
      </div>
      
      <textarea
        name="jobInfo"
        placeholder="Информация о работе"
        value={settings.jobInfo}
        onChange={handleChange}
        className="job-info-input"
      />
      
      <div className="action-buttons">
        <button onClick={handleSave}>Сохранить</button>
        <button onClick={handleCancel}>Отмена</button>
      </div>
    </div>
  );
}

export default SettingPageE;