import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

const API_URL = "http://localhost:3000";

function LoginPage() {
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
    role: "worker",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleLogin = async () => {
    const { username, password } = loginData;

    // Проверка на пустые поля
    if (!username || !password) {
      alert("Будь ласка, заповніть усі поля");
      return;
    }

    try {
      console.log("Відправляються дані:", { username, password }); // Для отладки
      const response = await axios.post(`${API_URL}/login`, {
        username,
        password,
      });

      const user = { token: response.data.token, role: response.data.role };
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", response.data.role);

      alert("Вхід виконано успішно");
      navigate("/", { state: { user } });
    } catch (error) {
      console.error("Помилка сервера:", error.response); // Для отладки
      alert(
        "Помилка входу: " + (error.response?.data?.message || "Login failed"),
      );
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="login-container">
      <h2>Вхід</h2>
      <input
        type="text"
        name="username"
        placeholder="Логин"
        value={loginData.username}
        onChange={handleChange}
      />
      <input
        type="password"
        name="password"
        placeholder="Пароль"
        value={loginData.password}
        onChange={handleChange}
      />
      {/* <select name="role" value={loginData.role} onChange={handleChange}>
        <option value="worker">Рабочий</option>
        <option value="employer">Работодатель</option>
      </select> */}
      <button onClick={handleLogin}>Войти</button>
      <button onClick={handleBack}>Назад</button>
    </div>
  );
}

export default LoginPage;
