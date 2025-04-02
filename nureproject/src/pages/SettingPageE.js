import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SettingPageE.css';

function SettingPageE() {
  const [settings, setSettings] = useState({
    firstName: "",
    lastName: "",
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

  const handleSave = () => {
    // Здесь можно добавить запрос к API для сохранения настроек
    const dataToSave = { ...settings, jobs };
    alert("Настройки сохранены: " + JSON.stringify(dataToSave));
    // Например: await axios.put(`${API_URL}/employer/settings`, dataToSave, { headers: { Authorization: token } });
  };

  const handleCancel = () => {
    navigate("/"); // Возврат на главную страницу
  };

  return (
    <div className="settings-employer-container">
      <h2>Настройки работодателя</h2>
      
      <input 
        type="text" 
        name="firstName"
        placeholder="Имя" 
        value={settings.firstName}
        onChange={handleChange}
      />
      <input 
        type="text" 
        name="lastName"
        placeholder="Фамилия" 
        value={settings.lastName}
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