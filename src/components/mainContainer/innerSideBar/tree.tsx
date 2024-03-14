import { memo } from "react"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { useLocalStorage } from "@uidotdev/usehooks"
import { ChevronRightIcon, ChevronDownIcon } from "lucide-react"
import useRouteParent from "@/hooks/useRouteParent"
import { useNavigate } from "@tanstack/react-router"
import { folderIcon } from "@/assets/fileExtensionIcons"
import { type DriveCloudItem } from "@/components/drive"

export const Tree = memo(({ parent, depth, pathname }: { parent: string; depth: number; pathname: string }) => {
	const [sideBarTreeOpen, setSideBarTreeOpen] = useLocalStorage<Record<string, boolean>>("sideBarTreeOpen", {})
	const routeParent = useRouteParent()
	const navigate = useNavigate()
	const query = useQuery({
		queryKey: ["listDirectoryOnlyDirectories", parent],
		queryFn: () =>
			new Promise<DriveCloudItem[]>((resolve, reject) => {
				worker
					.listDirectory({ uuid: parent, onlyDirectories: true })
					.then(res => resolve(res.filter(item => item.type === "directory")))
					.catch(reject)
			})
	})

	if (!query.isSuccess || !sideBarTreeOpen[parent]) {
		return null
	}

	return query.data.map(item => {
		return (
			<div
				key={item.uuid}
				className="flex flex-col select-none"
			>
				<div
					className={
						"flex flex-row gap-2 items-center cursor-pointer px-2 py-1 hover:bg-secondary rounded-lg mt-1 " +
						(routeParent === item.uuid ? "bg-secondary" : "")
					}
					style={{
						paddingLeft: depth * 21
					}}
				>
					{!sideBarTreeOpen[item.uuid] ? (
						<>
							<ChevronRightIcon
								className="cursor-pointer flex-shrink-0 text-primary"
								onClick={() => setSideBarTreeOpen(prev => ({ ...prev, [item.uuid]: true }))}
								size={16}
							/>
							<img
								src={folderIcon}
								className="w-4 h-4 shrink-0"
							/>
						</>
					) : (
						<>
							<ChevronDownIcon
								className="cursor-pointer flex-shrink-0 text-primary"
								onClick={() => setSideBarTreeOpen(prev => ({ ...prev, [item.uuid]: false }))}
								size={16}
							/>
							<img
								src={folderIcon}
								className="w-4 h-4 shrink-0"
							/>
						</>
					)}
					<p
						className="text-primary text-ellipsis line-clamp-1 grow"
						onClick={() =>
							navigate({
								to: "/drive/$",
								params: {
									_splat: `${pathname}/${item.uuid}`
								}
							})
						}
					>
						{item.name}
					</p>
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
