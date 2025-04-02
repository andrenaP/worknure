import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SettingPageW.css';

function SettingPageW() {
  const [settings, setSettings] = useState({
    name: "",
    skills: "",
    experience: "",
    job: "medic" // Значение по умолчанию для выпадающего списка
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    alert("Настройки сохранены: " + JSON.stringify(settings));
    // Позже можно добавить: await axios.put(`${API_URL}/worker/settings`, settings, { headers: { Authorization: token } });
  };

  const handleExit = () => {
    navigate("/");
  };

  return (
    <div className="settings-container">
      <h2>Настройки рабочего</h2>
      <input 
        type="text" 
        name="name"
        placeholder="Имя" 
        value={settings.name}
        onChange={handleChange}
      />
      <input 
        type="text" 
        name="LastName"
        placeholder="LastName" 
        value={settings.name}
        onChange={handleChange}
      />
      <input 
        type="text" 
        name="Mail"
        placeholder="Mail" 
        value={settings.name}
        onChange={handleChange}
      />
      <input 
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
      />
      <select name="job" value={settings.job} onChange={handleChange}>
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