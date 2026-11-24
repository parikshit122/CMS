import API from "./api";

export const LOST_FOUND_CATEGORIES = [
  { value: "electronics", label: "Electronics & Gadgets", icon: "bx-devices" },
  { value: "id_card", label: "ID Card & Documents", icon: "bx-id-card" },
  { value: "wallet_keys", label: "Wallet, Purse & Keys", icon: "bx-wallet" },
  { value: "books_notes", label: "Books & Lab Notes", icon: "bx-book" },
  { value: "accessories", label: "Watch, Glasses & Accessories", icon: "bx-glasses" },
  { value: "clothing", label: "Bag, Jacket & Clothing", icon: "bx-shopping-bag" },
  { value: "other", label: "Other Campus Item", icon: "bx-package" },
];

export const CUSTODY_OPTIONS = [
  { value: "finder", label: "Held by Finder (Meet on Campus)" },
  { value: "security_desk", label: "Deposited at Campus Security Desk" },
  { value: "admin_office", label: "Deposited at Student Affairs / Admin Office" },
];

export const getCategoryMeta = (value) =>
  LOST_FOUND_CATEGORIES.find((c) => c.value === value) || {
    value: "other",
    label: "Other Campus Item",
    icon: "bx-package",
  };

export const getCustodyLabel = (custodyType) =>
  CUSTODY_OPTIONS.find((c) => c.value === custodyType)?.label || "Held by Finder";

export const fetchLostFoundItems = async (params = {}) => {
  const { data } = await API.get("/lost-found", { params });
  return data;
};

export const fetchLostFoundItem = async (id) => {
  const { data } = await API.get(`/lost-found/${id}`);
  return data;
};

export const postFoundItem = async (formData) => {
  const { data } = await API.post("/lost-found", formData);
  return data;
};

export const submitLostFoundClaim = async (itemId, formData) => {
  const { data } = await API.post(`/lost-found/${itemId}/claims`, formData);
  return data;
};

export const fetchItemClaims = async (itemId) => {
  const { data } = await API.get(`/lost-found/${itemId}/claims`);
  return data;
};

export const reviewLostFoundClaim = async (claimId, payload) => {
  const { data } = await API.patch(`/lost-found/claims/${claimId}/review`, payload);
  return data;
};

export const confirmLostFoundHandover = async (itemId, handoverCode) => {
  const { data } = await API.post(`/lost-found/${itemId}/handover`, {
    handoverCode,
  });
  return data;
};

export const archiveLostFoundItem = async (itemId) => {
  const { data } = await API.delete(`/lost-found/${itemId}`);
  return data;
};
