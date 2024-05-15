import { memo, useCallback, useTransition, useEffect } from "react"
import {
	ContextMenu as CM,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator
} from "@/components/ui/context-menu"
import { useDriveItemsStore } from "@/stores/drive.store"
import useLocation from "@/hooks/useLocation"
import { useTranslation } from "react-i18next"
import { showInputDialog } from "@/components/dialogs/input"
import worker from "@/lib/worker"
import useRouteParent from "@/hooks/useRouteParent"
import eventEmitter from "@/lib/eventEmitter"
import { directoryUUIDToNameCache } from "@/cache"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"

export const ContextMenu = memo(({ children }: { children: React.ReactNode }) => {
	const { setItems } = useDriveItemsStore()
	const location = useLocation()
	const { t } = useTranslation()
	const [, startTransition] = useTransition()
	const parent = useRouteParent()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()

	const createFolder = useCallback(async () => {
		const inputResponse = await showInputDialog({
			title: "newfolder",
			continueButtonText: "create",
			value: "",
			autoFocusInput: true,
			placeholder: "New folder"
		})

		if (inputResponse.cancelled) {
			return
		}

		const toast = loadingToast()

		try {
			const item = await worker.createDirectory({ name: inputResponse.value, parent })

			directoryUUIDToNameCache.set(item.uuid, inputResponse.value)

			startTransition(() => {
				setItems(prev => [
					...prev.filter(prevItem => prevItem.uuid !== item.uuid && prevItem.name.toLowerCase() !== item.name.toLowerCase()),
					item
				])
			})
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
	}, [setItems, parent, loadingToast, errorToast])

	useEffect(() => {
		const createFolderTriggerListener = eventEmitter.on("createFolderTrigger", createFolder)

		return () => {
			createFolderTriggerListener.remove()
		}
	}, [createFolder])

	if (!location.includes("drive")) {
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
				<ContextMenuItem
					className="cursor-pointer"
					onClick={createFolder}
				>
					{t("contextMenus.drive.newFolder")}
				</ContextMenuItem>
				<ContextMenuItem className="cursor-pointer">{t("contextMenus.drive.newTextFile")}</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					className="cursor-pointer"
					onClick={() => document.getElementById("folder-input")?.click()}
				>
					{t("contextMenus.drive.uploadFolders")}
				</ContextMenuItem>
				<ContextMenuItem
					className="cursor-pointer"
					onClick={() => document.getElementById("file-input")?.click()}
				>
					{t("contextMenus.drive.uploadFiles")}
				</ContextMenuItem>
			</ContextMenuContent>
		</CM>
	)
})

export default ContextMenu
