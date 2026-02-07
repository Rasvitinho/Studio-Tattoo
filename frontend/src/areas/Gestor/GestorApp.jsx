import { useState, useEffect } from "react";
import axios from "axios";
import "./gestor.css";
import ConfigLayout from "../Admin/ConfigLayout";
import { useStudioConfig } from "../../context/StudioConfigContext";
import { useTheme } from "../../context/ThemeContext";
import CadastroClientePage from "./CadastroClientePage";
import ListaClientesPage from "./ListaClientesPage";
import ModalPagamento from "./ModalPagamento";

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
  textAlign: "center",
  verticalAlign: "middle",
};

const tdNumberStyle = {
  ...thTdStyle,
  textAlign: "right",
};

function btnStyle(active, primaryColor = "#ff4500") {
  return {
    display: "block",
    width: "100%",
    padding: 10,
    marginBottom: 8,
    borderRadius: 4,
    border: "none",
    background: active ? primaryColor : "#333",
    color: "#fff",
    textAlign: "left",
    cursor: "pointer",
  };
}

function formatDataBr(dataStr) {
  if (!dataStr) return "-";
  const [yyyy, mm, dd] = dataStr.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

function GestorApp({ user, apiBase, onLogout }) {
  console.log("USER NO GESTORAPP:", user);
  console.log("TIPO GESTOR:", user?.tipo);
  const [view, setView] = useState("dashboard");
  const [proximosAgendamentos, setProximosAgendamentos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [novoLoginAdmin, setNovoLoginAdmin] = useState("");
  const [novaSenhaAdmin, setNovaSenhaAdmin] = useState("");  
  const { config } = useStudioConfig();
  const { theme, toggleTheme } = useTheme();
  const studioName = config?.studio_name || "Meu Estúdio";
  const studioLogo = config?.studio_logo || null;
  const menuBgColor = config?.primary_color || "#1a1a1a"; 
  const primaryColor = config?.primary_color || "#ff4500";  
  

  // Novo agendamento (gestor)
  const [novoData, setNovoData] = useState("");
  const [novoHorario, setNovoHorario] = useState("");
  const [novoCliente, setNovoCliente] = useState("");
  const [novoServico, setNovoServico] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novoFuncionarioId, setNovoFuncionarioId] = useState("");

  // Funcionários
  const [listaFuncionarios, setListaFuncionarios] = useState([]);
  const [funcNome, setFuncNome] = useState("");
  const [funcCargo, setFuncCargo] = useState("");
  const [funcPerc, setFuncPerc] = useState(70);
  const [funcRequerAprovacao, setFuncRequerAprovacao] = useState(true);
  const [funcSenha, setFuncSenha] = useState("");
  const [funcEditandoId, setFuncEditandoId] = useState(null);
  const [funcSelecionadoId, setFuncSelecionadoId] = useState(null);

  // Modal de edição de agendamento
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [agendamentoEmEdicao, setAgendamentoEmEdicao] = useState(null);
  const [editData, setEditData] = useState("");
  const [editHorario, setEditHorario] = useState("");
  const [editValor, setEditValor] = useState("");

  // Agenda Geral
  const [dataIniAgenda, setDataIniAgenda] = useState("");
  const [dataFimAgenda, setDataFimAgenda] = useState("");
  const [agendamentosGeral, setAgendamentosGeral] = useState([]);
  const [periodoRapidoAgenda, setPeriodoRapidoAgenda] = useState("");

  // Filtro de funcionário na Agenda Geral
  const [funcionarioAgendaSelecionado, setFuncionarioAgendaSelecionado] =
    useState(null);

  // Finanças Geral
  const [dataIniFinancas, setDataIniFinancas] = useState("");
  const [dataFimFinancas, setDataFimFinancas] = useState("");
  const [financasGeral, setFinancasGeral] = useState(null);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);

  // ===== MODAL DE PAGAMENTO =====
  const [showModalPagamento, setShowModalPagamento] = useState(false);
  const [agendamentoParaPagamento, setAgendamentoParaPagamento] = useState(null);
  const [modoPagamento, setModoPagamento] = useState("dinheiro");
  const [valorPago, setValorPago] = useState("");
  const [descricaoPagamento, setDescricaoPagamento] = useState("");

  function abrirModalPagamento(agendamento) {
    // Se já está pago, pergunta se quer desmarcar
    if (agendamento.pago) {
      if (window.confirm("Desmarcar este agendamento como pago?")) {
        desmarcarPagamento(agendamento.id);
      }
      return;
    }
    
    // Se não está pago, abre o modal
    setAgendamentoParaPagamento(agendamento);
    setModoPagamento("dinheiro");
    setValorPago(agendamento.valor_previsto?.toString() || "");
    setDescricaoPagamento("");
    setShowModalPagamento(true);
  }

  async function confirmarPagamento() {
    if (!agendamentoParaPagamento) return;
    
    try {
      await axios.put(
        `${apiBase}/agenda/${agendamentoParaPagamento.id}/pagamento-com-historico`,
        { pago: true }
      );
      
      alert(`Pagamento confirmado!\nModo: ${modoPagamento}\nValor: R$ ${valorPago}`);
      setShowModalPagamento(false);
      setAgendamentoParaPagamento(null);
      carregarAgendaGeral();
    } catch (err) {
      console.error("Erro ao confirmar pagamento:", err);
      alert("Erro ao confirmar pagamento");
    }
  }

  async function desmarcarPagamento(agendamentoId) {
    try {
      await axios.put(
        `${apiBase}/agenda/${agendamentoId}/pagamento-com-historico`,
        { pago: false }
      );
      
      alert("Pagamento desmarcado!");
      carregarAgendaGeral();
    } catch (err) {
      console.error("Erro ao desmarcar pagamento:", err);
      alert("Erro ao desmarcar pagamento");
    }
  }

  function fecharModalPagamento() {
    setShowModalPagamento(false);
    setAgendamentoParaPagamento(null);
    setModoPagamento("dinheiro");
    setValorPago("");
    setDescricaoPagamento("");
  }



  async function carregarDashboard() {
    try {
      const resp = await axios.get(`${apiBase}/agenda/dashboard/proximos`);
      setProximosAgendamentos(resp.data);
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    }
  }

  useEffect(() => {
    if (view === "dashboard") {
      carregarDashboard();
    }
  }, [view]);

  async function carregarListaFuncionarios() {
    try {
      const resp = await axios.get(`${apiBase}/funcionarios/`);
      setListaFuncionarios(resp.data);
    } catch (err) {
      console.error("Erro ao listar funcionários:", err);
    }
  }

  useEffect(() => {
    carregarListaFuncionarios();
  }, []);

  function limparFormularioFuncionario() {
    setFuncNome("");
    setFuncCargo("");
    setFuncPerc(70);
    setFuncRequerAprovacao(true);
    setFuncSenha("");
    setFuncEditandoId(null);
    setFuncSelecionadoId(null);
  }

  async function salvarFuncionario() {
    try {
      const payload = {
        nome: funcNome,
        cargo: funcCargo,
        perc_funcionario: Number(funcPerc),
        requer_aprovacao: funcRequerAprovacao,
        senha: funcSenha || null,
      };

      if (funcEditandoId) {
        await axios.put(`${apiBase}/funcionarios/`, {
          id: funcEditandoId,
          ...payload,
        });
      } else {
        await axios.post(`${apiBase}/funcionarios/`, payload);
      }

      await carregarListaFuncionarios();
      limparFormularioFuncionario();
      alert("Funcionário salvo com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar funcionário:", err);
      alert("Erro ao salvar funcionário.");
    }
  }

  function carregarFuncionarioParaEdicao(f) {
    setFuncSelecionadoId(f.id);
    setFuncEditandoId(f.id);
    setFuncNome(f.nome || "");
    setFuncCargo(f.cargo || "");
    setFuncPerc(f.perc_funcionario ?? 70);
    setFuncRequerAprovacao(!!f.requer_aprovacao);
    setFuncSenha("");
  }

  function cancelarEdicaoFuncionario() {
    limparFormularioFuncionario();
  }

  async function removerFuncionarioSelecionado() {
    if (!funcSelecionadoId) return;
    if (!window.confirm("Remover este funcionário?")) return;

    try {
      await axios.delete(`${apiBase}/funcionarios/${funcSelecionadoId}`);
      await carregarListaFuncionarios();
      limparFormularioFuncionario();
      alert("Funcionário removido.");
    } catch (err) {
      console.error("Erro ao remover funcionário:", err);
      alert("Erro ao remover funcionário.");
    }
  }

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") {
        fecharModalEdicao();
      }
    }
    if (editModalOpen) {
      window.addEventListener("keydown", handleKey);
    }
    return () => window.removeEventListener("keydown", handleKey);
  }, [editModalOpen]);

  function handlePeriodoRapidoAgenda(valor) {
    setPeriodoRapidoAgenda(valor);
    if (!valor) return;

    const hoje = new Date();
    const dataFimBase = dataFimAgenda || hoje.toISOString().slice(0, 10);
    const fimDate = new Date(dataFimBase);

    if (valor === "mes_atual") {
      const ano = fimDate.getFullYear();
      const mes = fimDate.getMonth();

      const iniDate = new Date(ano, mes, 1);
      const ini = iniDate.toISOString().slice(0, 10);
      const fim = fimDate.toISOString().slice(0, 10);

      setDataIniAgenda(ini);
      setDataFimAgenda(fim);
      return;
    }

    const dias = Number(valor);
    const fim = fimDate.toISOString().slice(0, 10);

    const iniDate = new Date(fimDate);
    iniDate.setDate(iniDate.getDate() - (dias - 1));
    const ini = iniDate.toISOString().slice(0, 10);

    setDataIniAgenda(ini);
    setDataFimAgenda(fim);
  }

  async function carregarAgendaGeral() {
    if (!dataIniAgenda) return;

    try {
      let baseUrl;
      if (dataFimAgenda && dataFimAgenda !== dataIniAgenda) {
        baseUrl = `${apiBase}/agenda/agenda-periodo/${dataIniAgenda}/${dataFimAgenda}`;
      } else {
        baseUrl = `${apiBase}/agenda/${dataIniAgenda}`;
      }

      const params = {};
      if (funcionarioAgendaSelecionado) {
        params.funcionario_id = funcionarioAgendaSelecionado;
      }

      const resp = await axios.get(baseUrl, { params });
      setAgendamentosGeral(resp.data);
    } catch (err) {
      console.error("Erro ao carregar agenda geral:", err);
    }
  }

  async function marcarComoPago(agendamentoId, pago) {
    // Abre o modal em vez de marcar direto
    const agend = agendamentosGeral.find(a => a.id === agendamentoId);
    if (agend) {
      abrirModalPagamento(agend);
    }
  }

  async function marcarComoAprovado(agendamentoId) {
    try {
      await axios.put(`${apiBase}/agenda/${agendamentoId}/aprovacao`, {
        aprovado: true,
      });
      alert("Agendamento aprovado!");
      carregarAgendaGeral();
    } catch (err) {
      console.error("Erro ao aprovar:", err);
    }
  }

  async function removerAgendamento(agendamentoId) {
    if (!window.confirm("Tem certeza que deseja remover este agendamento?")) {
      return;
    }

    try {
      await axios.delete(`${apiBase}/agenda/${agendamentoId}`);
      alert("Agendamento removido com sucesso!");
      carregarAgendaGeral();
    } catch (err) {
      console.error("Erro ao remover agendamento:", err);
      alert("Erro ao remover agendamento.");
    }
  }

  function editarAgendamento(agendamento) {
    setAgendamentoEmEdicao(agendamento);
    setEditData(agendamento.data || new Date().toISOString().slice(0, 10));
    setEditHorario(agendamento.horario || "09:00");
    setEditValor(
      agendamento.valor_previsto != null
        ? String(agendamento.valor_previsto)
        : ""
    );
    setEditModalOpen(true);
  }

  async function salvarEdicaoAgendamento() {
    if (!agendamentoEmEdicao) return;

    if (!editData || !editHorario) {
      alert("Preencha data e horário.");
      return;
    }

    const novoValorNum = Number(String(editValor).replace(",", "."));

    try {
      await axios.put(`${apiBase}/agenda/${agendamentoEmEdicao.id}`, {
        data: editData,
        horario: editHorario,
        cliente: agendamentoEmEdicao.cliente,
        servico: agendamentoEmEdicao.servico,
        valor_previsto: isNaN(novoValorNum)
          ? agendamentoEmEdicao.valor_previsto
          : novoValorNum,
        funcionario_id: agendamentoEmEdicao.funcionario_id,
      });

      alert("Agendamento atualizado com sucesso!");
      setEditModalOpen(false);
      setAgendamentoEmEdicao(null);
      carregarAgendaGeral();
    } catch (err) {
      console.error("Erro ao editar agendamento:", err);
      alert("Erro ao editar agendamento.");
    }
  }

  function fecharModalEdicao() {
    setEditModalOpen(false);
    setAgendamentoEmEdicao(null);
  }

  async function carregarFuncionarios() {
    try {
      const resp = await axios.get(`${apiBase}/funcionarios/`);
      setFuncionarios(resp.data);
    } catch (err) {
      console.error("Erro ao carregar funcionários:", err);
    }
  }

    useEffect(() => {
    carregarFuncionarios();
  }, []);


  async function carregarFinancasGeral() {
    if (!dataIniFinancas || !dataFimFinancas) return;

    try {
      const resp = await axios.post(`${apiBase}/financeiro/resumo-periodo`, {
        data_ini: dataIniFinancas,
        data_fim: dataFimFinancas,
        funcionario_id: funcionarioSelecionado,
        tipo: null,
      });
      setFinancasGeral(resp.data);
    } catch (err) {
      console.error("Erro ao carregar finanças geral:", err);
    }
  }

  async function criarAgendamentoGestor() {
    if (
  !novoData ||
  !novoHorario ||
  !novoCliente ||
  !novoServico
) {
  alert("Preencha TODOS os campos obrigatórios!");
  return;
    }

    const valorNum = parseFloat(novoValor) || 0;

    try {
      await axios.post(`${apiBase}/agenda/`, {
        data: novoData,
        horario: novoHorario,
        cliente: novoCliente,
        servico: novoServico,
        valor_previsto: valorNum,
        funcionario_id: parseInt(novoFuncionarioId),
        aprovado: true,
      });

      alert("Agendamento criado com sucesso!");

      setNovoData("");
      setNovoHorario("");
      setNovoCliente("");
      setNovoServico("");
      setNovoValor("");
      setNovoFuncionarioId("");

      if (dataIniAgenda) carregarAgendaGeral();
      carregarDashboard();
    } catch (err) {
      console.error("Erro ao criar agendamento:", err);
      alert(
        "Erro ao criar agendamento: " +
          (err.response?.data?.detail || err.message)
      );
    }
  }

  async function criarUsuarioAdmin() {
    if (!novoLoginAdmin || !novaSenhaAdmin) {
      alert("Preencha login e senha do administrador.");
      return;
    }

    try {
      await axios.post(`${apiBase}/funcionarios/`, {
        nome: novoLoginAdmin,
        cargo: "Administrador",
        perc_funcionario: 0,
        requer_aprovacao: false,
        senha: novaSenhaAdmin,
      });

      alert("Administrador criado com sucesso!");
      setNovoLoginAdmin("");
      setNovaSenhaAdmin("");
    } catch (err) {
      console.error("Erro ao criar administrador:", err);
      alert("Erro ao criar administrador.");
    }
  }

  return (
    <div className="layout-root">
      {/* Sidebar */}
      <div
        className="layout-sidebar"
        style={{
          background: menuBgColor,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 16,
        }}
      >
        {studioLogo && (
          <img
            src={studioLogo}
            alt="Logo"
            style={{
              maxWidth: "80px",
              marginBottom: 8,
              borderRadius: 4,
              display: "block",
            }}
          />
        )}
        <h3
          style={{
            marginBottom: 4,
            textAlign: "center",
          }}
        >
          {studioName}
        </h3>
        <small
           style={{
            fontSize: 12,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          {user.login}
        </small>
        <h3 style={{ marginBottom: 24 }}>
          {studioName}
          <br />
          <small style={{ fontSize: 12 }}>{user.login}</small>
        </h3>
        <button
          style={btnStyle(view === "agenda", config?.primary_color || "#ff4500")}
          onClick={() => setView("agenda")}
        >
          Agenda geral
        </button>

            {(user.tipo === "gestor" || user.tipo === "superadmin") && (
            <div
              style={{
                width: "100%",
                marginTop: 8,
                marginBottom: 4,
              }}
            >
              {/* Botão principal Clientes */}
              <button
                style={btnStyle(
                  view === "cadastro_cliente" || view === "lista_clientes",
                  primaryColor
                )}
                onClick={() =>
                  setView(
                    view === "lista_clientes" ? "cadastro_cliente" : "lista_clientes"
                  )
                }
              >
                Clientes
              </button>

              {/* Submenu: só aparece quando está em uma das abas de cliente */}
              {(view === "cadastro_cliente" || view === "lista_clientes") && (
                <>
                  <button
                    style={{
                      display: "block",
                      width: "90%",
                      marginLeft: 16,
                      marginBottom: 4,
                      padding: 8,
                      borderRadius: 4,
                      border: "none",
                      background:
                        view === "cadastro_cliente" ? primaryColor : "#555",
                      color: "#fff",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                    onClick={() => setView("cadastro_cliente")}
                  >
                    • Cadastro
                  </button>

                  <button
                    style={{
                      display: "block",
                      width: "90%",
                      marginLeft: 16,
                      marginBottom: 8,
                      padding: 8,
                      borderRadius: 4,
                      border: "none",
                      background: view === "lista_clientes" ? primaryColor : "#555",
                      color: "#fff",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                    onClick={() => setView("lista_clientes")}
                  >
                    • Lista
                  </button>
                </>
              )}
            </div>
          )}

        <button
          style={btnStyle(view === "financas", config?.primary_color || "#ff4500")}
          onClick={() => setView("financas")}
        >
          Finanças geral
        </button>

        <button
          style={btnStyle(view === "funcionarios", config?.primary_color || "#ff4500")}
          onClick={() => setView("funcionarios")}
        >
          Funcionários
        </button>

        {user.tipo === "superadmin" && (
          <button
            style={btnStyle(view === "layout", primaryColor)}
            onClick={() => setView("layout")}
          >
            Configuração de layout
          </button>
        )}

        <button
          style={btnStyle(false, "#555")}
          onClick={toggleTheme}
        >
          Tema: {theme === "dark" ? "Claro" : "Escuro"}
        </button>

        <button
          style={btnStyle(false, "#c0392b")}
          onClick={onLogout}
        >
          Logout
        </button>


      </div>
              {/* Conteúdo principal */}
              <div className="layout-main">

        {/* Dashboard */}
        {view === "dashboard" && (
          <>
            <h2>Dashboard</h2>

            <div className="table-wrapper" style={{ marginTop: 12 }}>
              <h3>Próximos agendamentos</h3>
              <table className="gestor-table">
                <thead>
                  <tr>
                    <th className="gestor-th">Data</th>
                    <th className="gestor-th">Hora</th>
                    <th className="gestor-th">Cliente</th>
                    <th className="gestor-th">Serviço</th>
                    <th className="gestor-th">Funcionário</th>
                  </tr>
                </thead>
                <tbody>
                  {proximosAgendamentos.map((a) => (
                    <tr key={a.id}>
                      <td className="gestor-td">{formatDataBr(a.data)}</td>
                      <td className="gestor-td">{a.horario}</td>
                      <td className="gestor-td">{a.cliente}</td>
                      <td className="gestor-td">{a.servico}</td>
                      <td className="gestor-td">{a.funcionario ?? "-"}</td>
                    </tr>
                  ))}
                  {proximosAgendamentos.length === 0 && (
                    <tr>
                      <td className="gestor-td" colSpan={5}>
                        Nenhum agendamento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

              {view === "cadastro_cliente" && (
          <CadastroClientePage apiBase={apiBase} />
        )}

        {view === "lista_clientes" && (
          <ListaClientesPage apiBase={apiBase} />
        )}

        {/* Agenda Geral */}
        {view === "agenda" && (
          <>
            <h2>Agenda geral</h2>
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <label>
                De:{" "}
                <input
                  type="date"
                  value={dataIniAgenda}
                  onChange={(e) => setDataIniAgenda(e.target.value)}
                  style={{ ...inputStyle, width: 150 }}
                />
              </label>
              <label style={{ marginLeft: 8 }}>
                Até:{" "}
                <input
                  type="date"
                  value={dataFimAgenda}
                  onChange={(e) => setDataFimAgenda(e.target.value)}
                  style={{ ...inputStyle, width: 150 }}
                />
              </label>
              <label style={{ marginLeft: 8 }}>
                Período rápido:{" "}
                <select
                  value={periodoRapidoAgenda}
                  onChange={(e) => handlePeriodoRapidoAgenda(e.target.value)}
                  style={{ ...inputStyle, width: 140 }}
                >
                  <option value="">--</option>
                  <option value="7">7 dias</option>
                  <option value="15">15 dias</option>
                  <option value="22">22 dias</option>
                  <option value="mes_atual">Mês Atual</option>
                </select>
              </label>
              <label style={{ marginLeft: 8 }}>
                Funcionário:{" "}
                <select
                  value={funcionarioAgendaSelecionado || ""}
                  onChange={(e) =>
                    setFuncionarioAgendaSelecionado(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  style={{ ...inputStyle, width: 150 }}
                >
                  <option value="">Todos</option>
                  {funcionarios &&
                    Array.isArray(funcionarios) &&
                    funcionarios.map((func, index) => (
                      <option
                        key={index}
                        value={typeof func === "object" ? func.id : func}
                      >
                        {typeof func === "object" ? func.nome : func}
                      </option>
                    ))}
                </select>
              </label>

              <button
                onClick={carregarAgendaGeral}
                style={{
                  marginLeft: 8,
                  padding: "6px 12px",
                  borderRadius: 4,
                  border: "none",
                  background: "#ff4500",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Carregar
              </button>

              {editModalOpen && agendamentoEmEdicao && (
                <div
                  onClick={fecharModalEdicao}
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: "#fff",
                      padding: 16,
                      borderRadius: 8,
                      width: "90%",
                      maxWidth: 400,
                      boxShadow: "0 0 10px rgba(0,0,0,0.25)",
                    }}
                  >
                    <h3>Editar agendamento</h3>
                    <p style={{ fontSize: 14, marginBottom: 8 }}>
                      Cliente: <strong>{agendamentoEmEdicao.cliente}</strong>
                      <br />
                      Serviço: <strong>{agendamentoEmEdicao.servico}</strong>
                    </p>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <label>
                        Data:
                        <input
                          type="date"
                          value={editData}
                          onChange={(e) => setEditData(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        />
                      </label>
                      <label>
                        Horário:
                        <input
                          type="time"
                          value={editHorario}
                          onChange={(e) => setEditHorario(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        />
                      </label>
                      <label>
                        Valor previsto:
                        <input
                          type="number"
                          step="0.01"
                          value={editValor}
                          onChange={(e) => setEditValor(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        />
                      </label>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      <button
                        onClick={fecharModalEdicao}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 4,
                          border: "none",
                          background: "#6c757d",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={salvarEdicaoAgendamento}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 4,
                          border: "none",
                          background: "#28a745",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {view === "cadastro_cliente" && (
                <CadastroClientePage apiBase={apiBase} />
              )}

              {view === "lista_clientes" && (
                <ListaClientesPage apiBase={apiBase} />
              )}
            </div>
            

            {/* Formulário para o gestor criar um agendamento */}
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 0 6px rgba(0,0,0,0.1)",
              }}
            >
              <h3>Novo agendamento (gestor)</h3>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <label>
                  Data:{" "}
                  <input
                    type="date"
                    value={novoData}
                    onChange={(e) => setNovoData(e.target.value)}
                    style={{ ...inputStyle, width: 150 }}
                  />
                </label>
                <label>
                  Horário:{" "}
                  <input
                    type="time"
                    value={novoHorario}
                    onChange={(e) => setNovoHorario(e.target.value)}
                    style={{ ...inputStyle, width: 120 }}
                  />
                </label>
                <label>
                  Cliente:{" "}
                  <input
                    type="text"
                    value={novoCliente}
                    onChange={(e) => setNovoCliente(e.target.value)}
                    style={{ ...inputStyle, width: 200 }}
                  />
                </label>
                <label>
                  Serviço:{" "}
                  <input
                    type="text"
                    value={novoServico}
                    onChange={(e) => setNovoServico(e.target.value)}
                    style={{ ...inputStyle, width: 200 }}
                  />
                </label>
                <label>
                  Valor previsto:{" "}
                  <input
                    type="number"
                    step="0.01"
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value)}
                    style={{ ...inputStyle, width: 120 }}
                  />
                </label>
                <label>
                  Funcionário:{" "}
                  <select
                    value={novoFuncionarioId}
                    onChange={(e) => setNovoFuncionarioId(e.target.value)}
                    style={{ ...inputStyle, width: 180 }}
                  >
                    <option value="">Selecione</option>
                    {funcionarios &&
                      Array.isArray(funcionarios) &&
                      funcionarios.map((func) => (
                        <option key={func.id} value={func.id}>
                          {func.nome}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <div style={{ marginTop: 8 }}>
                <button
                  onClick={criarAgendamentoGestor}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    border: "none",
                    background: "#28a745",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Salvar agendamento
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="gestor-table">
                <thead>
                  <tr>
                    <th className="gestor-th">Data</th>
                    <th className="gestor-th">Hora</th>
                    <th className="gestor-th">Cliente</th>
                    <th className="gestor-th">Serviço</th>
                    <th className="gestor-th">Funcionário</th>
                    <th className="gestor-th">Valor</th>
                    <th className="gestor-th">Aprovado</th>
                    <th className="gestor-th">Pago</th>
                    <th className="gestor-th">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {agendamentosGeral.map((a) => (
                    <tr key={a.id}>
                      <td className="gestor-td">{formatDataBr(a.data)}</td>
                      <td className="gestor-td">{a.horario}</td>
                      <td className="gestor-td">{a.cliente_nome || a.cliente}</td>
                      <td className="gestor-td">{a.servico}</td>
                      <td className="gestor-td">{a.funcionario ?? "-"}</td>
                      <td
                        className="gestor-td"
                        style={{ textAlign: "right" }}
                      >
                        R$ {a.valor_previsto?.toFixed(2) ?? "-"}
                      </td>
                      <td className="gestor-td">
                        {a.aprovado ? "Sim" : "Não"}
                      </td>
                      <td className="gestor-td">{a.pago ? "Sim" : "Não"}</td>
                      <td className="gestor-td">
                        <div className="gestor-actions">
                          {!a.aprovado && (
                            <button
                              onClick={() => marcarComoAprovado(a.id)}
                              className="gestor-btn gestor-btn-approve"
                            >
                              Aprovar
                            </button>
                          )}

                          <button
                            onClick={() => abrirModalPagamento(a)}
                            className="gestor-btn gestor-btn-paid"
                            style={a.pago ? { background: "#6c757d" } : {}}
                            disabled={false}  // ← REMOVA O disabled={a.pago}
                          >
                            {a.pago ? "Desmarcar pago" : "Marcar pago"}
                          </button>



                          <button
                            onClick={() => editarAgendamento(a)}
                            className="gestor-btn gestor-btn-edit"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => removerAgendamento(a.id)}
                            className="gestor-btn gestor-btn-remove"
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </>
        )}
        
        {/* Finanças Geral */}
        {view === "financas" && (
          <>
            <h2>Finanças geral</h2>

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
              <h3>Resumo por período</h3>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 8,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <label>
                  De:{" "}
                  <input
                    type="date"
                    value={dataIniFinancas}
                    onChange={(e) => setDataIniFinancas(e.target.value)}
                    style={{ ...inputStyle, width: 150 }}
                  />
                </label>
                <label>
                  Até:{" "}
                  <input
                    type="date"
                    value={dataFimFinancas}
                    onChange={(e) => setDataFimFinancas(e.target.value)}
                    style={{ ...inputStyle, width: 150 }}
                  />
                </label>
                <label>
                  Funcionário:{" "}
                  <select
                    value={funcionarioSelecionado || ""}
                    onChange={(e) =>
                      setFuncionarioSelecionado(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    style={{ ...inputStyle, width: 150 }}
                  >
                    <option value="">Todos</option>
                    {funcionarios &&
                      Array.isArray(funcionarios) &&
                      funcionarios.map((func, index) => (
                        <option
                          key={index}
                          value={typeof func === "object" ? func.id : func}
                        >
                          {typeof func === "object" ? func.nome : func}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  onClick={carregarFinancasGeral}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    border: "none",
                    background: "#ff4500",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Calcular
                </button>
              </div>

              {financasGeral ? (
                <div>
                  <p>
                    Total faturado:{" "}
                    <strong>
                      R{" "}
                      {financasGeral.faturamento_total?.toFixed(2) || "0.00"}
                    </strong>
                  </p>
                  <p>
                    Lucro estúdio:{" "}
                    <strong>
                      R {financasGeral.lucro_estudio?.toFixed(2) || "0.00"}
                    </strong>
                  </p>
                </div>
              ) : (
                <p>Selecione um período e clique em Calcular</p>
              )}
            </div>
          </>
        )}

        {/* Funcionários */}
        {view === "funcionarios" && (
          <>
            {/* Formulário de cadastro/edição */}
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
              <h3>Cadastro / edição</h3>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                <label>
                  Nome:{" "}
                  <input
                    type="text"
                    value={funcNome || ""}
                    onChange={(e) => setFuncNome(e.target.value)}
                    style={{ ...inputStyle, width: 200 }}
                  />
                </label>
                <label>
                  Cargo:{" "}
                  <input
                    type="text"
                    value={funcCargo || ""}
                    onChange={(e) => setFuncCargo(e.target.value)}
                    style={{ ...inputStyle, width: 160 }}
                  />
                </label>
                <label>
                  % Funcionário:{" "}
                  <input
                    type="number"
                    value={funcPerc || ""}
                    onChange={(e) => setFuncPerc(e.target.value)}
                    style={{ ...inputStyle, width: 100 }}
                  />
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={funcRequerAprovacao}
                    onChange={(e) =>
                      setFuncRequerAprovacao(e.target.checked)
                    }
                  />
                  Requer aprovação
                </label>
                <label>
                  Senha:{" "}
                  <input
                    type="password"
                    value={funcSenha || ""}
                    onChange={(e) => setFuncSenha(e.target.value)}
                    style={{ ...inputStyle, width: 160 }}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  onClick={salvarFuncionario}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    border: "none",
                    background: "#28a745",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {funcEditandoId
                    ? "Salvar alterações"
                    : "Adicionar funcionário"}
                </button>
                {funcEditandoId && (
                  <button
                    onClick={cancelarEdicaoFuncionario}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 4,
                      border: "none",
                      background: "#6c757d",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={removerFuncionarioSelecionado}
                  disabled={!funcSelecionadoId}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    border: "none",
                    background: funcSelecionadoId ? "#dc3545" : "#aaa",
                    color: "#fff",
                    cursor: funcSelecionadoId ? "pointer" : "default",
                  }}
                >
                  Remover selecionado
                </button>
              </div>
            </div>

            {/* Lista de funcionários */}
            <div className="table-wrapper">
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "#fff",
                }}
              >
                <thead>
                  <tr>
                    <th style={thTdStyle}>ID</th>
                    <th style={thTdStyle}>Nome</th>
                    <th style={thTdStyle}>Cargo</th>
                    <th style={thTdStyle}>% Funcionário</th>
                    <th style={thTdStyle}>% Estúdio</th>
                    <th style={thTdStyle}>Requer aprovação</th>
                    <th style={thTdStyle}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {listaFuncionarios.map((f) => (
                    <tr
                      key={f.id}
                      style={{
                        background:
                          funcSelecionadoId === f.id
                            ? "rgba(255,69,0,0.08)"
                            : "white",
                      }}
                    >
                      <td style={thTdStyle}>{f.id}</td>
                      <td style={thTdStyle}>{f.nome}</td>
                      <td style={thTdStyle}>{f.cargo}</td>
                      <td style={tdNumberStyle}>
                        {f.perc_funcionario?.toFixed(1)}%
                      </td>
                      <td style={tdNumberStyle}>
                        {f.perc_estudio?.toFixed(1)}%
                      </td>
                      <td style={thTdStyle}>
                        {f.requer_aprovacao ? "Sim" : "Não"}
                      </td>
                      <td style={thTdStyle}>
                        <button
                          onClick={() => carregarFuncionarioParaEdicao(f)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 3,
                            border: "none",
                            background: "#007bff",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      {/* Configurações de layout */}
      {view === "layout" && user.tipo === "superadmin" && (
        <div>
          <ConfigLayout />

          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 0 6px rgba(0,0,0,0.1)",
              maxWidth: 400,
            }}
          >
            <h3>Novo usuário administrador</h3>
            <input
              placeholder="Login do admin"
              value={novoLoginAdmin}
              onChange={(e) => setNovoLoginAdmin(e.target.value)}
              style={{ ...inputStyle, width: "100%", marginBottom: 8 }}
            />
            <input
              placeholder="Senha"
              type="password"
              value={novaSenhaAdmin}
              onChange={(e) => setNovaSenhaAdmin(e.target.value)}
              style={{ ...inputStyle, width: "100%", marginBottom: 8 }}
            />
            <button
              onClick={criarUsuarioAdmin}
              style={{
                padding: "8px 16px",
                borderRadius: 4,
                border: "none",
                background: "#ff4500",
                color: "#fff",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Criar administrador
            </button>
          </div>
        </div>
      )}
    </div>
    <ModalPagamento
          isOpen={showModalPagamento}
          agendamento={agendamentoParaPagamento}
          modoPagamento={modoPagamento}
          setModoPagamento={setModoPagamento}
          valorPago={valorPago}
          setValorPago={setValorPago}
          descricaoPagamento={descricaoPagamento}
          setDescricaoPagamento={setDescricaoPagamento}
          onConfirmar={confirmarPagamento}
          onCancelar={fecharModalPagamento}
          primaryColor={primaryColor}
        />
  </div>
  );
}

export default GestorApp;
