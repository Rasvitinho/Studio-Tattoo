import { useState, useEffect } from "react";
import axios from "axios";
import { useStudioConfig } from "../../context/StudioConfigContext";
import { useTheme } from "../../context/ThemeContext";
import CadastroClientePage from "../Gestor/CadastroClientePage";
import BloqueiosPage from "./BloqueiosPage"; //

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

const tdNumberStyle = {
  ...thTdStyle,
  textAlign: "right",
};

const tdHighlightStyle = {
  ...tdNumberStyle,
  backgroundColor: "#f0f9ff",
  fontWeight: "bold",
};

const cardResumoStyle = {
  flex: "0 0 220px",
  background: "#ffffff",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
};

const cardResumoLabelStyle = {
  fontSize: 12,
  color: "#666",
};

const cardResumoValorStyle = {
  fontSize: 20,
  fontWeight: "bold",
  marginTop: 4,
};

function formatDataBr(dataStr) {
  if (!dataStr) return "-";
  const [yyyy, mm, dd] = dataStr.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

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

function FuncionarioApp({ user, apiBase, onLogout }) {
  const [view, setView] = useState("home");

  // Tema claro/escuro
  const { theme, toggleTheme } = useTheme();

  // Config global do estúdio
  const { config } = useStudioConfig();
  const studioName = config?.studio_name || "Meu Estúdio";
  const studioLogo = config?.studio_logo || null;
  const menuBgColor = config?.primary_color || "#1a1a1a";
  const primaryColor = config?.primary_color || "#ff4500";

  // Dashboard (próximos agendamentos do funcionário)
  const [proximosAgendamentos, setProximosAgendamentos] = useState([]);

  // Minha agenda (funcionário) - filtros
  const [dataIniMinhaAgenda, setDataIniMinhaAgenda] = useState("");
  const [dataFimMinhaAgenda, setDataFimMinhaAgenda] = useState("");
  const [meusAgendamentos, setMeusAgendamentos] = useState([]);
  const [periodoRapido, setPeriodoRapido] = useState("");

  // Data específica do novo agendamento
  const [dataNovoAg, setDataNovoAg] = useState("");

  const [novoAgFuncionario, setNovoAgFuncionario] = useState({
    horario: "",
    cliente: "",
    servico: "",
    tipo: "tatuagem",
    valor_previsto: "",
  });

  const [erroAgendaFuncionario, setErroAgendaFuncionario] = useState("");

  // Minhas finanças
  const [minhasFinancas, setMinhasFinancas] = useState(null);
  const [dataIniMinhasFin, setDataIniMinhasFin] = useState("");
  const [dataFimMinhasFin, setDataFimMinhasFin] = useState("");

  // Carregar dashboard só do funcionário logado (usando agenda-periodo)
  async function carregarDashboardFuncionario() {
    if (!user?.funcionario_id) return;

    const hoje = new Date();
    const dataIni = hoje.toISOString().slice(0, 10);

    const fim = new Date();
    fim.setDate(fim.getDate() + 7); // próximos 7 dias
    const dataFim = fim.toISOString().slice(0, 10);

    try {
      const url = `${apiBase}/agenda/funcionario-periodo/${user.funcionario_id}/${dataIni}/${dataFim}`;
      const resp = await axios.get(url);
      setProximosAgendamentos(resp.data.slice(0, 5));
    } catch (err) {
      console.error("Erro ao carregar dashboard do funcionário:", err);
    }
  }

  // quando mudar para a view home, carrega dashboard
  useEffect(() => {
    if (view === "home") {
      carregarDashboardFuncionario();
    }
  }, [view]);

  function handlePeriodoRapido(valor) {
    setPeriodoRapido(valor);
    if (!valor) return;

    const hoje = new Date();
    const dataFimBase =
      dataFimMinhaAgenda || hoje.toISOString().slice(0, 10);
    const fimDate = new Date(dataFimBase);

    if (valor === "mes_atual") {
      const ano = fimDate.getFullYear();
      const mes = fimDate.getMonth();

      const iniDate = new Date(ano, mes, 1);
      const ini = iniDate.toISOString().slice(0, 10);
      const fim = fimDate.toISOString().slice(0, 10);

      setDataIniMinhaAgenda(ini);
      setDataFimMinhaAgenda(fim);
      return;
    }

    const dias = Number(valor);
    const fim = fimDate.toISOString().slice(0, 10);

    const iniDate = new Date(fimDate);
    iniDate.setDate(iniDate.getDate() - (dias - 1));
    const ini = iniDate.toISOString().slice(0, 10);

    setDataIniMinhaAgenda(ini);
    setDataFimMinhaAgenda(fim);
  }

  async function carregarMinhaAgenda() {
    if (!dataIniMinhaAgenda || !user?.funcionario_id) return;

    try {
      let url;
      if (dataFimMinhaAgenda && dataFimMinhaAgenda !== dataIniMinhaAgenda) {
        url = `${apiBase}/agenda/funcionario-periodo/${user.funcionario_id}/${dataIniMinhaAgenda}/${dataFimMinhaAgenda}`;
      } else {
        url = `${apiBase}/agenda/funcionario/${user.funcionario_id}/${dataIniMinhaAgenda}`;
      }

      const resp = await axios.get(url);
      setMeusAgendamentos(resp.data);
    } catch (err) {
      console.error("Erro ao carregar minha agenda:", err);
    }
  }

  async function salvarMeuAgendamento() {
    setErroAgendaFuncionario("");

    let horarioStr = novoAgFuncionario.horario.trim();

    if (horarioStr.length === 4 && /^\d{4}$/.test(horarioStr)) {
      horarioStr = `${horarioStr.slice(0, 2)}:${horarioStr.slice(2)}`;
      setNovoAgFuncionario((prev) => ({ ...prev, horario: horarioStr }));
    }

    if (!dataNovoAg) {
      setErroAgendaFuncionario("Selecione a data da agenda.");
      return;
    }
    if (!horarioStr) {
      setErroAgendaFuncionario("Informe o horário (HH:MM).");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(horarioStr)) {
      setErroAgendaFuncionario(
        "Horário inválido. Use o formato HH:MM, por exemplo 14:30."
      );
      return;
    }
    if (!novoAgFuncionario.cliente) {
      setErroAgendaFuncionario("Informe o nome do cliente.");
      return;
    }

    try {
      await axios.post(`${apiBase}/agenda/`, {
        data: dataNovoAg,
        horario: horarioStr,
        cliente: novoAgFuncionario.cliente,
        servico: novoAgFuncionario.servico,
        tipo: novoAgFuncionario.tipo,
        valor_previsto: novoAgFuncionario.valor_previsto
          ? Number(novoAgFuncionario.valor_previsto)
          : null,
        funcionario_id: user.funcionario_id,
      });

      setNovoAgFuncionario({
        horario: "",
        cliente: "",
        servico: "",
        tipo: "tatuagem",
        valor_previsto: "",
      });

      carregarMinhaAgenda();
      carregarDashboardFuncionario();
    } catch (err) {
      console.error(
        "Erro ao salvar agendamento FUNC:",
        err.response?.data || err
      );
      setErroAgendaFuncionario("Erro ao salvar agendamento.");
    }
  }

  async function carregarMinhasFinancas() {
    if (!dataIniMinhasFin || !dataFimMinhasFin || !user?.funcionario_id)
      return;

    try {
      const resp = await axios.post(`${apiBase}/financeiro/resumo-periodo`, {
        data_ini: dataIniMinhasFin,
        data_fim: dataFimMinhasFin,
        funcionario_id: user.funcionario_id,
        tipo: null,
      });
      setMinhasFinancas(resp.data);
    } catch (err) {
      console.error("Erro ao carregar minhas finanças:", err);
    }
  }

  // fundo do conteúdo conforme tema
  const contentBg = theme === "dark" ? "#f3f3f3" : "#ffffff";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "sans-serif",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: 220,
          background: menuBgColor,
          color: "#fff",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
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

        <button
          style={btnStyle(view === "home", primaryColor)}
          onClick={() => setView("home")}
        >
          Dashboard
        </button>

        <button
          style={btnStyle(view === "minha_agenda", primaryColor)}
          onClick={() => setView("minha_agenda")}
        >
          Minha agenda
        </button>

        <button
          style={btnStyle(view === "minhas_financas", primaryColor)}
          onClick={() => setView("minhas_financas")}
        >
          Minhas finanças
        </button>

                {/* Cadastro de Cliente */}
        <button
          style={btnStyle(view === "cadastro_cliente", primaryColor)}
          onClick={() => setView("cadastro_cliente")}
        >
          Cadastro de Cliente
        </button>

        {/* ✅ NOVO: Botão de Bloqueios */}
        <button
          style={btnStyle(view === "bloqueios", primaryColor)}
          onClick={() => setView("bloqueios")}
        >
          📅 Gerenciar Bloqueios
        </button>

        <button
          style={btnStyle(false, "#555")}
          onClick={toggleTheme}
        >
          Tema: {theme === "dark" ? "Claro" : "Escuro"}
        </button>


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
      <div
        style={{
          flex: 1,
          padding: 24,
          background: contentBg,
        }}
      >
        {/* Dashboard funcionário */}
        {view === "home" && (
          <>
            <h2>Dashboard</h2>

            <div className="table-wrapper" style={{ marginTop: 12 }}>
              <h3>Próximos agendamentos</h3>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "#fff",
                }}
              >
                <thead>
                  <tr>
                    <th style={thTdStyle}>Data</th>
                    <th style={thTdStyle}>Hora</th>
                    <th style={thTdStyle}>Cliente</th>
                    <th style={thTdStyle}>Serviço</th>
                    <th style={thTdStyle}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {proximosAgendamentos.map((a) => (
                    <tr key={a.id}>
                      <td style={thTdStyle}>{formatDataBr(a.data)}</td>
                      <td style={thTdStyle}>{a.horario}</td>
                      <td style={thTdStyle}>{a.cliente}</td>
                      <td style={thTdStyle}>{a.servico}</td>
                      <td style={tdNumberStyle}>
                        {a.valor_previsto != null
                          ? `R$ ${Number(a.valor_previsto).toFixed(2)}`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                  {proximosAgendamentos.length === 0 && (
                    <tr>
                      <td style={thTdStyle} colSpan={5}>
                        Nenhum agendamento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Minha agenda */}
        {view === "minha_agenda" && (
          <>
            <h2>Minha agenda</h2>

            {/* Filtros de consulta */}
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <label>
                De:{" "}
                <input
                  type="date"
                  value={dataIniMinhaAgenda}
                  onChange={(e) => setDataIniMinhaAgenda(e.target.value)}
                  style={{ ...inputStyle, width: 150 }}
                />
              </label>
              <label style={{ marginLeft: 8 }}>
                Até:{" "}
                <input
                  type="date"
                  value={dataFimMinhaAgenda}
                  onChange={(e) => setDataFimMinhaAgenda(e.target.value)}
                  style={{ ...inputStyle, width: 150 }}
                />
              </label>
              <label style={{ marginLeft: 8 }}>
                Período rápido:{" "}
                <select
                  value={periodoRapido}
                  onChange={(e) => handlePeriodoRapido(e.target.value)}
                  style={{ ...inputStyle, width: 140 }}
                >
                  <option value="">--</option>
                  <option value="7">7 dias</option>
                  <option value="15">15 dias</option>
                  <option value="22">22 dias</option>
                  <option value="mes_atual">Mês Atual</option>
                </select>
              </label>
              <button
                onClick={carregarMinhaAgenda}
                style={{
                  marginLeft: 8,
                  padding: "6px 12px",
                  borderRadius: 4,
                  border: "none",
                  background: primaryColor,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Carregar
              </button>
            </div>

            {/* Novo agendamento */}
            <div
              style={{
                marginTop: 16,
                marginBottom: 16,
                padding: 12,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 0 6px rgba(0,0,0,0.1)",
              }}
            >
              <h3>Novo agendamento</h3>

              {erroAgendaFuncionario && (
                <div
                  style={{
                    marginTop: 4,
                    marginBottom: 4,
                    color: "#c0392b",
                    fontSize: 13,
                  }}
                >
                  {erroAgendaFuncionario}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <input
                  type="date"
                  value={dataNovoAg}
                  onChange={(e) => setDataNovoAg(e.target.value)}
                  style={{ ...inputStyle, width: 150 }}
                />
                <input
                  placeholder="Hora (HH:MM)"
                  value={novoAgFuncionario.horario}
                  onChange={(e) =>
                    setNovoAgFuncionario({
                      ...novoAgFuncionario,
                      horario: e.target.value,
                    })
                  }
                  style={{ ...inputStyle, width: 110 }}
                />
                <input
                  placeholder="Cliente"
                  value={novoAgFuncionario.cliente}
                  onChange={(e) =>
                    setNovoAgFuncionario({
                      ...novoAgFuncionario,
                      cliente: e.target.value,
                    })
                  }
                  style={{ ...inputStyle, flex: 1, minWidth: 160 }}
                />
                <input
                  placeholder="Serviço"
                  value={novoAgFuncionario.servico}
                  onChange={(e) =>
                    setNovoAgFuncionario({
                      ...novoAgFuncionario,
                      servico: e.target.value,
                    })
                  }
                  style={{ ...inputStyle, flex: 1, minWidth: 160 }}
                />
                <select
                  value={novoAgFuncionario.tipo}
                  onChange={(e) =>
                    setNovoAgFuncionario({
                      ...novoAgFuncionario,
                      tipo: e.target.value,
                    })
                  }
                  style={{ ...inputStyle, width: 140 }}
                >
                  <option value="tatuagem">Tatuagem</option>
                  <option value="piercing">Piercing</option>
                  <option value="venda">Venda</option>
                </select>
                <input
                  placeholder="Valor"
                  type="number"
                  value={novoAgFuncionario.valor_previsto}
                  onChange={(e) =>
                    setNovoAgFuncionario({
                      ...novoAgFuncionario,
                      valor_previsto: e.target.value,
                    })
                  }
                  style={{ ...inputStyle, width: 120 }}
                />
                <button
                  onClick={salvarMeuAgendamento}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 4,
                    border: "none",
                    background: "#28a745",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Salvar
                </button>
              </div>
            </div>

            {/* Tabela de agendamentos */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 8,
                background: "#fff",
              }}
            >
              <thead>
                <tr>
                  <th style={thTdStyle}>Data</th>
                  <th style={thTdStyle}>Hora</th>
                  <th style={thTdStyle}>Cliente</th>
                  <th style={thTdStyle}>Serviço</th>
                  <th style={thTdStyle}>Valor</th>
                  <th style={thTdStyle}>Aprovado</th>
                </tr>
              </thead>
              <tbody>
                {meusAgendamentos.map((a) => (
                  <tr key={a.id}>
                    <td style={thTdStyle}>{formatDataBr(a.data)}</td>
                    <td style={thTdStyle}>{a.horario}</td>
                    <td style={thTdStyle}>{a.cliente}</td>
                    <td style={thTdStyle}>{a.servico}</td>
                    <td style={tdNumberStyle}>
                      {a.valor_previsto != null
                        ? `R$ ${Number(a.valor_previsto).toFixed(2)}`
                        : "-"}
                    </td>
                    <td style={thTdStyle}>{a.aprovado ? "Sim" : "Não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Minhas finanças */}
        {view === "minhas_financas" && (
          <>
            <h2>Minhas finanças</h2>

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
                    value={dataIniMinhasFin}
                    onChange={(e) => setDataIniMinhasFin(e.target.value)}
                    style={{ ...inputStyle, width: 150 }}
                  />
                </label>
                <label>
                  Até:{" "}
                  <input
                    type="date"
                    value={dataFimMinhasFin}
                    onChange={(e) => setDataFimMinhasFin(e.target.value)}
                    style={{ ...inputStyle, width: 150 }}
                  />
                </label>
                <button
                  onClick={carregarMinhasFinancas}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    border: "none",
                    background: primaryColor,
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Calcular
                </button>
              </div>

              {minhasFinancas ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginBottom: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={cardResumoStyle}>
                      <div style={cardResumoLabelStyle}>
                        Total faturado (sem desconto)
                      </div>
                      <div style={cardResumoValorStyle}>
                        R{" "}
                        {minhasFinancas.faturamento_total?.toFixed(2) ||
                          "0.00"}
                      </div>
                    </div>

                    <div style={cardResumoStyle}>
                      <div style={cardResumoLabelStyle}>
                        Total com sua porcentagem
                      </div>
                      <div style={cardResumoValorStyle}>
                        R{" "}
                        {minhasFinancas.por_funcionario?.[0]
                          ?.parte_funcionario?.toFixed(2) || "0.00"}
                      </div>
                    </div>
                  </div>

                  {minhasFinancas.por_funcionario?.[0] && (
                    <div style={{ marginTop: 16 }}>
                      <h4>Detalhes</h4>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          marginTop: 8,
                          background: "#fff",
                        }}
                      >
                        <tbody>
                          <tr>
                            <td style={thTdStyle}>Sua porcentagem</td>
                            <td style={tdNumberStyle}>
                              {
                                minhasFinancas.por_funcionario[0]
                                  .perc_funcionario
                              }
                              %
                            </td>
                          </tr>
                          <tr>
                            <td style={thTdStyle}>Faturamento total</td>
                            <td style={tdNumberStyle}>
                              R{" "}
                              {minhasFinancas.por_funcionario[0].faturamento.toFixed(
                                2
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td style={thTdStyle}>
                              Valor que você recebe
                            </td>
                            <td
                              style={{
                                ...tdHighlightStyle,
                                fontSize: 16,
                                fontWeight: "bold",
                              }}
                            >
                              R{" "}
                              {minhasFinancas.por_funcionario[0].parte_funcionario.toFixed(
                                2
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ marginTop: 8, fontSize: 14, color: "#555" }}>
                  Informe um período e clique em Calcular para ver o resumo.
                </div>
              )}
            </div>
          </>
        )}

        {/* NOVO: Cadastro de Cliente */}
        {view === "cadastro_cliente" && (
          <CadastroClientePage
            apiBase={apiBase}
            onClose={() => setView("home")}
          />
        )}
                {/* ✅ NOVO: Página de Bloqueios */}
        {view === "bloqueios" && (
          <BloqueiosPage user={user} apiBase={apiBase} />
        )}
      </div>
    </div>
  );
}

export default FuncionarioApp;
