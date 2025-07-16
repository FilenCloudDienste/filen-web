import { memo, useCallback, useRef, useEffect } from "react"
import Input from "@/components/input"
import { List, Grid3X3, Folder, Text, Upload } from "lucide-react"
import { useTranslation } from "react-i18next"
import Breadcrumbs from "./breadcrumbs"
import { useDriveItemsStore } from "@/stores/drive.store"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useLocalStorage } from "@uidotdev/usehooks"
import useRouteParent from "@/hooks/useRouteParent"
import useLocation from "@/hooks/useLocation"
import eventEmitter from "@/lib/eventEmitter"
import Notes from "./notes"
import { cn } from "@/lib/utils"
import { useTheme } from "@/providers/themeProvider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import worker from "@/lib/worker"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import useCanUpload from "@/hooks/useCanUpload"
import useDriveURLState from "@/hooks/useDriveURLState"
import useIsMobile from "@/hooks/useIsMobile"

export const TopBar = memo(() => {
	const { t } = useTranslation()
	const { searchTerm, setSearchTerm, setItems } = useDriveItemsStore(
		useCallback(
			state => ({
				searchTerm: state.searchTerm,
				setSearchTerm: state.setSearchTerm,
				setItems: state.setItems
			}),
			[]
		)
	)
	const parent = useRouteParent()
	const [listType, setListType] = useLocalStorage<Record<string, "grid" | "list">>("listType", {})
	const location = useLocation()
	const { dark } = useTheme()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const canUpload = useCanUpload()
	const searchInputRef = useRef<HTMLInputElement>(null)
	const driveURLState = useDriveURLState()
	const isMobile = useIsMobile()
	const emptyTrashBtnRef = useRef<HTMLButtonElement>(null)

	const changeListType = useCallback(() => {
		setListType(prev => ({ ...prev, [parent]: listType[parent] === "grid" ? "list" : "grid" }))
	}, [listType, parent, setListType])

	const onSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearchTerm(e.target.value)
		},
		[setSearchTerm]
	)

	const onSearchClear = useCallback(() => {
		setSearchTerm("")
	}, [setSearchTerm])

	const emptyTrash = useCallback(async () => {
		if (!location.includes("trash")) {
			return
		}

		emptyTrashBtnRef.current?.blur()

		if (
			!(await showConfirmDialog({
				title: t("trash.dialogs.empty.title"),
				continueButtonText: t("trash.dialogs.empty.continue"),
				description: t("trash.dialogs.empty.description"),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		const toast = loadingToast()

		try {
			await worker.emptyTrash()

			setItems([])
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast, setItems, location, t])

	const keyDownListener = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "f" && (e.ctrlKey || e.metaKey) && searchInputRef.current && driveURLState.drive) {
				e.preventDefault()
				e.stopPropagation()

				searchInputRef.current.focus()

				return
			}
		},
		[driveURLState.drive]
	)

	useEffect(() => {
		window.addEventListener("keydown", keyDownListener)

		return () => {
			window.removeEventListener("keydown", keyDownListener)
		}
	}, [keyDownListener])

	if (
		location.includes("/settings") ||
		location === "/notes" ||
		location.includes("/chats") ||
		location.includes("/contacts") ||
		location.includes("/syncs")
	) {
		return null
	}

	return location.includes("notes") ? (
		<Notes />
	) : (
		<div
			className="w-full h-12 flex flex-row justify-between border-b select-none"
			style={{
				// @ts-expect-error not typed
				WebkitAppRegion: "drag"
			}}
		>
			{!isMobile && <Breadcrumbs />}
			<div
				className="flex flex-row justify-end items-center gap-3 z-10 px-3"
				style={{
					// @ts-expect-error not typed
					WebkitAppRegion: "no-drag"
				}}
			>
				<div
					className={cn(
						"flex flex-row h-full items-center",
						dark ? "bg-[#151518]" : "bg-[#FFFFFF]",
						isMobile ? "w-auto" : "min-w-[250px]"
					)}
				>
					<Input
						ref={searchInputRef}
						className="text-sm max-w-lg h-9"
						placeholder={t("topBar.searchInThisFolder")}
						value={searchTerm}
						onChange={onSearchChange}
						withClearIcon={true}
						withSearchIcon={true}
						onClear={onSearchClear}
						autoCapitalize="none"
						autoComplete="none"
						autoCorrect="none"
					/>
				</div>
				{location.includes("trash") ? (
					<Button
						className="h-8 shrink-0"
						variant="destructive"
						ref={emptyTrashBtnRef}
						onClick={emptyTrash}
					>
						{t("emptyTrash")}
					</Button>
				) : (
					<DropdownMenu>
						<DropdownMenuTrigger asChild={true}>
							<Button
								className="h-8 shrink-0"
								disabled={!canUpload}
							>
								{t("new")}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem
								className="cursor-pointer gap-3"
								onClick={() => eventEmitter.emit("createDirectoryTrigger")}
							>
								<Folder size={16} />
								{t("contextMenus.drive.newFolder")}
							</DropdownMenuItem>
							<DropdownMenuItem
								className="cursor-pointer gap-3"
								onClick={() => eventEmitter.emit("createTextFile")}
							>
								<Text size={16} />
								{t("contextMenus.drive.newTextFile")}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="cursor-pointer gap-3"
								onClick={() => document.getElementById("folder-input")?.click()}
							>
								<Upload size={16} />
								{t("contextMenus.drive.uploadFolders")}
							</DropdownMenuItem>
							<DropdownMenuItem
								className="cursor-pointer gap-3"
								onClick={() => document.getElementById("file-input")?.click()}
							>
								<Upload size={16} />
								{t("contextMenus.drive.uploadFiles")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
				{listType[parent] === "grid" ? (
					<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
						<Tooltip>
							<TooltipTrigger asChild={true}>
								<List
									className="text-muted-foreground hover:text-primary cursor-pointer shrink-0"
									onClick={changeListType}
								/>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<p>{t("topBar.listView")}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				) : (
					<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
						<Tooltip>
							<TooltipTrigger asChild={true}>
								<Grid3X3
									className="text-muted-foreground hover:text-primary cursor-pointer shrink-0"
									onClick={changeListType}
								/>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<p>{t("topBar.gridView")}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}
			</div>
		</div>
	)
})

export default TopBar
