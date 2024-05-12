import { memo } from "react"
import useSDKConfig from "@/hooks/useSDKConfig"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import useLocation from "@/hooks/useLocation"
import Notes from "./notes"
import Chats from "./chats"

export const Top = memo(() => {
	const { baseFolderUUID } = useSDKConfig()
	const location = useLocation()
	const { t } = useTranslation()

	return (
		<>
			{location.includes("chats") ? (
				<Chats />
			) : location.includes("notes") ? (
				<Notes />
			) : (
				<Link
					className="h-12 w-full flex flex-row items-center px-4 border-b cursor-pointer"
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
											: "/drive/$"
					}
					params={
						location.includes("settings")
							? { type: "general" }
							: location.includes("contacts")
								? { type: "all" }
								: { _splat: baseFolderUUID }
					}
					draggable={false}
				>
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
										: "Filen"}
				</Link>
			)}
		</>
	)
})

export default Top
