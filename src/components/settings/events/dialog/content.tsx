import { memo, useCallback } from "react"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { Loader, Copy } from "lucide-react"
import { simpleDate, convertTimestampToMs } from "@/utils"
import { useTranslation } from "react-i18next"
import useSuccessToast from "@/hooks/useSuccessToast"
import useErrorToast from "@/hooks/useErrorToast"

export type Event = {
	timestamp: number
	info: {
		ip: string
		userAgent: string
	}
}

export const Content = memo(({ uuid, icon, text }: { uuid: string; icon: JSX.Element; text: string }) => {
	const query = useQuery({
		queryKey: ["fetchEvent", uuid],
		queryFn: () => worker.fetchEvent({ uuid }) as Promise<Event>
	})
	const successToast = useSuccessToast()
	const { t } = useTranslation()
	const errorToast = useErrorToast()

	const copyIP = useCallback(async () => {
		if (!query.isSuccess) {
			return
		}

		try {
			await navigator.clipboard.writeText(query.data.info.ip)

			successToast(t("copiedToClipboard"))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [query.isSuccess, query.data, successToast, errorToast, t])

	const copyUUID = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(uuid)

			successToast(t("copiedToClipboard"))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [uuid, successToast, errorToast, t])

	if (!query.isSuccess) {
		return (
			<div className="flex flex-row items-center justify-center mt-2">
				<Loader className="animate-spin-medium" />
			</div>
		)
	}

	return (
		<div className="flex flex-col mt-2 gap-2">
			<div className="flex flex-row bg-secondary rounded-md p-2 px-2.5 gap-2">
				<div className="flex flex-row shrink-0">{icon}</div>
				<p>{text}</p>
			</div>
			<div className="flex flex-row bg-secondary rounded-md p-2 px-2.5 justify-between items-center">
				<p className="text-muted-foreground text-sm">{uuid}</p>
				<Copy
					size={16}
					className="text-muted-foreground cursor-pointer hover:text-primary"
					onClick={copyUUID}
				/>
			</div>
			<div className="flex flex-row bg-secondary rounded-md p-2 px-2.5 text-muted-foreground text-sm items-center">
				{simpleDate(convertTimestampToMs(query.data.timestamp))}
			</div>
			<div className="flex flex-row bg-secondary rounded-md p-2 px-2.5 justify-between items-center">
				<p className="text-muted-foreground text-sm">{query.data.info.ip}</p>
				<Copy
					size={16}
					className="text-muted-foreground cursor-pointer hover:text-primary"
					onClick={copyIP}
				/>
			</div>
		</div>
	)
})

export default Content
