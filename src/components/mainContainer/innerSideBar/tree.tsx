import { memo, useMemo, useEffect } from "react"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { useLocalStorage } from "@uidotdev/usehooks"
import { ChevronRight, ChevronDown } from "lucide-react"
import useRouteParent from "@/hooks/useRouteParent"
import { Link } from "@tanstack/react-router"
import { ColoredFolderSVGIcon } from "@/assets/fileExtensionIcons"
import { orderItemsByType } from "@/components/drive/utils"
import eventEmitter from "@/lib/eventEmitter"

export const Tree = memo(({ parent, depth, pathname }: { parent: string; depth: number; pathname: string }) => {
	const [sideBarTreeOpen, setSideBarTreeOpen] = useLocalStorage<Record<string, boolean>>("sideBarTreeOpen", {})
	const routeParent = useRouteParent()

	const query = useQuery({
		queryKey: ["listDirectoryOnlyDirectories", parent],
		queryFn: () =>
			worker.listDirectory({
				uuid: parent,
				onlyDirectories: true
			})
	})

	const itemsSorted = useMemo(() => {
		if (!query.isSuccess) {
			return []
		}

		return orderItemsByType({ items: query.data, type: "nameAsc" })
	}, [query.isSuccess, query.data])

	useEffect(() => {
		const refetchDriveSideBarTreeListener = eventEmitter.on("refetchDriveSideBarTree", p => {
			if (parent === p) {
				query.refetch().catch(console.error)
			}
		})

		return () => {
			refetchDriveSideBarTreeListener.remove()
		}
	}, [query, parent])

	if (!query.isSuccess || !sideBarTreeOpen[parent] || itemsSorted.length === 0) {
		return null
	}

	return itemsSorted.map(item => {
		return (
			<div
				key={item.uuid}
				className="flex flex-col select-none"
			>
				<div
					className={
						"flex flex-row gap-2 items-center cursor-pointer px-2 py-1 hover:bg-secondary rounded-md mt-1 " +
						(routeParent === item.uuid ? "bg-secondary" : "")
					}
					style={{
						paddingLeft: depth * 21
					}}
				>
					{!sideBarTreeOpen[item.uuid] ? (
						<>
							<ChevronRight
								className="cursor-pointer flex-shrink-0 text-primary"
								onClick={() => setSideBarTreeOpen(prev => ({ ...prev, [item.uuid]: true }))}
								size={16}
							/>
							<ColoredFolderSVGIcon
								width={16}
								height={16}
								color={item.type === "directory" ? item.color : undefined}
							/>
						</>
					) : (
						<>
							<ChevronDown
								className="cursor-pointer flex-shrink-0 text-primary"
								onClick={() => setSideBarTreeOpen(prev => ({ ...prev, [item.uuid]: false }))}
								size={16}
							/>
							<ColoredFolderSVGIcon
								width={16}
								height={16}
								color={item.type === "directory" ? item.color : undefined}
							/>
						</>
					)}
					<Link
						className="text-primary text-ellipsis line-clamp-1 grow items-center"
						to="/drive/$"
						params={{
							_splat: `${pathname}/${item.uuid}`
						}}
						draggable={false}
					>
						{item.name}
					</Link>
				</div>
				{sideBarTreeOpen[item.uuid] && (
					<Tree
						parent={item.uuid}
						depth={depth + 1}
						pathname={`${pathname}/${item.uuid}`}
					/>
				)}
			</div>
		)
	})
})

export default Tree
