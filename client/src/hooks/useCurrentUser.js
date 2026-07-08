import { useAuth } from "../context/AuthContext";

export const useCurrentUser = () => {
  const { user } = useAuth();
  return user || {};
};