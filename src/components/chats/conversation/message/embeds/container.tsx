import { memo, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import worker from "@/lib/worker"
import { useChatsStore } from "@/stores/chats.store"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"

export const Container = memo(
	({
		children,
		title,
		link,
		color,
		noBackground,
		messageUUID,
		senderId,
		userId
	}: {
		children: React.ReactNode
		title?: string
		link: string
		color: "red" | "blue" | "indigo" | "green" | "cyan" | "purple"
		noBackground?: boolean
		messageUUID: string
		senderId: number
		userId: number
	}) => {
		const [hovering, setHovering] = useState<boolean>(false)
		const loadingToast = useLoadingToast()
		const errorToast = useErrorToast()
		const { setMessages } = useChatsStore()

		const onMouseEnter = useCallback(() => {
			setHovering(true)
		}, [])

		const onMouseLeave = useCallback(() => {
			setHovering(false)
		}, [])

		const disableEmbed = useCallback(async () => {
			if (userId !== senderId) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.chatDisableMessageEmbed({ uuid: messageUUID })

				setMessages(prev => prev.map(m => (m.uuid === messageUUID ? { ...m, embedDisabled: true } : m)))
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()
			}
		}, [loadingToast, errorToast, messageUUID, setMessages, userId, senderId])

		return (
			<div
				className={
					"flex flex-col w-[512px] h-[288px] bg-secondary rounded-md shadow-sm border-l-[3px] border-l-" +
					color +
					"-500 p-3 pt-2 gap-1"
				}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
			>
				{senderId === userId && (
					<div
						className="absolute ml-[500px] mt-[-10px] w-[10px] h-[200px]"
						onMouseEnter={onMouseEnter}
						onMouseLeave={onMouseLeave}
					>
						{hovering && (
							<X
								className={cn("cursor-pointer", "text-muted-foreground hover:text-primary")}
								onClick={disableEmbed}
								size={18}
							/>
						)}
					</div>
				)}
				<a
					href={link}
					target="_blank"
					className="line-clamp-1 text-ellipsis break-all text-sm text-blue-500 hover:underline"
				>
					{link}
				</a>
				{title && <p className="line-clamp-1 text-ellipsis break-all">{title}</p>}
				<div
					className={cn(
						"flex flex-col w-full mt-[4px] rounded-md shadow-sm overflow-x-hidden overflow-y-auto",
						!noBackground && "bg-primary-foreground",
						title ? "h-[210px]" : "h-[240px]"
					)}
				>
					{children}
				</div>
			</div>
		)
	}
)

export default Container
