import { memo } from "react"
import useSDKConfig from "@/hooks/useSDKConfig"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import useLocation from "@/hooks/useLocation"
import Notes from "./notes"
import Chats from "./chats"
import { cn } from "@/lib/utils"
import useIsMobile from "@/hooks/useIsMobile"

export const Top = memo(() => {
	const { baseFolderUUID } = useSDKConfig()
	const location = useLocation()
	const { t } = useTranslation()
	const isMobile = useIsMobile()

	return (
		<>
			{location.includes("chats") ? (
				<Chats />
			) : location.includes("notes") ? (
				<Notes />
			) : (
				<Link
					className={cn(
						"w-full flex flex-row items-center px-4 cursor-pointer",
						location.includes("/drive") ? "border-b h-12" : "h-6 mt-3"
					)}
					to={
						location.includes("settings")
							? "/settings/$type"
							: location.includes("notes")
								? "/notes"
								: location.includes("chats")
									? "/chats"
									: location.includes("contacts")
										? "/contacts/$type"
										: location.includes("syncs")
											? "/syncs"
											: location.includes("mounts")
												? "/mounts/$type"
												: "/drive/$"
					}
					params={
						location.includes("settings")
							? { type: "general" }
							: location.includes("mounts")
								? { type: "virtual-drive" }
								: location.includes("contacts")
									? { type: "all" }
									: { _splat: baseFolderUUID }
					}
					draggable={false}
				>
					<p className={cn(isMobile && "line-clamp-1 text-ellipsis break-all")}>
						{location.includes("settings")
							? t("innerSideBar.top.settings")
							: location.includes("notes")
								? t("innerSideBar.top.notes")
								: location.includes("chats")
									? t("innerSideBar.top.chats")
									: location.includes("contacts")
										? t("innerSideBar.top.contacts")
										: location.includes("syncs")
											? t("innerSideBar.top.syncs")
											: location.includes("mounts")
												? t("innerSideBar.top.mounts")
												: "Filen"}
					</p>
				</Link>
			)}
		</>
	)
})

export default Top
