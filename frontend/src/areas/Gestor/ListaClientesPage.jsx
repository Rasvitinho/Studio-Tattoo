import { useEffect, useState, useRef } from "react";
import axios from "axios";


const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 16,
};

const thTdStyle = {
  border: "1px solid #ccc",
  padding: 8,
  fontSize: 14,
  textAlign: "left",
};

const inputStyle = {
  width: "100%",
  marginTop: 4,
  padding: 6,
  borderRadius: 4,
  border: "1px solid #666",
  background: "#2a2a2a",
  color: "#fff",
  fontSize: 12,
  boxSizing: "border-box",
};


function ListaClientesPage({ apiBase }) {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [showDetalhe, setShowDetalhe] = useState(false);
  const [editFields, setEditFields] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [uploadingFicha, setUploadingFicha] = useState(false);
  const [erroFicha, setErroFicha] = useState("");
  const [incertezas, setIncertezas] = useState([]);
  const [showIncertezas, setShowIncertezas] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [showAdicionarHistorico, setShowAdicionarHistorico] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");  
  const nomeInputRef = useRef(null);
  const [novoRegistro, setNovoRegistro] = useState({
    tipo: "atendimento",
    descricao: "",
    valor: "",
    funcionario_id: "",
  });


  async function carregarClientes() {
    setCarregando(true);
    setErro("");
    try {
      const resp = await axios.get(`${apiBase}/clientes/`);
      const clientesOrdenados = (resp.data || []).sort((a, b) =>
        a.nome.localeCompare(b.nome)
      );
      setClientes(clientesOrdenados);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
      setErro("Erro ao carregar lista de clientes.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  useEffect(() => {
    if (showDetalhe && nomeInputRef.current) {
      nomeInputRef.current.focus();
    }
  }, [showDetalhe]);


  async function carregarHistorico(clienteId) {
    setCarregandoHistorico(true);
    try {
      const resp = await axios.get(`${apiBase}/clientes/${clienteId}/historico`);
      setHistorico(resp.data || []);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setCarregandoHistorico(false);
    }
  }


  function abrirDetalhe(cliente) {
    console.log("setando cliente:", cliente);
    setSelectedCliente(cliente);
    setEditFields({
      nome: cliente.nome || "",
      email: cliente.email || "",
      telefone: cliente.telefone || "",
      celular: cliente.celular || "",
      endereco: cliente.endereco || "",
      procedimento: cliente.procedimento || "",
      alergias: cliente.alergias || "",
      usa_pomada_anestesica: cliente.usa_pomada_anestesica || "",
      fuma: cliente.fuma || "",
      bebe: cliente.bebe || "",
      data_cadastro: cliente.data_cadastro || new Date().toISOString().split('T')[0],
      informacao: cliente.informacao || "",
      valor: cliente.valor || "",
      funcionario_id: cliente.funcionario_id || "",
    });
    console.log("setando showDetalhe para true");
    setShowDetalhe(true);
    setErroFicha("");
    setIncertezas([]);
    carregarHistorico(cliente.id);
  }


  function handleEditChange(field, value) {
    setEditFields((prev) => ({ ...prev, [field]: value }));
  }

  async function salvarAlteracoes() {
    setSalvando(true);
    setErro("");
    try {
      const payload = {
        ...editFields,
        valor: editFields.valor ? parseFloat(editFields.valor) : null,
        funcionario_id: editFields.funcionario_id ? parseInt(editFields.funcionario_id) : null,
      };

      await axios.put(`${apiBase}/clientes/${selectedCliente.id}`, payload);

      alert("Cliente atualizado com sucesso!");

      setClientes((prev) =>
        prev.map((c) =>
          c.id === selectedCliente.id ? { ...c, ...editFields } : c
        )
      );

      setShowDetalhe(false);
      setSelectedCliente(null);
      setEditFields({});
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      setErro(
        "Erro ao salvar: " + (err.response?.data?.detail || err.message)
      );
    } finally {
      setSalvando(false);
    }
  }

  async function removerCliente() {
  if (!selectedCliente) return;
  
  if (!window.confirm(`Tem certeza que deseja remover o cliente ${selectedCliente.nome}? Esta ação não pode ser desfeita!`)) {
    return;
  }

  try {
    await axios.delete(`${apiBase}/clientes/${selectedCliente.id}`);
    
    alert("Cliente removido com sucesso!");
    
    // Remove da lista local
    setClientes((prev) => prev.filter((c) => c.id !== selectedCliente.id));
    
    // Fecha o modal
    setShowDetalhe(false);
    setSelectedCliente(null);
    setEditFields({});
  } catch (err) {
    console.error("Erro ao remover cliente:", err);
    alert("Erro ao remover cliente: " + (err.response?.data?.detail || err.message));
  }
}


  async function handleUploadFicha(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFicha(true);
    setErroFicha("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      await axios.post(
        `${apiBase}/clientes/${selectedCliente.id}/upload-ficha`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      alert("Ficha anexada com sucesso!");

      // Atualiza o cliente para marcar que tem ficha
      setSelectedCliente((prev) => ({ ...prev, tem_ficha: true }));
      setClientes((prev) =>
        prev.map((c) =>
          c.id === selectedCliente.id ? { ...c, tem_ficha: true } : c
        )
      );
    } catch (err) {
      console.error("Erro ao anexar ficha:", err);
      setErroFicha(
        "Erro ao anexar ficha: " + (err.response?.data?.detail || err.message)
      );
    } finally {
      setUploadingFicha(false);
      e.target.value = "";
    }
  }

  async function handleOCRFicha(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFicha(true);
    setErroFicha("");
    setIncertezas([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const resp = await axios.post(
        `${apiBase}/ocr/ficha`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const { campos, incertezas: incertezasRetornadas } = resp.data || {};

      if (campos) {
        setEditFields((prev) => ({
          ...prev,
          ...campos,
        }));
      }

      if (incertezasRetornadas && incertezasRetornadas.length > 0) {
        setIncertezas(incertezasRetornadas);
        setShowIncertezas(true);
      } else {
        alert("Dados extraídos com sucesso!");
      }
    } catch (err) {
      console.error("ERRO OCR FICHA", err);
      setErroFicha(
        "Não foi possível ler a ficha. Tente outra foto ou preencha manualmente."
      );
    } finally {
      setUploadingFicha(false);
      e.target.value = "";
    }
  }
  async function adicionarRegistroHistorico() {
    if (!novoRegistro.tipo || !novoRegistro.descricao) {
      alert("Preencha tipo e descrição!");
      return;
    }

    try {
      await axios.post(
        `${apiBase}/clientes/${selectedCliente.id}/historico`,
        {
          tipo: novoRegistro.tipo,
          descricao: novoRegistro.descricao,
          valor: novoRegistro.valor ? parseFloat(novoRegistro.valor) : null,
          funcionario_id: novoRegistro.funcionario_id ? parseInt(novoRegistro.funcionario_id) : null,
        }
      );

      alert("Registro adicionado!");
      setNovoRegistro({ tipo: "atendimento", descricao: "", valor: "", funcionario_id: "" });
      setShowAdicionarHistorico(false);
      carregarHistorico(selectedCliente.id);
    } catch (err) {
      console.error("Erro ao adicionar registro:", err);
      alert("Erro ao adicionar registro");
    }
  }


  return (
    <div style={{ padding: 16 }}>
      <h2>Lista de Clientes</h2>

      {carregando && <p>Carregando...</p>}
      {erro && <p style={{ color: "#c0392b" }}>{erro}</p>}

      {!carregando && !erro && clientes.length === 0 && (
        <p>Nenhum cliente cadastrado.</p>
      )}

      {clientes.length > 0 && (
        <>
        {/* Campo de busca */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="🔍 Buscar cliente por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 400,
              padding: 10,
              borderRadius: 4,
              border: "1px solid #666",
              background: "#2a2a2a",
              color: "#fff",
              fontSize: 14,
            }}
          />
        </div>
        {/* Lista mobile (cards) */}
        <div className="lista-mobile">
          {clientes
            .filter((c) => {
              const termo = searchTerm.toLowerCase();
              return (
                c.nome.toLowerCase().includes(termo) ||
                (c.telefone || "").toLowerCase().includes(termo) ||
                (c.celular || "").toLowerCase().includes(termo)
              );
            })
            .map((c) => (
              <div
                key={c.id}
                onClick={() => abrirDetalhe(c)}
                style={{
                  background: "#2a2a2a",
                  padding: 12,
                  borderRadius: 6,
                  marginBottom: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.nome}</div>
                  {c.celular && (
                    <div style={{ fontSize: 12, color: "#ccc" }}>{c.celular}</div>
                  )}
                </div>
                <div style={{ fontSize: 18 }}>
                  {c.tem_ficha ? "✅" : "❌"}
                </div>
              </div>
            ))}
        </div>

        <table style={tableStyle} className="tabela-desktop">

          <thead>
            <tr>
              <th style={thTdStyle}>Nome</th>
              <th style={{ ...thTdStyle, width: 80, textAlign: "center" }}>
                Ficha
              </th>
            </tr>
          </thead>
          <tbody>
            {clientes
              .filter((c) => {
                const termo = searchTerm.toLowerCase();
                return (
                  c.nome.toLowerCase().includes(termo) ||
                  (c.telefone || "").toLowerCase().includes(termo) ||
                  (c.celular || "").toLowerCase().includes(termo)
                );
              })
              .map((c) => (
                <tr
                  key={c.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    console.log("Clicou no cliente:", c.nome);
                    abrirDetalhe(c);
                  }}
                >
                  <td style={thTdStyle}>{c.nome}</td>
                  <td
                    style={{
                      ...thTdStyle,
                      textAlign: "center",
                      fontSize: 18,
                    }}
                  >
                    {c.tem_ficha ? "✅" : "❌"}
                  </td>
                </tr>
              ))}
          </tbody>

        </table>
        </>
      )}
      {showDetalhe && selectedCliente && (
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
              minWidth: 400,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h3>Editar Cliente</h3>

            {erro && (
              <div style={{ color: "#f55", marginBottom: 8 }}>{erro}</div>
            )}

            {/* Seção de anexar ficha */}
            {!selectedCliente.tem_ficha && (
              <div
                style={{
                  background: "#333",
                  padding: 12,
                  borderRadius: 4,
                  marginBottom: 16,
                  border: "1px solid #666",
                }}
              >
                <p style={{ margin: 0, marginBottom: 8 }}>
                  <strong>⚠️ Ficha de cadastro não anexada</strong>
                </p>
                {erroFicha && (
                  <p style={{ color: "#f55", fontSize: 12, marginBottom: 8 }}>
                    {erroFicha}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <label
                    style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      background: "#ff4500",
                      color: "#fff",
                      borderRadius: 4,
                      cursor: uploadingFicha ? "not-allowed" : "pointer",
                      opacity: uploadingFicha ? 0.6 : 1,
                      fontSize: 12,
                    }}
                  >
                    {uploadingFicha ? "Lendo..." : "📸 Ler ficha (OCR)"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleOCRFicha}
                      disabled={uploadingFicha}
                    />
                  </label>
                  <label
                    style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      background: "#555",
                      color: "#fff",
                      borderRadius: 4,
                      cursor: uploadingFicha ? "not-allowed" : "pointer",
                      opacity: uploadingFicha ? 0.6 : 1,
                      fontSize: 12,
                    }}
                  >
                    {uploadingFicha ? "Anexando..." : "📎 Anexar ficha"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleUploadFicha}
                      disabled={uploadingFicha}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Seção de Histórico */}
            <div style={{ marginBottom: 16, borderBottom: "1px solid #666", paddingBottom: 12 }}>
              <h4 style={{ margin: "0 0 12px 0" }}>📋 Histórico</h4>
              {carregandoHistorico ? (
                <p style={{ fontSize: 12 }}>Carregando...</p>
              ) : historico.length === 0 ? (
                <p style={{ fontSize: 12, color: "#999" }}>Nenhum registro</p>
              ) : (
                <div style={{ maxHeight: 150, overflowY: "auto", marginBottom: 12, background: "#2a2a2a", padding: 8, borderRadius: 4 }}>
                  {historico.map((reg) => (
                    <div key={reg.id} style={{ paddingBottom: 8, borderBottom: "1px solid #444", marginBottom: 8, fontSize: 11 }}>
                      <p style={{ margin: 0, fontWeight: "bold" }}>{reg.tipo === "pagamento" ? "💰" : "📅"} {reg.tipo.toUpperCase()}</p>
                      <p style={{ margin: "2px 0", color: "#ccc" }}>{reg.descricao}</p>
                      {reg.valor && <p style={{ margin: "2px 0", color: "#4a9d4a" }}>R$ {parseFloat(reg.valor).toFixed(2)}</p>}
                      <p style={{ margin: "2px 0", color: "#999", fontSize: 10 }}>{new Date(reg.data_registro).toLocaleString("pt-BR")}</p>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setShowAdicionarHistorico(!showAdicionarHistorico)} style={{ padding: "6px 12px", background: "#ff4500", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>
                {showAdicionarHistorico ? "❌ Cancelar" : "➕ Novo Registro"}
              </button>

              {showAdicionarHistorico && (
                <div style={{ background: "#2a2a2a", padding: 12, marginTop: 12, borderRadius: 4, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label style={{ fontSize: 12 }}>
                    Tipo
                    <select value={novoRegistro.tipo} onChange={(e) => setNovoRegistro({ ...novoRegistro, tipo: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="atendimento">Atendimento</option>
                      <option value="pagamento">Pagamento</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 12 }}>
                    Valor
                    <input type="number" step="0.01" value={novoRegistro.valor} onChange={(e) => setNovoRegistro({ ...novoRegistro, valor: e.target.value })} style={inputStyle} placeholder="0.00" />
                  </label>
                  <label style={{ gridColumn: "1 / span 2", fontSize: 12 }}>
                    Descrição
                    <input type="text" value={novoRegistro.descricao} onChange={(e) => setNovoRegistro({ ...novoRegistro, descricao: e.target.value })} style={inputStyle} />
                  </label>                
                  <button onClick={adicionarRegistroHistorico} style={{ gridColumn: "1 / span 2", padding: "8px 12px", background: "#4a9d4a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                    Salvar Registro
                  </button>
                </div>
              )}
            </div>
            <div className="grid-campos-cliente">              
              <label>
                Nome *
                <input
                  ref={nomeInputRef}
                  type="text"
                  value={editFields.nome}
                  onChange={(e) =>
                    handleEditChange("nome", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={editFields.email}
                  onChange={(e) =>
                    handleEditChange("email", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                Telefone
                <input
                  type="text"
                  value={editFields.telefone}
                  onChange={(e) =>
                    handleEditChange("telefone", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                Celular
                <input
                  type="text"
                  value={editFields.celular}
                  onChange={(e) =>
                    handleEditChange("celular", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                Data de Cadastro
                <input 
                  type="date" 
                  value={editFields.data_cadastro} 
                  onChange={(e) => handleEditChange("data_cadastro", e.target.value)} 
                  style={inputStyle} 
                />
              </label>

              <label>
                Valor
                <input 
                  type="number" 
                  step="0.01" 
                  value={editFields.valor} 
                  onChange={(e) => handleEditChange("valor", e.target.value)} 
                  style={inputStyle} 
                />
              </label>

              <label style={{ gridColumn: "1 / span 2" }}>
                Informação
                <input 
                  type="text" 
                  value={editFields.informacao} 
                  onChange={(e) => handleEditChange("informacao", e.target.value)} 
                  style={inputStyle} 
                />
              </label>
              <label style={{ gridColumn: "1 / span 2" }}>
                Endereço
                <input
                  type="text"
                  value={editFields.endereco}
                  onChange={(e) =>
                    handleEditChange("endereco", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label style={{ gridColumn: "1 / span 2" }}>
                Procedimento (piercing / tattoo)
                <input
                  type="text"
                  value={editFields.procedimento}
                  onChange={(e) =>
                    handleEditChange("procedimento", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label style={{ gridColumn: "1 / span 2" }}>
                Alergias
                <input
                  type="text"
                  value={editFields.alergias}
                  onChange={(e) =>
                    handleEditChange("alergias", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                Usa pomada anestésica
                <input
                  type="text"
                  value={editFields.usa_pomada_anestesica}
                  onChange={(e) =>
                    handleEditChange("usa_pomada_anestesica", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                Fuma
                <input
                  type="text"
                  value={editFields.fuma}
                  onChange={(e) =>
                    handleEditChange("fuma", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                Bebe
                <input
                  type="text"
                  value={editFields.bebe}
                  onChange={(e) =>
                    handleEditChange("bebe", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button
                onClick={salvarAlteracoes}
                disabled={salvando}
                style={{
                  padding: "8px 16px",
                  background: "#ff4500",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: salvando ? "not-allowed" : "pointer",
                  opacity: salvando ? 0.6 : 1,
                }}
              >
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>
              
              <button
                onClick={removerCliente}
                style={{
                  padding: "8px 16px",
                  background: "#dc3545",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                🗑️ Remover
              </button>
              
              <button
                onClick={() => {
                  setShowDetalhe(false);
                  setSelectedCliente(null);
                  setEditFields({});
                  setErroFicha("");
                }}
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
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default ListaClientesPage;
