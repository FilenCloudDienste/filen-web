import { memo } from "react"
import useSDKConfig from "@/hooks/useSDKConfig"
import Button from "./button"
import { IS_DESKTOP } from "@/constants"
import { useWindowSize } from "@uidotdev/usehooks"
import Divider from "./divider"
import Notes from "./notes"
import { cn } from "@/lib/utils"
import useLocation from "@/hooks/useLocation"
import Top from "./top"
import Chats from "./chats"
import useElementDimensions from "@/hooks/useElementDimensions"
import Bottom from "./bottom"

export const InnerSideBar = memo(() => {
	const { baseFolderUUID } = useSDKConfig()
	const windowSize = useWindowSize()
	const location = useLocation()
	const chatsTopDimensions = useElementDimensions("inner-sidebar-top-chats")
	const notesTopDimensions = useElementDimensions("inner-sidebar-top-notes")

	return (
		<div className="w-full flex flex-col h-full select-none">
			<Top />
			<div
				className={cn(
					"flex flex-col overflow-y-auto overflow-x-hidden dragselect-start-allowed",
					!location.includes("notes") && !location.includes("chats") ? "py-3" : ""
				)}
				style={{
					height:
						(windowSize.height ?? window.innerHeight) -
						48 -
						(location.includes("chats")
							? chatsTopDimensions.height
							: location.includes("notes")
								? notesTopDimensions.height
								: 48) -
						(IS_DESKTOP ? 24 : 0)
				}}
			>
				{location.includes("drive") && (
					<>
						<Button uuid={baseFolderUUID} />
						<Divider />
						<Button uuid="recents" />
						<Button uuid="favorites" />
						<Button uuid="trash" />
						<Button uuid="shared-in" />
						<Button uuid="shared-out" />
						<Button uuid="links" />
					</>
				)}
				{location.includes("settings") && (
					<>
						<Button uuid="settings/general" />
						<Button uuid="settings/account" />
						<Button uuid="settings/security" />
						<Button uuid="settings/subscriptions" />
						<Button uuid="settings/invoices" />
						<Button uuid="settings/events" />
						<Button uuid="settings/invite" />
					</>
				)}
				{location.includes("notes") && <Notes />}
				{location.includes("chats") && <Chats />}
				{location.includes("contacts") && (
					<>
						<Button uuid="contacts/online" />
						<Button uuid="contacts/all" />
						<Button uuid="contacts/offline" />
						<Button uuid="contacts/in" />
						<Button uuid="contacts/out" />
						<Button uuid="contacts/blocked" />
					</>
				)}
			</div>
			<Bottom />
		</div>
	)
})

export default InnerSideBar
