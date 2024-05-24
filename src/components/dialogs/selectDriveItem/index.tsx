import { memo, useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader
} from "@/components/ui/alert-dialog"
import { useTranslation } from "react-i18next"
import eventEmitter from "@/lib/eventEmitter"
import List from "./list"
import useSDKConfig from "@/hooks/useSDKConfig"
import Breadcrumbs from "./breadcrumbs"
import { showInputDialog } from "../input"
import worker from "@/lib/worker"
import { useDriveItemsStore } from "@/stores/drive.store"
import useRouteParent from "@/hooks/useRouteParent"
import { directoryUUIDToNameCache } from "@/cache"
import { type DriveCloudItem } from "@/components/drive"

export type SelectionType = "file" | "directory" | "all"
export type SelectDriveItemResponse = { cancelled: true } | { cancelled: false; items: DriveCloudItem[] }

export async function selectDriveItem({
	type = "directory",
	multiple = false
}: {
	type: SelectionType
	multiple: boolean
}): Promise<SelectDriveItemResponse> {
	return await new Promise<SelectDriveItemResponse>(resolve => {
		const id = Math.random().toString(16).slice(2)

		const listener = eventEmitter.on("selectDriveItemResponse", ({ items, id: i }: { items: DriveCloudItem[]; id: string }) => {
			if (id !== i) {
				return
			}

			listener.remove()

			if (items.length === 0) {
				resolve({ cancelled: true })

				return
			}

			resolve({ cancelled: false, items })
		})

		eventEmitter.emit("openSelectDriveItemDialog", {
			id,
			type,
			multiple
		})
	})
}

export const SelectDriveItemDialog = memo(() => {
	const { baseFolderUUID } = useSDKConfig()
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const requestId = useRef<string>("")
	const [responseItems, setResponseItems] = useState<DriveCloudItem[]>([])
	const didSubmit = useRef<boolean>(false)
	const [pathname, setPathname] = useState<string>(baseFolderUUID)
	const { setItems } = useDriveItemsStore()
	const routeParent = useRouteParent()
	const [selectionType, setSelectionType] = useState<SelectionType>("directory")
	const [selectMultiple, setSelectMultiple] = useState<boolean>(false)

	const parent = useMemo(() => {
		const ex = pathname.split("/")
		const part = ex[ex.length - 1]

		if (!part) {
			return ""
		}

		return part
	}, [pathname])

	const submit = useCallback(() => {
		if (didSubmit.current) {
			return
		}

		didSubmit.current = true

		eventEmitter.emit("selectDriveItemResponse", {
			items: responseItems,
			id: requestId.current
		})

		setOpen(false)
	}, [responseItems])

	const cancel = useCallback(() => {
		if (didSubmit.current) {
			return
		}

		didSubmit.current = true

		eventEmitter.emit("selectDriveItemResponse", {
			items: [],
			id: requestId.current
		})

		setOpen(false)
	}, [])

	const createFolder = useCallback(async () => {
		try {
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

			const item = await worker.createDirectory({ name: inputResponse.value, parent })

			directoryUUIDToNameCache.set(item.uuid, inputResponse.value)

			eventEmitter.emit("refetchSelectItemDialogList", {
				uuid: parent
			})

			if (routeParent === item.parent) {
				setItems(prev => [
					...prev.filter(prevItem => prevItem.uuid !== item.uuid && prevItem.name.toLowerCase() !== item.name.toLowerCase()),
					item
				])
			}
		} catch (e) {
			console.error(e)
		}
	}, [setItems, parent, routeParent])

	useEffect(() => {
		const listener = eventEmitter.on(
			"openSelectDriveItemDialog",
			({ id, type, multiple }: { id: string; type: SelectionType; multiple: boolean }) => {
				requestId.current = id
				didSubmit.current = false

				setResponseItems([])
				setSelectMultiple(multiple)
				setSelectionType(type)
				setPathname(baseFolderUUID)
				setOpen(true)
			}
		)

		return () => {
			listener.remove()
		}
	}, [baseFolderUUID])

	return (
		<AlertDialog
			open={open}
			onOpenChange={openState => {
				setOpen(openState)
				cancel()
			}}
		>
			<AlertDialogContent
				onEscapeKeyDown={cancel}
				className="outline-none focus:outline-none active:outline-none hover:outline-none select-none"
			>
				<AlertDialogHeader>
					{/*<AlertDialogTitle>{t("dialogs.selectDriveItem.title")}</AlertDialogTitle>*/}
					<AlertDialogDescription asChild={true}>
						<div className="w-full h-full flex flex-col pb-2">
							<div className="flex flex-col mb-4">
								<Breadcrumbs
									pathname={pathname}
									setPathname={setPathname}
								/>
							</div>
							<List
								pathname={pathname}
								setPathname={setPathname}
								selectionType={selectionType}
								selectMultiple={selectMultiple}
								responseItems={responseItems}
								setResponseItems={setResponseItems}
							/>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="items-center mt-1">
					{(selectionType === "directory" || selectionType === "all") && (
						<p
							className="text-muted-foreground underline cursor-pointer mr-1 text-sm"
							onClick={createFolder}
						>
							{t("dialogs.selectDriveItem.newFolder")}
						</p>
					)}
					<AlertDialogCancel onClick={cancel}>{t("dialogs.cancel")}</AlertDialogCancel>
					<AlertDialogAction
						onClick={submit}
						disabled={responseItems.length === 0}
					>
						{t("dialogs.selectDriveItem.submit")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
})

export default SelectDriveItemDialog
