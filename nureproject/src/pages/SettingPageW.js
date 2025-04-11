import React, { useState,useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './SettingPageW.css';

const API_URL = "http://localhost:3000";



function SettingPageW() {
  const [settings, setSettings] = useState({
    first_name: "",
    last_name: "",
    email: "",
    job_tag: "medic" // Значение по умолчанию для выпадающего списка
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };


  useEffect(() => {
    fetchuser();
  }, []);

  const fetchuser = async () => {
    try {
      const response = await axios.get(`${API_URL}/user`, { headers: { Authorization: localStorage.token } });
      setSettings(response.data);
    } catch (error) {
      console.error("Error fetching user", error);
    }
  };

  const handleSave = async () =>  {
    alert("Настройки сохранены: " + JSON.stringify(settings));
    // Позже можно добавить: await axios.put(`${API_URL}/worker/settings`, settings, { headers: { Authorization: token } });
    const response = await axios.post(`${API_URL}/user`, settings, { headers: { Authorization: localStorage.token } });
  };

  const handleExit = () => {
    navigate("/");
  };

  return (
    <div className="settings-container">
      <h2>Настройки рабочего</h2>
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
        placeholder="last_name" 
        value={settings.last_name}
        onChange={handleChange}
      />
      <input 
        type="text" 
        name="email"
        placeholder="Mail" 
        value={settings.email}
        onChange={handleChange}
      />
      {/* <input 
        type="text" 
        name="skills"
        placeholder="Навыки (через запятую)" 
        value={settings.skills}
        onChange={handleChange}
      />
      <input 
        type="number" 
        name="experience"
        placeholder="Опыт работы (лет)" 
        value={settings.experience}
        onChange={handleChange}
      /> */}
      <select name="job_tag" value={settings.job_tag} onChange={handleChange}>
        <option value="medic">Медик</option>
        <option value="teacher">Учитель</option>
        <option value="builder">Строитель</option>
        <option value="engineer">Инженер</option>
        <option value="astronaut">Космонавт</option>
      </select>
      <button onClick={handleSave}>Сохранить</button>
      <button onClick={handleExit}>Выйти</button>
    </div>
  );
}

export default SettingPageW;