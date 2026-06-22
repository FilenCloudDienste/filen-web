import axios from "axios"
import { getSDKConfig } from "@/hooks/useSDKConfig"
import { convertTimestampToMs } from "@/utils"

// 14 day statutory withdrawal window (§ 356a BGB).
export const WITHDRAWAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Whether a subscription currently carries an exercisable withdrawal right (§ 356a BGB):
 * it is activated, still inside its 14 day window, and has not already been withdrawn.
 * Shared by the per-subscription button and the global account-area entry point so the two cannot drift.
 */
export function subscriptionWithdrawalEligible(sub: { activated: number; startTimestamp: number; withdrawRequested?: number }): boolean {
	return (
		sub.activated === 1 &&
		(sub.withdrawRequested ?? 0) === 0 &&
		convertTimestampToMs(sub.startTimestamp) + WITHDRAWAL_WINDOW_MS > Date.now()
	)
}

export type WithdrawSubscriptionResponse = {
	withdrawRequested: number
}

/**
 * Request withdrawal from a subscription (§ 356a BGB withdrawal button).
 *
 * The bundled SDK is outdated and has no method for this endpoint, so we call the gateway directly.
 * Response handling mirrors the SDK semantics: the HTTP status must be 200, the JSON envelope carries
 * a boolean "status", and a falsy "status" means the server rejected the request (message is surfaced).
 * The endpoint is idempotent server side: a repeated call returns the original "withdrawRequested" timestamp.
 */
export async function withdrawSubscription({
	uuid,
	name,
	email,
	lang
}: {
	uuid: string
	name: string
	email: string
	lang: "de" | "en"
}): Promise<WithdrawSubscriptionResponse> {
	const response = await axios.post(
		"https://gateway.filen.io/v3/user/sub/withdraw",
		{
			uuid,
			name,
			email,
			lang
		},
		{
			headers: {
				Authorization: "Bearer " + getSDKConfig().apiKey
			},
			validateStatus: () => true
		}
	)

	if (response.status !== 200) {
		throw new Error("Invalid response status code.")
	}

	if (!response.data || !response.data.status) {
		throw new Error(response.data?.message ?? "Could not request withdrawal.")
	}

	return response.data.data as WithdrawSubscriptionResponse
}
