import { memo } from "react"
import { ContextMenu as CM, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"

export const ContextMenu = memo(({ children }: { children: React.ReactNode }) => {
	return (
		<CM>
			<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem>cn</ContextMenuItem>
			</ContextMenuContent>
		</CM>
	)
})

export default ContextMenu
