import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "http://192.168.0.11:8000";

const inputStyle = {
  padding: 6,
  borderRadius: 4,
  border: "1px solid #ccc",
  fontSize: 14,
};

const thTdStyle = {
  border: "1px solid #ccc",
  padding: 8,
  fontSize: 14,
};

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [novoFunc, setNovoFunc] = useState({
    id: null,
    nome: "",
    cargo: "",
    perc_funcionario: 70,
    requer_aprovacao: true,
    senha: "",
  });
  const [editMode, setEditMode] = useState(false);

  async function carregarFuncionarios() {
    try {
      const resp = await axios.get(`${API_BASE}/funcionarios/`);
      setFuncionarios(resp.data);
    } catch (err) {
      console.error("Erro ao carregar funcionários:", err);
    }
  }

  async function salvarFuncionario() {
    if (!novoFunc.nome || !novoFunc.cargo) return;

    const payload = {
      nome: novoFunc.nome,
      cargo: novoFunc.cargo,
      perc_funcionario: novoFunc.perc_funcionario,
      requer_aprovacao: novoFunc.requer_aprovacao,
      senha: novoFunc.senha || null,
    };

    try {
      if (editMode && novoFunc.id != null) {
        await axios.put(`${API_BASE}/funcionarios/`, {
          id: novoFunc.id,
          ...payload,
        });
      } else {
        await axios.post(`${API_BASE}/funcionarios/`, payload);
      }

      setNovoFunc({
        id: null,
        nome: "",
        cargo: "",
        perc_funcionario: 70,
        requer_aprovacao: true,
        senha: "",
      });
      setEditMode(false);
      carregarFuncionarios();
    } catch (err) {
      console.error("Erro ao salvar funcionário:", err);
    }
  }

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  return (
    <>
      <h2>Funcionários</h2>

      {/* Formulário novo/edição */}
      <div
        style={{
          marginTop: 12,
          marginBottom: 16,
          padding: 12,
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 0 6px rgba(0,0,0,0.1)",
        }}
      >
        <h3>{editMode ? "Editar funcionário" : "Novo funcionário"}</h3>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 8,
            alignItems: "center",
          }}
        >
          <input
            placeholder="Nome"
            value={novoFunc.nome}
            onChange={(e) =>
              setNovoFunc({ ...novoFunc, nome: e.target.value })
            }
            style={{ ...inputStyle, minWidth: 160 }}
          />
          <input
            placeholder="Cargo"
            value={novoFunc.cargo}
            onChange={(e) =>
              setNovoFunc({ ...novoFunc, cargo: e.target.value })
            }
            style={{ ...inputStyle, minWidth: 140 }}
          />
          <input
            placeholder="% Funcionário"
            type="number"
            value={novoFunc.perc_funcionario}
            onChange={(e) =>
              setNovoFunc({
                ...novoFunc,
                perc_funcionario: Number(e.target.value),
              })
            }
            style={{ ...inputStyle, width: 130 }}
          />
          <label style={{ fontSize: 14 }}>
            <input
              type="checkbox"
              checked={novoFunc.requer_aprovacao}
              onChange={(e) =>
                setNovoFunc({
                  ...novoFunc,
                  requer_aprovacao: e.target.checked,
                })
              }
              style={{ marginRight: 4 }}
            />
            Requer aprovação
          </label>
          <input
            placeholder="Senha (opcional)"
            type="password"
            value={novoFunc.senha}
            onChange={(e) =>
              setNovoFunc({ ...novoFunc, senha: e.target.value })
            }
            style={{ ...inputStyle, minWidth: 140 }}
          />
          <button
            onClick={salvarFuncionario}
            style={{
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              background: "#28a745",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Salvar
          </button>
          {editMode && (
            <button
              type="button"
              onClick={() => {
                setNovoFunc({
                  id: null,
                  nome: "",
                  cargo: "",
                  perc_funcionario: 70,
                  requer_aprovacao: true,
                  senha: "",
                });
                setEditMode(false);
              }}
              style={{
                marginLeft: 8,
                padding: "8px 12px",
                borderRadius: 4,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Tabela de funcionários */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 16,
          background: "#fff",
        }}
      >
        <thead>
          <tr>
            <th style={thTdStyle}>ID</th>
            <th style={thTdStyle}>Nome</th>
            <th style={thTdStyle}>Cargo</th>
            <th style={thTdStyle}>% Func.</th>
            <th style={thTdStyle}>% Estúdio</th>
            <th style={thTdStyle}>Requer aprovação</th>
          </tr>
        </thead>
        <tbody>
          {funcionarios.map((f) => (
            <tr
              key={f.id}
              style={{ cursor: "pointer" }}
              onClick={() => {
                setNovoFunc({
                  id: f.id,
                  nome: f.nome,
                  cargo: f.cargo,
                  perc_funcionario: f.perc_funcionario,
                  requer_aprovacao: !!f.requer_aprovacao,
                  senha: "",
                });
                setEditMode(true);
              }}
            >
              <td style={thTdStyle}>{f.id}</td>
              <td style={thTdStyle}>{f.nome}</td>
              <td style={thTdStyle}>{f.cargo}</td>
              <td style={thTdStyle}>{f.perc_funcionario}</td>
              <td style={thTdStyle}>{f.perc_estudio}</td>
              <td style={thTdStyle}>{f.requer_aprovacao ? "Sim" : "Não"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
