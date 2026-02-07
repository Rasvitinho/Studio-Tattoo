import React from "react";
import CadastroClienteForm from "../../components/CadastroClienteForm";

function CadastroClientePage({ apiBase, onClose }) {
  return (
    <div style={{ padding: 16 }}>
      <CadastroClienteForm apiBase={apiBase} onClose={onClose} />
    </div>
  );
}

export default CadastroClientePage;
