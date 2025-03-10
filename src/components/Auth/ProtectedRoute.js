import React from "react";
import { useUserRole } from "./UserRoleContext";

export const ProtectedRoute = ({ role, children }) => {
  const userRole = useUserRole();

  if (userRole !== role) {
    return (
      <div>
        <h2>Access Denied</h2>
        <p>
          Sorry, you do not have the right permissions to view this page. Please
          contact Ehsaan.
        </p>
      </div>
    );
  }

  return children;
};

export const ProtectedPage = ({ role, children }) => {
  const userRole = useUserRole();

  if (userRole !== role) {
    return (
      <div>
        <h2>Access Denied</h2>
        <p>
          Sorry, you do not have the right permissions to view this page. Please
          contact Ehsaan.
        </p>
      </div>
    );
  }

  return children;
};
