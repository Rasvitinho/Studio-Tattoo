import React, { useState } from "react";
import axios from "axios";

const emptyFields = {
  nome: "",
  telefone: "",
  endereco: "",
  celular: "",
  procedimento: "",
  alergias: "",
  usa_pomada_anestesica: "",
  fuma: "",
  bebe: "",
  email: "",
};

function CadastroClienteForm({ apiBase, onClose }) {
  const [fields, setFields] = useState(emptyFields);
  const [incertezas, setIncertezas] = useState([]);
  const [showIncertezas, setShowIncertezas] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  async function handleUploadFicha(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErro("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const resp = await axios.post(
        `${apiBase}/ocr/ficha`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const { campos, incertezas } = resp.data || {};
      if (campos) {
        setFields((prev) => ({ ...prev, ...campos }));
      }
      if (incertezas && incertezas.length > 0) {
        setIncertezas(incertezas);
        setShowIncertezas(true);
      }
    } catch (err) {
      console.error("ERRO OCR FICHA", err);
      setErro(
        "Não foi possível ler a ficha. Tente outra foto ou preencha manualmente."
      );
    } finally {
      setUploading(false);
      // limpa o input para permitir novo upload se quiser
      e.target.value = "";
    }
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setErro("");
    setSaving(true);

    try {
      // Validação básica
      if (!fields.nome.trim()) {
        setErro("Nome é obrigatório.");
        setSaving(false);
        return;
      }

      // Prepara os dados para enviar
      const payload = {
        nome: fields.nome,
        telefone: fields.telefone || fields.celular, // usa celular se telefone vazio
        email: fields.email || "",                   // agora envia o email preenchido
        cpf: "",                                     // ainda sem campo visual de CPF
        endereco: fields.endereco,
        status: "pre_cadastro",
      };

      // Faz o POST para criar o cliente
      const resp = await axios.post(`${apiBase}/clientes/`, payload);

      console.log("Cliente criado:", resp.data);
      alert("Cliente cadastrado com sucesso!");

      // Limpa o formulário
      setFields(emptyFields);

      if (onClose) onClose();
    } catch (err) {
      console.error("ERRO SALVAR CLIENTE", err);
      setErro(
        "Erro ao salvar o cadastro: " +
          (err.response?.data?.detail || err.message)
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Cadastro de Cliente</h2>

      {erro && (
        <div style={{ color: "#f55", marginBottom: 8 }}>{erro}</div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            display: "inline-block",
            padding: "6px 12px",
            background: "#444",
            color: "#fff",
            borderRadius: 4,
            cursor: "pointer",
            marginRight: 8,
          }}
        >
          {uploading ? "Lendo ficha..." : "Importar da foto da ficha"}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleUploadFicha}
            disabled={uploading}
          />
        </label>
        <small>Use uma foto nítida da ficha preenchida.</small>
      </div>

      <form onSubmit={handleSalvar}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <label>
            Nome *
            <input
              name="nome"
              value={fields.nome}
              onChange={handleChange}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
              required
            />
          </label>

          <label>
            Telefone
            <input
              name="telefone"
              value={fields.telefone}
              onChange={handleChange}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label>
            Celular
            <input
              name="celular"
              value={fields.celular}
              onChange={handleChange}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              value={fields.email}
              onChange={handleChange}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label>
            Procedimento (piercing / tattoo)
            <input
              name="procedimento"
              value={fields.procedimento}
              onChange={handleChange}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label style={{ gridColumn: "1 / span 2" }}>
            Endereço
            <input
              name="endereco"
              value={fields.endereco}
              onChange={handleChange}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label style={{ gridColumn: "1 / span 2" }}>
            Alergias
            <input
              name="alergias"
              value={fields.alergias}
              onChange={handleChange}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label>
            Usa pomada anestésica
            <input
              name="usa_pomada_anestesica"
              value={fields.usa_pomada_anestesica}
              onChange={handleChange}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label>
            Fuma
            <input
              name="fuma"
              value={fields.fuma}
              onChange={handleChange}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label>
            Bebe
            <input
              name="bebe"
              value={fields.bebe}
              onChange={handleChange}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
          </label>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "8px 16px",
              background: "#ff4500",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Salvando..." : "Salvar cadastro"}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "#444",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Fechar
            </button>
          )}
        </div>
      </form>

      {showIncertezas && incertezas.length > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#1e1e1e",
              color: "#fff",
              padding: 20,
              borderRadius: 8,
              minWidth: 320,
            }}
          >
            <h3>Revise estes campos</h3>
            <p>
              O sistema não conseguiu entender totalmente os campos abaixo.
              Confira antes de salvar:
            </p>
            <ul>
              {incertezas.map((campo) => (
                <li key={campo}>{campo}</li>
              ))}
            </ul>
            <button
              onClick={() => setShowIncertezas(false)}
              style={{
                marginTop: 12,
                padding: "6px 12px",
                background: "#ff4500",
                border: "none",
                borderRadius: 4,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Ok, vou revisar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CadastroClienteForm;
