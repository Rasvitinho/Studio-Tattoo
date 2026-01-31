import React, { createContext, useContext, useState, useEffect } from "react";

const StudioConfigContext = createContext(null);

export function StudioConfigProvider({ apiBase, children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Carregar config global ao iniciar
  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        setError(null);
        const resp = await fetch(`${apiBase}/auth/studio/config`);
        if (!resp.ok) {
          throw new Error("Falha ao carregar configurações do estúdio");
        }
        const data = await resp.json();
        setConfig(data); // ex.: { studio_name, studio_logo, primary_color, font_family }
      } catch (err) {
        console.error(err);
        setError(err.message || "Erro ao carregar configurações");
      } finally {
        setLoading(false);
      }
    }

    if (apiBase) {
      fetchConfig();
    }
  }, [apiBase]);

  // Função para salvar alterações
  async function saveConfig(partialConfig) {
    try {
      setSaving(true);
      setError(null);

      const newConfig = { ...config, ...partialConfig };

      const resp = await fetch(`${apiBase}/auth/studio/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
        });
      if (!resp.ok) {
        throw new Error("Falha ao salvar configurações do estúdio");
      }

      const data = await resp.json();
      setConfig(data);
      return data;
    } catch (err) {
      console.error(err);
      setError(err.message || "Erro ao salvar configurações");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  const value = {
    config,
    setConfig,
    loading,
    saving,
    error,
    saveConfig,
  };

  return (
    <StudioConfigContext.Provider value={value}>
      {children}
    </StudioConfigContext.Provider>
  );
}

export function useStudioConfig() {
  const ctx = useContext(StudioConfigContext);
  if (!ctx) {
    throw new Error("useStudioConfig deve ser usado dentro de StudioConfigProvider");
  }
  return ctx;
}
