import React from "react";
import { useUserRole } from "./UserRoleContext";

export const ProtectedRoute = ({ role, children }) => {
  const { role: userRole } = useUserRole();

  // Add debugging
  console.log("ProtectedRoute - Required role:", role);
  console.log("ProtectedRoute - User role:", userRole);

  if (userRole !== role) {
    return (
      <div>
        <h2>Access Denied</h2>
        <p>
          Sorry, you do not have the right permissions to view this page. Please
          contact Ehsaan.
        </p>
        <p>
          <small>Required role: {role}, Your role: {userRole || 'unknown'}</small>
        </p>
      </div>
    );
  }

  return children;
};

export const ProtectedPage = ({ role, children }) => {
  const { role: userRole } = useUserRole();
  
  // Add debugging
  console.log("ProtectedPage - Required role:", role);
  console.log("ProtectedPage - User role:", userRole);

  if (userRole !== role) {
    return (
      <div>
        <h2>Access Denied</h2>
        <p>
          Sorry, you do not have the right permissions to view this page. Please
          contact Ehsaan.
        </p>
        <p>
          <small>Required role: {role}, Your role: {userRole || 'unknown'}</small>
        </p>
      </div>
    );
  }

  return children;
};
