import { memo, useCallback, useState } from "react"
import Avatar from "../../avatar"
import { Check } from "lucide-react"
import { type BlockedContact } from "@filen/sdk/dist/types/api/v3/contacts/blocked"
import worker from "@/lib/worker"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"

export const Blocked = memo(({ blocked, refetch }: { blocked: BlockedContact; refetch: () => Promise<void> }) => {
	const [hovering, setHovering] = useState<boolean>(false)
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()

	const onMouseLeave = useCallback(() => {
		setHovering(false)
	}, [])

	const onMouseEnter = useCallback(() => {
		setHovering(true)
	}, [])

	const unblock = useCallback(async () => {
		if (
			!(await showConfirmDialog({
				title: "d",
				continueButtonText: "ddd",
				description: "ookeoetrasher",
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		const toast = loadingToast()

		try {
			await worker.unblockUser({ uuid: blocked.uuid })
			await refetch()
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [blocked.uuid, errorToast, loadingToast, refetch])

	return (
		<div
			className="flex flex-row gap-3 items-center hover:bg-secondary shadow-sm rounded-md p-3"
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			<Avatar
				size={44}
				src={blocked.avatar}
			/>
			<div className="flex flex-row gap-4 items-center justify-between grow">
				<div className="flex flex-col">
					<p className="line-clamp-1 text-ellipsis break-all">{blocked.nickName.length > 0 ? blocked.nickName : blocked.email}</p>
					<p className="line-clamp-1 text-ellipsis break-all text-sm text-muted-foreground">{blocked.email}</p>
				</div>
				{hovering && (
					<div
						className="bg-green-500 w-8 h-8 rounded-full flex flex-row justify-center items-center text-white cursor-pointer"
						onClick={unblock}
					>
						<Check />
					</div>
				)}
			</div>
		</div>
	)
})

export default Blocked
