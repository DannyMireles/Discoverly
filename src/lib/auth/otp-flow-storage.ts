export const OTP_FLOW_STORAGE_KEY = "discoverly_otp_auth";

export type OtpAuthMode = "sign-in" | "company-sign-up" | "affiliate-sign-up";

export type OtpFlowPayload = {
  email: string;
  mode: OtpAuthMode;
  fullName: string;
  inviteToken: string;
  redirectTo: string | null;
};

export function readOtpFlowPayload(): OtpFlowPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(OTP_FLOW_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as OtpFlowPayload;
    if (!data.email || !data.mode) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeOtpFlowPayload(payload: OtpFlowPayload) {
  sessionStorage.setItem(OTP_FLOW_STORAGE_KEY, JSON.stringify(payload));
}

export function clearOtpFlowPayload() {
  sessionStorage.removeItem(OTP_FLOW_STORAGE_KEY);
}
