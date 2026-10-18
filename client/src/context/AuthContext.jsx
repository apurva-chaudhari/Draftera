import { createContext, useContext } from "react";

/** Holds the signed-in user for every protected page. */
export const AuthContext = createContext(null);

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside a protected route.");
  }

  return value;
}
