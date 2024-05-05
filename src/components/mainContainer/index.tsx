import { memo, useMemo } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useLocalStorage } from "@uidotdev/usehooks"
import SideBar from "./sideBar"
import InnerSideBar from "./innerSideBar"
import TopBar from "./topBar"
import { IS_DESKTOP } from "@/constants"
import useIsMobile from "@/hooks/useIsMobile"
import { cn } from "@/lib/utils"
import useLocation from "@/hooks/useLocation"
import useWindowSize from "@/hooks/useWindowSize"

export const sidebarBasePx = 275
export const sidebarMinPx = 275
export const sidebarMaxPx = 500

export const Wrapper = memo(({ children }: { children: React.ReactNode }) => {
	if (IS_DESKTOP) {
		return (
			<div className="w-screen h-screen flex flex-col">
				<div
					className="flex flex-row w-full h-[24px] z-0 select-none"
					style={{
						// @ts-expect-error not typed
						WebkitAppRegion: "drag"
					}}
				>
					<div className="w-[64px] flex flex-row items-center px-3">
						<p className="text-sm text-muted-foreground">Filen</p>
					</div>
					<div className="flex flex-row w-full justify-end">
						<div
							className="w-auto px-2 z-10 cursor-pointer text-muted-foreground font-thin text-lg h-full flex flex-row items-center justify-center hover:bg-red-600 hover:text-white"
							style={{
								// @ts-expect-error not typed
								WebkitAppRegion: "no-drag"
							}}
						>
							x
						</div>
					</div>
				</div>
				<div className="flex flex-row w-full h-[calc(100%-24px)]">{children}</div>
			</div>
		)
	}

	return <div className="w-screen h-screen flex flex-row">{children}</div>
})

export const MainContainer = memo(({ children }: { children: React.ReactNode }) => {
	const windowSize = useWindowSize()
	const [sidebarPercentage, setSidebarPercentage] = useLocalStorage<number>("sidebarPercentage", 0)
	const isMobile = useIsMobile()
	const location = useLocation()

	const sidebarSize = useMemo(() => {
		if (sidebarPercentage > 0) {
			return sidebarPercentage
		}

		const windowWidth = windowSize.width - 64
		const percentage = Math.floor((sidebarBasePx / windowWidth) * 100)

		return percentage
	}, [windowSize.width, sidebarPercentage])

	const sidebarSizeRange = useMemo(() => {
		const windowWidth = windowSize.width - 64
		const min = Math.floor((sidebarMinPx / windowWidth) * 100)
		const max = Math.floor((sidebarMaxPx / windowWidth) * 100)

		return {
			min,
			max
		}
	}, [windowSize.width])

	return (
		<Wrapper>
			<div className="w-[64px] h-full">
				<SideBar />
			</div>
			<ResizablePanelGroup
				direction="horizontal"
				onLayout={e => setSidebarPercentage(e[0])}
				className={cn("bg-muted/40", IS_DESKTOP && "rounded-tl-lg")}
			>
				{!isMobile && !location.includes("terminal") && (
					<>
						<ResizablePanel
							defaultSize={sidebarSize}
							minSize={sidebarSizeRange.min}
							maxSize={sidebarSizeRange.max}
							order={1}
							id="left-resizable-panel"
						>
							<InnerSideBar />
						</ResizablePanel>
						<ResizableHandle className="bg-transparent w-0 dragselect-start-disallowed" />
					</>
				)}
				<ResizablePanel
					defaultSize={100 - sidebarSize}
					order={2}
					id="right-resizable-panel"
				>
					{!location.includes("terminal") && <TopBar />}
					<div className="flex grow">{children}</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</Wrapper>
	)
})

export default MainContainer
