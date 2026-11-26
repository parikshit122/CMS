import { useEffect, useState } from "react";
import API from "../services/api";

const DEFAULT_BRANDING = {
  blindEvaluationMode: true,
  platformName: "ComplaintSync",
  institutionName: "Smart Campus Institution",
  headerSubtitle: "Smart Campus Governance & Wayfinding",
  institutionCode: "CAMPUS",
  allowedDomain: "campus.edu",
  demoLabels: {
    student: "Evaluator Student (Demo)",
    staff: "Campus Facilities Lead (Demo)",
    admin: "Campus Governance Admin (Demo)",
  },
};

let cachedBranding = null;
const listeners = new Set();

export function broadcastBrandingUpdate(next) {
  cachedBranding = next || DEFAULT_BRANDING;
  for (const fn of listeners) {
    try {
      fn(cachedBranding);
    } catch {
      // ignore
    }
  }
}

export default function useInstitutionBranding() {
  const [branding, setBranding] = useState(cachedBranding || DEFAULT_BRANDING);

  useEffect(() => {
    let active = true;
    listeners.add(setBranding);

    if (!cachedBranding) {
      API.get("/public/branding")
        .then((res) => {
          if (active && res.data?.success && res.data?.data) {
            broadcastBrandingUpdate(res.data.data);
          }
        })
        .catch(() => {
          // keep safe Avishkar-blind defaults
        });
    }

    return () => {
      active = false;
      listeners.delete(setBranding);
    };
  }, []);

  return branding;
}
