import React from "react";

function ModalPagamento({
  isOpen,
  agendamento,
  modoPagamento,
  setModoPagamento,
  valorPago,
  setValorPago,
  descricaoPagamento,
  setDescricaoPagamento,
  onConfirmar,
  onCancelar,
  primaryColor,
}) {
  if (!isOpen || !agendamento) return null;

  const diferenca = Number(valorPago) - agendamento.valor_previsto;
  const temDiferenca = valorPago && diferenca !== 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: "#1e1e1e",
          color: "#fff",
          padding: 24,
          borderRadius: 8,
          minWidth: 400,
          maxHeight: "80vh",
          overflowY: "auto",
          border: `2px solid ${primaryColor}`,
        }}
      >
        <h2 style={{ margin: "0 0 16px 0" }}>Registrar Pagamento</h2>

        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: "#2a2a2a",
            borderRadius: 4,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Cliente:</strong> {agendamento.cliente_nome}
          </p>
          <p style={{ margin: "4px 0 0 0" }}>
            <strong>Serviço:</strong> {agendamento.servico}
          </p>
          <p style={{ margin: "4px 0 0 0" }}>
            <strong>Valor:</strong> R${" "}
            {agendamento.valor_previsto?.toFixed(2)}
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            <strong>Modo de Pagamento *</strong>
          </label>
          <select
            value={modoPagamento}
            onChange={(e) => setModoPagamento(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #555",
              background: "#2a2a2a",
              color: "#fff",
              fontSize: 14,
            }}
          >
            <option value="dinheiro">💵 Dinheiro</option>
            <option value="debito">🏧 Débito</option>
            <option value="credito">💳 Crédito</option>
            <option value="credito_parcelado">
              💳 Crédito Parcelado
            </option>
            <option value="pix">📱 PIX</option>
            <option value="transferencia">🏦 Transferência Bancária</option>
            <option value="cheque">📝 Cheque</option>
            <option value="boleto">📄 Boleto</option>
            <option value="vale">🎟️ Vale</option>
            <option value="outro">❓ Outro</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            <strong>Valor Pago *</strong>
          </label>
          <input
            type="number"
            step="0.01"
            value={valorPago}
            onChange={(e) => setValorPago(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #555",
              background: "#2a2a2a",
              color: "#fff",
              fontSize: 14,
              boxSizing: "border-box",
            }}
            placeholder="0.00"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            <strong>Observações</strong>
          </label>
          <textarea
            value={descricaoPagamento}
            onChange={(e) => setDescricaoPagamento(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #555",
              background: "#2a2a2a",
              color: "#fff",
              fontSize: 14,
              boxSizing: "border-box",
              minHeight: 60,
              fontFamily: "Arial",
            }}
            placeholder="Ex: Falta de troco, pedir depois..."
          />
        </div>

        {temDiferenca && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              background: "#3a2a2a",
              borderRadius: 4,
              border: "1px solid #ff6b6b",
            }}
          >
            <p style={{ margin: 0, color: "#ff6b6b" }}>
              ⚠️ <strong>Valor diferente do previsto!</strong>
            </p>
            <p
              style={{
                margin: "4px 0 0 0",
                color: "#ff9999",
                fontSize: 12,
              }}
            >
              Previsto: R$ {agendamento.valor_previsto?.toFixed(2)} | Recebido:
              R$ {Number(valorPago).toFixed(2)} | Diferença: R${" "}
              {diferenca.toFixed(2)}
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onConfirmar}
            style={{
              flex: 1,
              padding: 12,
              background: primaryColor,
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 14,
            }}
          >
            ✅ Confirmar Pagamento
          </button>
          <button
            onClick={onCancelar}
            style={{
              flex: 1,
              padding: 12,
              background: "#555",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 14,
            }}
          >
            ❌ Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalPagamento;
