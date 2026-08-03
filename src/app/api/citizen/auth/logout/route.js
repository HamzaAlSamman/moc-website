import { logoutCitizenSession } from "@/lib/citizen-auth";
import { citizenAuthErrorResponse, citizenJson, requireCitizenAuthOrigin } from "@/lib/citizen-auth-route";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const originError = requireCitizenAuthOrigin(request);
  if (originError) return originError;
  try {
    return citizenJson(await logoutCitizenSession());
  } catch (error) {
    return citizenAuthErrorResponse(error);
  }
}
