import React, { createContext, useContext, useState, useEffect } from "react";

// 1. Create the context
const LeadsContext = createContext();

// 2. Provider component
export const LeadsProvider = ({ children }) => {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${process.env.REACT_APP_API_URL}/api/google-leads`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch leads. Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Fetched leads: ", data); // <-- Log to see actual data shape
        setLeads(data || []);
      })
      .catch((err) => {
        console.error("Fetch error: ", err);
      });
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
