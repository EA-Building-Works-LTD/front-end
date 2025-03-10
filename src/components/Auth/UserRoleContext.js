import React, { createContext, useContext } from "react";

// Create a Context
const UserRoleContext = createContext();

// Provide the user role to the app
export const UserRoleProvider = ({ role, children }) => {
  return (
    <UserRoleContext.Provider value={role}>
      {children}
    </UserRoleContext.Provider>
  );
};

// Custom hook to access the user's role
export const useUserRole = () => {
  return useContext(UserRoleContext);
};
