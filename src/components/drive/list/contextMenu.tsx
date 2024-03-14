import { memo } from "react"
import {
	ContextMenu as CM,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator
} from "@/components/ui/context-menu"
import { useDriveItemsStore } from "@/stores/drive.store"
import { useRouterState } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

export const ContextMenu = memo(({ children }: { children: React.ReactNode }) => {
	const { setItems } = useDriveItemsStore()
	const routerState = useRouterState()
	const { t } = useTranslation()

	if (!routerState.location.pathname.includes("drive")) {
		return children
	}

	return (
		<CM
			onOpenChange={open => {
				if (open) {
					setItems(prev => prev.map(prevItem => ({ ...prevItem, selected: false })))
				}
			}}
		>
			<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
			<ContextMenuContent className="min-w-52">
				<ContextMenuItem className="cursor-pointer">{t("contextMenus.drive.newFolder")}</ContextMenuItem>
				<ContextMenuItem className="cursor-pointer">{t("contextMenus.drive.newTextFile")}</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem className="cursor-pointer">{t("contextMenus.drive.uploadFolders")}</ContextMenuItem>
				<ContextMenuItem className="cursor-pointer">{t("contextMenus.drive.uploadFiles")}</ContextMenuItem>
			</ContextMenuContent>
		</CM>
	)
})

export default ContextMenu
