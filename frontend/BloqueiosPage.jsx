import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BloqueiosPage.css';

const BloqueiosPage = () => {
  const [tipoBloquei, setTipoBloquei] = useState('dia'); // 'dia' ou 'horario'
  const [data, setData] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('09:00');
  const [horarioFim, setHorarioFim] = useState('18:00');
  const [motivo, setMotivo] = useState('');
  const [bloqueios, setBloqueios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  // ✅ CORRECTED: Use /bloqueios sem /api
  const API_BASE = 'http://localhost:8000';

  // Carregar bloqueios ao abrir a página
  useEffect(() => {
    carregarBloqueios();
  }, []);

 // ========== CARREGAR BLOQUEIOS ==========
    const carregarBloqueios = async () => {
    try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
        setErro('❌ Token não encontrado. Faça login novamente.');
        return;
        }

        if (!user?.id) {
        setErro('❌ Usuário não encontrado.');
        return;
        }

        const response = await axios.get(
        console.log('DEBUG bloqueios funcionário:', response.data)
        `${API_BASE}/bloqueios/funcionario/${user.id}`,
        {
            headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
            }
        }
        );
        
        setBloqueios(response.data || []);
        setErro('');
    } catch (err) {
        const mensagemErro = err.response?.data?.detail || 'Erro ao carregar bloqueios';
        setErro(`❌ ${mensagemErro}`);
        console.error('Erro ao carregar bloqueios:', err);
    } finally {
        setLoading(false);
    }
    };

  // ========== CRIAR BLOQUEIO ==========
  const criarBloqueio = async (e) => {
    e.preventDefault();
    setMensagem('');
    setErro('');

    // Validações
    if (!data) {
      setErro('❌ Selecione uma data');
      return;
    }

    if (tipoBloquei === 'horario') {
      if (!horarioInicio || !horarioFim) {
        setErro('❌ Preencha horário de início e fim');
        return;
      }
      if (horarioInicio >= horarioFim) {
        setErro('❌ Horário de início deve ser menor que o fim');
        return;
      }
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setErro('❌ Token não encontrado. Faça login novamente.');
        return;
      }

      const payload = {
        data,
        motivo: motivo.trim() || 'Sem motivo especificado'
      };

      const endpoint = tipoBloquei === 'dia' 
        ? '/bloqueios/bloquear-dia'
        : '/bloqueios/bloquear-horario';

      if (tipoBloquei === 'horario') {
        payload.horario_inicio = horarioInicio;
        payload.horario_fim = horarioFim;
      }

      const response = await axios.post(`${API_BASE}${endpoint}`, payload, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setMensagem(response.data.mensagem || '✅ Bloqueio criado com sucesso');
      
      // Limpar formulário
      setData('');
      setHorarioInicio('09:00');
      setHorarioFim('18:00');
      setMotivo('');

      // Recarregar lista
      await carregarBloqueios();

      // Limpar mensagem após 4s
      setTimeout(() => setMensagem(''), 4000);
    } catch (err) {
      const mensagemErro = err.response?.data?.detail || 'Erro ao criar bloqueio';
      setErro(`❌ ${mensagemErro}`);
      console.error('Erro ao criar bloqueio:', err);
    } finally {
      setLoading(false);
    }
  };

  // ========== REMOVER BLOQUEIO ==========
  const removerBloqueio = async (bloqueioId) => {
    if (!window.confirm('Deseja realmente remover este bloqueio?')) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setErro('❌ Token não encontrado. Faça login novamente.');
        return;
      }

      await axios.delete(`${API_BASE}/bloqueios/desbloquear/${bloqueioId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setMensagem('✅ Bloqueio removido com sucesso');
      await carregarBloqueios();
      setTimeout(() => setMensagem(''), 4000);
    } catch (err) {
      const mensagemErro = err.response?.data?.detail || 'Erro ao remover bloqueio';
      setErro(`❌ ${mensagemErro}`);
      console.error('Erro ao remover bloqueio:', err);
    } finally {
      setLoading(false);
    }
  };

  // ========== FORMATAR DATA ==========
  const formatarData = (dataStr) => {
    try {
      const [ano, mes, dia] = dataStr.split('-');
      return `${dia}/${mes}/${ano}`;
    } catch {
      return dataStr;
    }
  };

  // ========== RENDER ==========
  return (
    <div className="bloqueios-page">
      <div className="container">
        <h1>📅 Gerenciar Bloqueios</h1>
        <p className="subtitulo">Bloqueie dias ou horários que você não está disponível</p>

        {/* MENSAGENS */}
        {mensagem && <div className="alert alert-success">{mensagem}</div>}
        {erro && <div className="alert alert-error">{erro}</div>}

        <div className="bloqueios-container">
          {/* ========== FORMULÁRIO ==========  */}
          <div className="form-section">
            <h2>Criar Novo Bloqueio</h2>
            
            <form onSubmit={criarBloqueio}>
              {/* TIPO DE BLOQUEIO */}
              <div className="form-group">
                <label>Tipo de Bloqueio:</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      value="dia"
                      checked={tipoBloquei === 'dia'}
                      onChange={(e) => setTipoBloquei(e.target.value)}
                    />
                    📆 Bloquear Dia Inteiro
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="horario"
                      checked={tipoBloquei === 'horario'}
                      onChange={(e) => setTipoBloquei(e.target.value)}
                    />
                    🕐 Bloquear Intervalo de Horário
                  </label>
                </div>
              </div>

              {/* DATA */}
              <div className="form-group">
                <label htmlFor="data">Selecione a Data: *</label>
                <input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              {/* HORÁRIOS (só aparece se tipo = 'horario') */}
              {tipoBloquei === 'horario' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="horarioInicio">Horário de Início: *</label>
                      <input
                        id="horarioInicio"
                        type="time"
                        value={horarioInicio}
                        onChange={(e) => setHorarioInicio(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="horarioFim">Horário de Fim: *</label>
                      <input
                        id="horarioFim"
                        type="time"
                        value={horarioFim}
                        onChange={(e) => setHorarioFim(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* MOTIVO */}
              <div className="form-group">
                <label htmlFor="motivo">Motivo (opcional):</label>
                <textarea
                  id="motivo"
                  placeholder="Ex: Médico, Férias, Manutenção, etc."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows="2"
                />
              </div>

              {/* BOTÃO */}
              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? '⏳ Carregando...' : '🔒 Criar Bloqueio'}
              </button>
            </form>
          </div>

          {/* ========== LISTA DE BLOQUEIOS ==========  */}
          <div className="list-section">
            <h2>Seus Bloqueios</h2>
            
            {bloqueios.length === 0 ? (
              <p className="empty-message">📭 Nenhum bloqueio registrado</p>
            ) : (
              <div className="bloqueios-list">
                {bloqueios.map((bloqueio) => (
                  <div key={bloqueio.id} className={`bloqueio-card bloqueio-${bloqueio.tipo}`}>
                    <div className="bloqueio-header">
                      <div className="bloqueio-info">
                        <h3>
                          {bloqueio.tipo === 'dia' ? '📆 Dia Inteiro' : '🕐 Intervalo'}
                        </h3>
                        <p className="data-bloqueio">
                          <strong>{formatarData(bloqueio.data)}</strong>
                          {bloqueio.tipo === 'horario' && (
                            <> • {bloqueio.horario_inicio} até {bloqueio.horario_fim}</>
                          )}
                        </p>
                      </div>
                      <button
                        className="btn-delete"
                        onClick={() => removerBloqueio(bloqueio.id)}
                        disabled={loading}
                        title="Desbloquear"
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {bloqueio.motivo && (
                      <p className="bloqueio-motivo">
                        <strong>Motivo:</strong> {bloqueio.motivo}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BloqueiosPage;
