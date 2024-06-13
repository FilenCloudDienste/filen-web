import { memo, useCallback } from "react"
import Avatar from "../../avatar"
import { Check, X } from "lucide-react"
import { type ContactRequest } from "@filen/sdk/dist/types/api/v3/contacts/requests/in"
import worker from "@/lib/worker"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import eventEmitter from "@/lib/eventEmitter"
import { useContactsStore } from "@/stores/contacts.store"

export const Request = memo(({ request, refetch, type }: { request: ContactRequest; refetch: () => Promise<void>; type: "in" | "out" }) => {
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const { setRequestsInCount } = useContactsStore()

	const accept = useCallback(async () => {
		const toast = loadingToast()

		try {
			await worker.contactsRequestAccept({ uuid: request.uuid })
			await refetch()

			setRequestsInCount(prev => prev - 1)

			eventEmitter.emit("updateContactsRequestsInCount")
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [request.uuid, errorToast, loadingToast, refetch, setRequestsInCount])

	const deny = useCallback(async () => {
		const toast = loadingToast()

		try {
			await worker.contactsRequestDeny({ uuid: request.uuid })
			await refetch()

			setRequestsInCount(prev => prev - 1)

			eventEmitter.emit("updateContactsRequestsInCount")
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [request.uuid, errorToast, loadingToast, refetch, setRequestsInCount])

	const remove = useCallback(async () => {
		const toast = loadingToast()

		try {
			await worker.contactsRequestRemove({ uuid: request.uuid })
			await refetch()
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [request.uuid, errorToast, loadingToast, refetch])

	return (
		<div className="flex flex-row gap-3 items-center hover:bg-secondary rounded-md p-3">
			<Avatar
				size={44}
				src={request.avatar}
			/>
			<div className="flex flex-row gap-4 items-center justify-between grow">
				<div className="flex flex-col">
					<p className="line-clamp-1 text-ellipsis break-all">{request.nickName.length > 0 ? request.nickName : request.email}</p>
					<p className="line-clamp-1 text-ellipsis break-all text-sm text-muted-foreground">{request.email}</p>
				</div>
				<div className="flex flex-row gap-3">
					{type === "in" && (
						<div
							className="bg-green-500 w-8 h-8 rounded-full flex flex-row justify-center items-center text-white cursor-pointer"
							onClick={accept}
						>
							<Check size={18} />
						</div>
					)}
					<div
						className="bg-red-500 w-8 h-8 rounded-full flex flex-row justify-center items-center text-white cursor-pointer"
						onClick={type === "in" ? deny : remove}
					>
						<X size={18} />
					</div>
				</div>
			</div>
		</div>
	)
})

export default Request
