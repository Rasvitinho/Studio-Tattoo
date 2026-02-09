import React, { useState, useEffect } from 'react';
import axios from 'axios';

    const BloqueiosPage = ({ user, apiBase }) => {
    const [tipoBloquei, setTipoBloquei] = useState('dia');
    const [data, setData] = useState('');
    const [horarioInicio, setHorarioInicio] = useState('09:00');
    const [horarioFim, setHorarioFim] = useState('18:00');
    const [motivo, setMotivo] = useState('');
    const [bloqueios, setBloqueios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [mensagem, setMensagem] = useState('');
    const [erro, setErro] = useState('');

    const API_URL = `${apiBase}/bloqueios`;

    useEffect(() => {
        carregarBloqueios();
    }, []);

    const carregarBloqueios = async () => {
        try {
            setLoading(true);

            const response = await axios.get(`${API_URL}/funcionario/${user.id}`, {
            headers: { 
                'Content-Type': 'application/json'
            }
            });
            
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


    const criarBloqueio = async (e) => {
        e.preventDefault();
        setMensagem('');
        setErro('');

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

            // Gerar array de horários
            let horariosBloqueados = null;
            if (tipoBloquei === 'horario') {
            const horariosArray = [];
            let horaAtual = horarioInicio;
            
            while (horaAtual < horarioFim) {
                horariosArray.push(horaAtual);
                
                // Incrementar 30 minutos
                const [h, m] = horaAtual.split(':').map(Number);
                let novoM = m + 30;
                let novoH = h;
                
                if (novoM >= 60) {
                novoM -= 60;
                novoH += 1;
                }
                
                horaAtual = `${String(novoH).padStart(2, '0')}:${String(novoM).padStart(2, '0')}`;
                
                if (horaAtual > '23:59') break;
            }
            
            horariosBloqueados = JSON.stringify(horariosArray);
            }

            const payload = {
            funcionario_id: user.id,
            data: data,
            tipo_bloqueio: tipoBloquei === 'dia' ? 'dia_completo' : 'horarios_especificos',
            horarios_bloqueados: horariosBloqueados,
            motivo: motivo.trim() || 'Sem motivo especificado'
            };

            const response = await axios.post(`${API_URL}`, payload, {
            headers: { 
                'Content-Type': 'application/json'
            }
            });

            setMensagem('✅ Bloqueio criado com sucesso');
            
            // Limpar formulário
            setData('');
            setHorarioInicio('09:00');
            setHorarioFim('18:00');
            setMotivo('');

            // Recarregar bloqueios
            await carregarBloqueios();

            setTimeout(() => setMensagem(''), 4000);
        } catch (err) {
            const mensagemErro = err.response?.data?.detail || 'Erro ao criar bloqueio';
            setErro(`❌ ${mensagemErro}`);
            console.error('Erro ao criar bloqueio:', err);
        } finally {
            setLoading(false);
        }
        };


    const removerBloqueio = async (bloqueioId) => {
        if (!window.confirm('Deseja realmente remover este bloqueio?')) {
            return;
        }

        try {
            setLoading(true);

            await axios.delete(`${API_URL}/${bloqueioId}`, {
            headers: { 
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

    const formatarData = (dataStr) => {
        try {
        const [ano, mes, dia] = dataStr.split('-');
        return `${dia}/${mes}/${ano}`;
        } catch {
        return dataStr;
        }
    };

    const alertStyle = {
        padding: '12px',
        borderRadius: '4px',
        marginBottom: '16px',
        border: '1px solid'
    };

    const alertSuccessStyle = {
        ...alertStyle,
        background: '#d4edda',
        color: '#155724',
        borderColor: '#c3e6cb'
    };

    const alertErrorStyle = {
        ...alertStyle,
        background: '#f8d7da',
        color: '#721c24',
        borderColor: '#f5c6cb'
    };

    const containerStyle = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginTop: '20px'
    };

    const cardStyle = {
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };

    const inputStyle = {
        width: '100%',
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        fontSize: '14px',
        marginTop: '4px',
        fontFamily: 'inherit',
        boxSizing: 'border-box'
    };

    const radioGroupStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginTop: '8px'
    };

    const labelStyle = {
        fontWeight: 'bold',
        marginBottom: '8px',
        display: 'block'
    };

    const formGroupStyle = {
        marginBottom: '16px'
    };

    const buttonStyle = {
        width: '100%',
        padding: '10px',
        background: '#ff4500',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '14px',
        marginTop: '8px'
    };

    const bloqueioCardStyle = (tipo) => ({
        padding: '16px',
        borderRadius: '8px',
        border: `3px solid ${tipo === 'dia' ? '#ff4500' : '#ffd700'}`,
        background: tipo === 'dia' ? '#fff8f3' : '#fffef5',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px'
    });

    const deleteButtonStyle = {
        background: '#ff5252',
        color: '#fff',
        border: 'none',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        cursor: 'pointer',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 0
    };

    return (
        <div style={{ padding: '20px' }}>
        <h2>📅 Gerenciar Bloqueios</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
            Bloqueie dias ou horários que você não está disponível para agendamentos
        </p>

        {mensagem && <div style={alertSuccessStyle}>{mensagem}</div>}
        {erro && <div style={alertErrorStyle}>{erro}</div>}

        <div style={containerStyle}>
            {/* ===== FORMULÁRIO ===== */}
            <div style={cardStyle}>
            <h3>Criar Novo Bloqueio</h3>
            
            <form onSubmit={criarBloqueio}>
                {/* Tipo de Bloqueio */}
                <div style={formGroupStyle}>
                <label style={labelStyle}>Tipo de Bloqueio:</label>
                <div style={radioGroupStyle}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal' }}>
                    <input
                        type="radio"
                        value="dia"
                        checked={tipoBloquei === 'dia'}
                        onChange={(e) => setTipoBloquei(e.target.value)}
                    />
                    📆 Bloquear Dia Inteiro
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal' }}>
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

                {/* Data */}
                <div style={formGroupStyle}>
                <label style={labelStyle}>Selecione a Data: *</label>
                <input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    style={inputStyle}
                />
                </div>

                {/* Horários */}
                {tipoBloquei === 'horario' && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                        <label style={labelStyle}>Horário de Início: *</label>
                        <input
                        type="time"
                        value={horarioInicio}
                        onChange={(e) => setHorarioInicio(e.target.value)}
                        required
                        style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Horário de Fim: *</label>
                        <input
                        type="time"
                        value={horarioFim}
                        onChange={(e) => setHorarioFim(e.target.value)}
                        required
                        style={inputStyle}
                        />
                    </div>
                    </div>
                </>
                )}

                {/* Motivo */}
                <div style={formGroupStyle}>
                <label style={labelStyle}>Motivo (opcional):</label>
                <textarea
                    placeholder="Ex: Médico, Férias, Manutenção, etc."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows="2"
                    style={inputStyle}
                />
                </div>

                {/* Botão */}
                <button 
                type="submit" 
                disabled={loading}
                style={{
                    ...buttonStyle,
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                }}
                >
                {loading ? '⏳ Carregando...' : '🔒 Criar Bloqueio'}
                </button>
            </form>
            </div>

            {/* ===== LISTA DE BLOQUEIOS ===== */}
            <div style={cardStyle}>
            <h3>Seus Bloqueios</h3>
            
            {bloqueios.length === 0 ? (
                <p style={{ color: '#999', fontStyle: 'italic', marginTop: '20px' }}>
                📭 Nenhum bloqueio registrado
                </p>
            ) : (
                <div style={{ maxHeight: '600px', overflowY: 'auto', marginTop: '12px' }}>
                {bloqueios.map((bloqueio) => (
                    <div key={bloqueio.id} style={bloqueioCardStyle(bloqueio.tipo)}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                        {bloqueio.tipo === 'dia' ? '📆 Dia Inteiro' : '🕐 Intervalo'}
                        </h4>
                        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '14px' }}>
                      {formatarData(bloqueio.data)}
                      {bloqueio.tipo === 'horario' && (
                        <> • {bloqueio.horario_inicio} até {bloqueio.horario_fim}</>
                      )}
                    </p>
                    {bloqueio.motivo && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                        <strong>Motivo:</strong> {bloqueio.motivo}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removerBloqueio(bloqueio.id)}
                    disabled={loading}
                    style={{
                      ...deleteButtonStyle,
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                    title="Desbloquear"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BloqueiosPage;
