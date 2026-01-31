import React, { useState, useEffect } from "react";
import { useStudioConfig } from "../../context/StudioConfigContext";

function ConfigLayout() {
  const { config, loading, saving, error, saveConfig } = useStudioConfig();

  const [studioName, setStudioName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1a1a1a");
  const [fontFamily, setFontFamily] = useState("Roboto, Arial, sans-serif");
  const [logoPreview, setLogoPreview] = useState(null); // base64
  const [localError, setLocalError] = useState(null);
  const [success, setSuccess] = useState("");

  // Sincronizar estado local quando config carregar
  useEffect(() => {
    if (config) {
      setStudioName(config.studio_name || "");
      setPrimaryColor(config.primary_color || "#1a1a1a");
      setFontFamily(config.font_family || "Roboto, Arial, sans-serif");
      setLogoPreview(config.studio_logo || null);
    }
  }, [config]);

  async function handleSave(e) {
    e.preventDefault();
    setLocalError(null);
    setSuccess("");

    try {
      await saveConfig({
        studio_name: studioName,
        primary_color: primaryColor,
        font_family: fontFamily,
        studio_logo: logoPreview,
      });
      setSuccess("Configurações salvas com sucesso.");
    } catch (err) {
      setLocalError(err.message || "Erro ao salvar configurações.");
    }
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setLogoPreview(base64);
    };
    reader.onerror = () => {
      setLocalError("Falha ao carregar imagem do logo.");
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    setLogoPreview(null);
  }

  if (loading && !config) {
    return <div>Carregando configurações do estúdio...</div>;
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: 16,
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 0 6px rgba(0,0,0,0.1)",
        maxWidth: 700,
      }}
    >
      <h2 style={{ marginBottom: 16 }}>Configurações do estúdio (globais)</h2>

      {(error || localError) && (
        <div
          style={{
            marginBottom: 12,
            padding: 8,
            background: "#ffdddd",
            borderRadius: 4,
            color: "#a00",
          }}
        >
          {error || localError}
        </div>
      )}

      {success && (
        <div
          style={{
            marginBottom: 12,
            padding: 8,
            background: "#ddffdd",
            borderRadius: 4,
            color: "#060",
          }}
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4 }}>
            Nome do estúdio:
          </label>
          <input
            type="text"
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
            placeholder="Ex.: Dark Ink Studio"
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4 }}>
            Cor primária:
          </label>
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            style={{
              width: 60,
              height: 32,
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          />
          <span style={{ marginLeft: 8 }}>{primaryColor}</span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4 }}>
            Fonte principal:
          </label>
          <input
            type="text"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
            placeholder='Ex.: "Roboto, Arial, sans-serif"'
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4 }}>
            Logo do estúdio:
          </label>
          <input type="file" accept="image/*" onChange={handleLogoChange} />
          {logoPreview && (
            <div style={{ marginTop: 8 }}>
              <img
                src={logoPreview}
                alt="Logo do estúdio"
                style={{
                  maxWidth: 160,
                  maxHeight: 160,
                  display: "block",
                  marginBottom: 8,
                }}
              />
              <button
                type="button"
                onClick={handleRemoveLogo}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  border: "none",
                  background: "#c0392b",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Remover logo
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "8px 16px",
            borderRadius: 4,
            border: "none",
            background: saving ? "#888" : "#27ae60",
            color: "#fff",
            cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
      </form>
    </div>
  );
}

export default ConfigLayout;
