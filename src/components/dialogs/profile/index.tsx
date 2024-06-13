import { memo, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import Content from "./content"

export const Profile = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const [userId, setUserId] = useState<number | null>(null)

	const onOpenChange = useCallback((openState: boolean) => {
		setOpen(openState)
	}, [])

	useEffect(() => {
		const listener = eventEmitter.on("openProfileDialog", (uid: number) => {
			setUserId(uid)
			setOpen(true)
		})

		return () => {
			listener.remove()
		}
	}, [])

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className="outline-none focus:outline-none active:outline-none hover:outline-none select-none">
				{userId && <Content userId={userId} />}
			</DialogContent>
		</Dialog>
	)
})

export default Profile
