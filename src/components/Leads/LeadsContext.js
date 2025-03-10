import React, { createContext, useContext, useState, useEffect } from "react";

const LeadsContext = createContext();

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
        console.log("Fetched leads from context:", data);

        // If the server doesn't add `_id`, force an ephemeral one here:
        const leadsWithId = data.map((lead, index) => ({
          ...lead,
          _id: lead._id ? lead._id : `googleSheet-${index}`,
        }));
        
        setLeads(leadsWithId);
      })
      .catch((err) => {
        console.error("Fetch error in LeadsContext:", err);
      });
  }, []);

  return (
    <LeadsContext.Provider value={{ leads, setLeads }}>
      {children}
    </LeadsContext.Provider>
  );
};

export const useLeads = () => {
  return useContext(LeadsContext);
};
