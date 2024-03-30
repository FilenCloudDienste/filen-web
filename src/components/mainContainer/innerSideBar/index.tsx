import { memo } from "react"
import useSDKConfig from "@/hooks/useSDKConfig"
import Button from "./button"
import { IS_DESKTOP } from "@/constants"
import { useWindowSize } from "@uidotdev/usehooks"
import Divider from "./divider"
import { useNavigate, useRouterState } from "@tanstack/react-router"

export const InnerSideBar = memo(() => {
	const sdkConfig = useSDKConfig()
	const windowSize = useWindowSize()
	const navigate = useNavigate()
	const routerState = useRouterState()

	return (
		<div className="w-full border-r flex flex-col h-full select-none">
			<div
				className="h-12 w-full flex flex-row items-center px-4 border-b shadow-sm cursor-pointer"
				onClick={() => {
					if (routerState.location.pathname.includes("settings")) {
						navigate({
							to: "/settings/$type",
							params: {
								type: "general"
							}
						})

						return
					}

					navigate({
						to: "/drive/$",
						params: {
							_splat: sdkConfig.baseFolderUUID
						}
					})
				}}
			>
				{routerState.location.pathname.includes("settings") ? "Settings" : "Filen"}
			</div>
			<div
				className="flex flex-col overflow-y-auto py-3 overflow-x-hidden dragselect-start-allowed"
				style={{
					height: IS_DESKTOP
						? (windowSize.height ?? window.innerHeight) - 48 - 48 - 24
						: (windowSize.height ?? window.innerHeight) - 48 - 48
				}}
			>
				{routerState.location.pathname.includes("drive") && (
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
				{routerState.location.pathname.includes("settings") && (
					<>
						<Button uuid="settings/general" />
					</>
				)}
			</div>
			<div className="py-3 px-3 border-t flex flex-col h-12 flex-1">
				<p className="text-muted-foreground text-sm">{sdkConfig.email}</p>
			</div>
		</div>
	)
})

export default InnerSideBar
