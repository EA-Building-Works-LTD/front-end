import React, { createContext, useContext, useEffect } from "react";

// Create a Context
const UserRoleContext = createContext();

// Provide the user role to the app
export const UserRoleProvider = ({ role, children }) => {
  // Add debugging to help troubleshoot role issues
  useEffect(() => {
    // console.log("UserRoleProvider - Current role:", role);
  }, [role]);

  // Create a value object that includes isAdmin
  const roleValue = {
    role,
    isAdmin: role === "admin"
  };

  return (
    <UserRoleContext.Provider value={roleValue}>
      {children}
    </UserRoleContext.Provider>
  );
};

// Custom hook to access the user's role
export const useUserRole = () => {
  const roleValue = useContext(UserRoleContext);
  
  return roleValue || { role: "guest", isAdmin: false };
};
