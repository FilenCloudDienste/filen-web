import { memo, useState, useEffect, useRef, useCallback, useTransition, useMemo } from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
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

export type SelectDriveDestinationResponse = { cancelled: true } | { cancelled: false; uuid: string }

export async function selectDriveDestination(): Promise<SelectDriveDestinationResponse> {
	return await new Promise<SelectDriveDestinationResponse>(resolve => {
		const id = Math.random().toString(16).slice(2)

		const listener = eventEmitter.on("selectDriveDestinationResponse", ({ uuid, id: i }: { uuid: string; id: string }) => {
			if (id !== i) {
				return
			}

			listener.remove()

			if (uuid.length === 0) {
				resolve({ cancelled: true })

				return
			}

			resolve({ cancelled: false, uuid })
		})

		eventEmitter.emit("openSelectDriveDestinationDialog", { id })
	})
}

export const SelectDriveDestinationDialog = memo(() => {
	const sdkConfig = useSDKConfig()
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const requestId = useRef<string>("")
	const responseUUID = useRef<string>("")
	const didSubmit = useRef<boolean>(false)
	const [pathname, setPathname] = useState<string>(sdkConfig.baseFolderUUID)
	const { setItems } = useDriveItemsStore()
	const [, startTransition] = useTransition()
	const routeParent = useRouteParent()

	const parent = useMemo(() => {
		const ex = pathname.split("/")

		return ex[ex.length - 1]
	}, [pathname])

	const submit = useCallback(() => {
		if (didSubmit.current) {
			return
		}

		didSubmit.current = true

		eventEmitter.emit("selectDriveDestinationResponse", {
			uuid: responseUUID.current,
			id: requestId.current
		})

		setOpen(false)
	}, [])

	const cancel = useCallback(() => {
		if (didSubmit.current) {
			return
		}

		didSubmit.current = true

		eventEmitter.emit("selectDriveDestinationResponse", {
			uuid: "",
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

			startTransition(() => {
				eventEmitter.emit("refetchSelectDestinationDialogList", {
					uuid: parent
				})

				if (routeParent === item.parent) {
					setItems(prev => [
						...prev.filter(prevItem => prevItem.uuid !== item.uuid && prevItem.name.toLowerCase() !== item.name.toLowerCase()),
						item
					])
				}
			})
		} catch (e) {
			console.error(e)
		}
	}, [setItems, parent, routeParent])

	useEffect(() => {
		const ex = pathname.split("/")

		responseUUID.current = ex[ex.length - 1]
	}, [pathname])

	useEffect(() => {
		const listener = eventEmitter.on("openSelectDriveDestinationDialog", ({ id }: { id: string }) => {
			requestId.current = id
			responseUUID.current = sdkConfig.baseFolderUUID
			didSubmit.current = false

			setPathname(sdkConfig.baseFolderUUID)
			setOpen(true)
		})

		return () => {
			listener.remove()
		}
	}, [sdkConfig])

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
				className="outline-none focus:outline-none active:outline-none hover:outline-none"
			>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("dialogs.selectDriveDestination.title")}</AlertDialogTitle>
					<AlertDialogDescription asChild={true}>
						<div className="w-full h-full flex flex-col pb-2">
							<div className="flex flex-col mb-2 mt-1">
								<Breadcrumbs
									pathname={pathname}
									setPathname={setPathname}
								/>
							</div>
							<List
								pathname={pathname}
								setPathname={setPathname}
							/>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="items-center">
					<p
						className="text-muted-foreground underline cursor-pointer mr-1 text-sm"
						onClick={createFolder}
					>
						{t("dialogs.selectDriveDestination.newFolder")}
					</p>
					<AlertDialogCancel onClick={cancel}>{t("dialogs.cancel")}</AlertDialogCancel>
					<AlertDialogAction onClick={submit}>{t("dialogs.selectDriveDestination.submit")}</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
})

export default SelectDriveDestinationDialog
