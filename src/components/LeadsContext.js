import React, { createContext, useContext, useState, useEffect } from "react";

// 1. Create the context
const LeadsContext = createContext();

// 2. Provider component
export const LeadsProvider = ({ children }) => {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/leads", {
      headers: {
        "Authorization": `Bearer ${token}`
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch leads. Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setLeads(data || []))
  }, []);

  return (
    <LeadsContext.Provider value={{ leads, setLeads }}>
      {children}
    </LeadsContext.Provider>
  );
};

// 3. Custom hook to consume the context
export const useLeads = () => {
  return useContext(LeadsContext);
};
