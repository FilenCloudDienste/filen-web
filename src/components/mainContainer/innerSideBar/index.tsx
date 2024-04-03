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

export const InnerSideBar = memo(() => {
	const sdkConfig = useSDKConfig()
	const windowSize = useWindowSize()
	const location = useLocation()

	return (
		<div className="w-full border-r flex flex-col h-full select-none">
			<Top />
			<div
				className={cn(
					"flex flex-col overflow-y-auto overflow-x-hidden dragselect-start-allowed",
					!location.includes("notes") ? "py-3" : ""
				)}
				style={{
					height: IS_DESKTOP
						? (windowSize.height ?? window.innerHeight) - 48 - 48 - 24
						: (windowSize.height ?? window.innerHeight) - 48 - 48
				}}
			>
				{location.includes("drive") && (
					<>
						<Button uuid={sdkConfig.baseFolderUUID} />
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
					</>
				)}
				{location.includes("notes") && <Notes />}
			</div>
			<div className="py-3 px-3 border-t flex flex-col h-12 flex-1">
				<p className="text-muted-foreground text-sm">{sdkConfig.email}</p>
			</div>
		</div>
	)
})

export default InnerSideBar
