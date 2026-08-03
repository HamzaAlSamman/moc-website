import { logoutAllCitizenSessions } from "@/lib/citizen-auth";
import { citizenAuthErrorResponse, citizenJson, requireCitizenAuthOrigin } from "@/lib/citizen-auth-route";
import { getCitizenSession } from "@/lib/citizen-session";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const originError = requireCitizenAuthOrigin(request);
  if (originError) return originError;
  try {
    const session = await getCitizenSession();
    return citizenJson(await logoutAllCitizenSessions(session?.citizenId));
  } catch (error) {
    return citizenAuthErrorResponse(error);
  }
}
