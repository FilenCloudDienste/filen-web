import { memo, useMemo } from "react"
import TopBar from "./topBar"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useWindowSize, useLocalStorage } from "@uidotdev/usehooks"
import SideBar from "./sideBar"

const sidebarBasePx = 250
const sidebarMinPx = 50
const sidebarMaxPx = 500

export const DriveContainer = memo(({ children }: { children: React.ReactNode }) => {
	const windowSize = useWindowSize()
	const [sidebarPercentage, setSidebarPercentage] = useLocalStorage<number>("sidebarPercentage", 0)

	const sidebarSize = useMemo(() => {
		if (sidebarPercentage > 0) {
			return sidebarPercentage
		}

		const windowWidth = windowSize.width ?? window.innerWidth
		const percentage = Math.floor((sidebarBasePx / windowWidth) * 100)

		return percentage
	}, [windowSize.width, sidebarPercentage])

	const sidebarSizeRange = useMemo(() => {
		const windowWidth = windowSize.width ?? window.innerWidth
		const min = Math.floor((sidebarMinPx / windowWidth) * 100)
		const max = Math.floor((sidebarMaxPx / windowWidth) * 100)

		return {
			min,
			max
		}
	}, [windowSize.width])

	return (
		<div className="h-screen w-screen">
			<ResizablePanelGroup
				direction="horizontal"
				onLayout={e => setSidebarPercentage(e[0])}
			>
				<ResizablePanel
					defaultSize={sidebarSize}
					minSize={sidebarSizeRange.min}
					maxSize={sidebarSizeRange.max}
					order={1}
				>
					<SideBar />
				</ResizablePanel>
				<ResizableHandle
					withHandle={true}
					className="border-r"
				/>
				<ResizablePanel
					defaultSize={100 - sidebarSize}
					order={2}
				>
					<TopBar />
					<div className="h-[calc(100vh-3.5rem)]">{children}</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	)
})

export default DriveContainer
