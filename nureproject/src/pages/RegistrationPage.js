import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./RegistrationPage.css";

const API_URL = "http://localhost:3000";

function RegistrationPage() {
  const [regData, setRegData] = useState({
    username: "",
    password: "",
    role: "worker",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setRegData({ ...regData, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    try {
      const { username, password, role } = regData;
      await axios.post(`${API_URL}/register`, { username, password, role });
      alert("Реєстрація виконана успішно");
      navigate("/"); // Возвращаемся на главную страницу
      console.log(username, password, role);
    } catch (error) {
      alert(
        "Помилка реєстрації: " +
          (error.response?.data?.message || error.message),
      );
    }
  };

  const handleExit = () => {
    navigate("/"); // Возврат на главную страницу
  };

  return (
    <div className="registration-container">
      <h2>Реєстрація</h2>
      <input
        type="text"
        name="username"
        placeholder="Користувач"
        value={regData.username}
        onChange={handleChange}
      />
      <input
        type="password"
        name="password"
        placeholder="Пароль"
        value={regData.password}
        onChange={handleChange}
      />
      <select name="role" value={regData.role} onChange={handleChange}>
        <option value="worker">Робочий</option>
        <option value="employer">Роботодавець</option>
      </select>
      <button onClick={handleRegister}>Зареєструватись</button>
      <button onClick={handleExit}>Назад</button>
    </div>
  );
}

export default RegistrationPage;
