import React, { createContext, useContext, useEffect } from "react";

// Create a Context
const UserRoleContext = createContext();

// Provide the user role to the app
export const UserRoleProvider = ({ role, children }) => {
  // Add debugging to help troubleshoot role issues
  useEffect(() => {
    console.log("UserRoleProvider - Current role:", role);
  }, [role]);

  return (
    <UserRoleContext.Provider value={role}>
      {children}
    </UserRoleContext.Provider>
  );
};

// Custom hook to access the user's role
export const useUserRole = () => {
  const role = useContext(UserRoleContext);
  
  // Add debugging to help troubleshoot role issues
  console.log("useUserRole - Current role:", role);
  
  return role;
};
