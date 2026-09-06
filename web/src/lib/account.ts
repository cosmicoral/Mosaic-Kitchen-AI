import { apiFetch } from "./api";
import { getStoredLocale } from "../context/LocaleContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface AccountOverview {
  email: string;
  created_at: string;
  // False for an account created through Google. The change-password form is
  // hidden rather than shown broken: there is nothing to change.
  has_password: boolean;
  providers: string[];
}

export function fetchAccount(): Promise<{ account: AccountOverview }> {
  return apiFetch("/api/account");
}

export function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  return apiFetch("/api/account/password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export function deleteAccount(confirmEmail: string): Promise<void> {
  return apiFetch("/api/account/delete", {
    method: "POST",
    body: JSON.stringify({ confirm_email: confirmEmail }),
  });
}

// Not apiFetch: the response is a file, not JSON, and the point is for it to
// land in the user's downloads rather than in a variable. Fetched rather than
// linked so the session cookie is sent and a failure can be reported in the
// page instead of dumping a JSON error into a browser tab.
export async function downloadData(): Promise<void> {
  const response = await fetch(`${API_URL}/api/account/export`, {
    credentials: "include",
    headers: {
      "Accept-Language": getStoredLocale() === "zh" ? "zh-CN" : "en-GB",
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not export your data");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  // The server already set a filename in Content-Disposition, but a
  // programmatic download ignores it, so it is repeated here.
  link.download = `mosaic-kitchen-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Without this the blob stays in memory for the life of the document.
  URL.revokeObjectURL(url);
}
