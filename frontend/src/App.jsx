import { useState } from "react";
import axios from "axios";
import FuncionarioApp from "./areas/Funcionario/FuncionarioApp";
import GestorApp from "./areas/Gestor/GestorApp";
import { ThemeProvider } from "./context/ThemeContext";
import { StudioConfigProvider } from "./context/StudioConfigContext";

// pega da env, cai para localhost em desenvolvimento
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function App() {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [user, setUser] = useState(null);
  const [erro, setErro] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErro("");

    try {
      const resp = await axios.post(`${API_BASE}/auth/login`, {
        login,
        senha,
      });
      
      console.log("RESPOSTA DO LOGIN:", resp.data);
      
      // ✅ SALVAR O TOKEN TAMBÉM
      if (resp.data.token) {
        localStorage.setItem('token', resp.data.token);
      }
      
      if (resp.data.funcionario_id) {
        localStorage.setItem('user_id', resp.data.funcionario_id);
        localStorage.setItem('funcionario_id', resp.data.funcionario_id);
      }
      
      setUser(resp.data);
      
    } catch (err) {
      console.error("LOGIN ERRO", err.response?.status, err.response?.data);
      if (err.response?.status === 401) {
        setErro("Usuário ou senha inválidos.");
      } else {
        setErro("Erro ao conectar no servidor.");
      }
    }
  }


  function handleLogout() {
    window.location.reload();
  }

  // Tela de login
  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111",
        }}
      >
        <form
          onSubmit={handleLogin}
          style={{
            background: "#1e1e1e",
            padding: 24,
            borderRadius: 8,
            width: 320,
            color: "#fff",
            boxShadow: "0 0 12px rgba(0,0,0,0.5)",
          }}
        >
          <h2 style={{ marginBottom: 16 }}>Studio Manager - Login</h2>

          <label style={{ display: "block", marginBottom: 8 }}>
            Usuário
            <input
              style={{
                width: "100%",
                marginTop: 4,
                padding: 8,
                borderRadius: 4,
                border: "1px solid #333",
              }}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            Senha
            <input
              type="password"
              style={{
                width: "100%",
                marginTop: 4,
                padding: 8,
                borderRadius: 4,
                border: "1px solid #333",
              }}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </label>

          {erro && (
            <div style={{ color: "#f55", marginBottom: 8 }}>{erro}</div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: 10,
              marginTop: 8,
              borderRadius: 4,
              border: "none",
              background: "#ff4500",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  // trata funcionario, func e superadmin como "funcionário" para ver ficha
  const isFuncionario =
    user.tipo === "func" ||
    user.tipo === "funcionario";

  const isGestor = 
    user.tipo === "gestor" ||
    user.tipo === "superadmin";

    console.log("isFuncionario:", isFuncionario);
    console.log("user.tipo:", user.tipo); 

  // Depois de logado, envolve tudo com os providers
    return (
      <StudioConfigProvider apiBase={API_BASE}>
        <ThemeProvider>
          {isFuncionario ? (
            <FuncionarioApp
              user={user}
              apiBase={API_BASE}
              onLogout={handleLogout}
            />
          ) : isGestor ? (
            <GestorApp
              user={user}
              apiBase={API_BASE}
              onLogout={handleLogout}
            />
          ) : null}
        </ThemeProvider>
      </StudioConfigProvider>
    );
}

export default App;
