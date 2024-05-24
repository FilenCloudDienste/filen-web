import { memo, useMemo, useEffect, useRef, useCallback } from "react"
import { type DirLinkInfoDecryptedResponse } from "@filen/sdk/dist/types/api/v3/dir/link/info"
import { useDirectoryLinkContent, usePublicLinkURLState } from "@/hooks/usePublicLink"
import { useLocalStorage } from "@uidotdev/usehooks"
import { type DriveSortBy } from "@/components/drive/list/header"
import { orderItemsByType } from "@/components/drive/utils"
import { Input } from "@/components/ui/input"
import Breadcrumbs from "./breadcrumbs"
import { useDirectoryPublicLinkStore } from "@/stores/publicLink.store"
import Grid from "./grid"
import List from "./list"
import { Search, List as ListIcon, Grid3X3, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useTheme } from "@/providers/themeProvider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { Button } from "@/components/ui/button"
import { download as downloadAction } from "@/components/drive/list/item/contextMenu/actions"
import useErrorToast from "@/hooks/useErrorToast"
import Header from "./header"

export const Directory = memo(({ info, password }: { info: DirLinkInfoDecryptedResponse; password?: string }) => {
	const [driveSortBy] = useLocalStorage<DriveSortBy>("driveSortBy", {})
	const queryUpdatedAtRef = useRef<number>(-1)
	const [listType, setListType] = useLocalStorage<Record<string, "grid" | "list">>("listType", {})
	const { searchTerm, setItems, setSearchTerm, items, virtualURL, setVirtualURL } = useDirectoryPublicLinkStore()
	const { t } = useTranslation()
	const { dark } = useTheme()
	const errorToast = useErrorToast()

	const parent = useMemo(() => {
		if (virtualURL.length === 0) {
			return info.parent
		}

		if (!virtualURL.includes("/")) {
			return virtualURL
		}

		const ex = virtualURL.split("/")

		return ex.at(-1) ? ex.at(-1)! : virtualURL
	}, [virtualURL, info.parent])

	const urlState = usePublicLinkURLState()
	const { query, content } = useDirectoryLinkContent({
		uuid: urlState.uuid,
		key: urlState.key,
		parent,
		password,
		info
	})

	const itemsOrdered = useMemo(() => {
		const sortBy = driveSortBy[parent]

		return orderItemsByType({ items, type: sortBy ? sortBy : "nameAsc" })
	}, [items, driveSortBy, parent])

	const itemsFiltered = useMemo(() => {
		if (searchTerm.length === 0) {
			return itemsOrdered
		}

		const searchTermLowered = searchTerm.trim().toLowerCase()

		return itemsOrdered.filter(item => item.name.toLowerCase().includes(searchTermLowered))
	}, [itemsOrdered, searchTerm])

	const changeListType = useCallback(() => {
		setListType(prev => ({ ...prev, [parent]: listType[parent] === "grid" ? "list" : "grid" }))
	}, [listType, parent, setListType])

	const download = useCallback(async () => {
		try {
			await downloadAction({
				selectedItems: items,
				name: `${info.metadata.name}.zip`
			})
		} catch (e) {
			console.error(e)

			if (!(e as unknown as Error).toString().includes("abort")) {
				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			}
		}
	}, [items, info.metadata.name, errorToast])

	useEffect(() => {
		if (virtualURL.length === 0) {
			setVirtualURL(info.parent)
		}

		if (query.isSuccess && queryUpdatedAtRef.current !== query.dataUpdatedAt) {
			queryUpdatedAtRef.current = query.dataUpdatedAt

			setItems(content)
		}
	}, [query.isSuccess, query.data, query.dataUpdatedAt, content, setItems, info.parent, setVirtualURL, virtualURL])

	return (
		<div className="flex flex-col w-full h-screen">
			<div className="flex flex-row h-12 w-full items-center border-b justify-between select-none">
				<div className="flex flex-row items-center max-w-[1px] px-3">
					<Breadcrumbs info={info} />
				</div>
				<div className={cn("flex flex-row gap-2 px-4 h-full items-center", dark ? "bg-[#151518]" : "bg-[#FBFBFB]")}>
					<Button
						size="sm"
						className="items-center gap-2"
						onClick={download}
					>
						<Download size={16} />
					</Button>
					<div className="flex flex-row items-center">
						<div className="absolute h-full pl-2">
							<div className="h-full flex flex-row items-center">
								<Search
									className="text-muted-foreground"
									size={16}
								/>
							</div>
						</div>
						<Input
							className="pl-8 text-sm max-w-lg h-9"
							placeholder={t("topBar.searchInThisFolder")}
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
						/>
					</div>
					{listType[parent] === "grid" ? (
						<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
							<Tooltip>
								<TooltipTrigger asChild={true}>
									<ListIcon
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
			{!query.isSuccess ? null : (
				<>
					{listType[parent] !== "grid" && (
						<Header
							parent={parent}
							items={items}
						/>
					)}
					<div className="dragselect-start-allowed">
						{listType[parent] !== "grid" ? (
							<List
								parent={parent}
								items={itemsFiltered}
							/>
						) : (
							<Grid items={itemsFiltered} />
						)}
					</div>
				</>
			)}
		</div>
	)
})

export default Directory
