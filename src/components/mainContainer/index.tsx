import { memo, useMemo } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useWindowSize, useLocalStorage } from "@uidotdev/usehooks"
import SideBar from "./sideBar"
import InnerSideBar from "./innerSideBar"
import TopBar from "./topBar"
import { IS_DESKTOP } from "@/constants"
import useIsMobile from "@/hooks/useIsMobile"

export const sidebarBasePx = 275
export const sidebarMinPx = 275
export const sidebarMaxPx = 500

export const Wrapper = memo(({ children }: { children: React.ReactNode }) => {
	if (IS_DESKTOP) {
		return (
			<div className="w-screen h-screen flex flex-col">
				<div
					className="flex flex-row w-full h-6 bg-primary-foreground z-0 select-none border-b"
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
				<div className="flex flex-row w-full h-[calc(100%-1.5rem)]">{children}</div>
			</div>
		)
	}

	return <div className="w-screen h-screen flex flex-row">{children}</div>
})

export const MainContainer = memo(({ children }: { children: React.ReactNode }) => {
	const windowSize = useWindowSize()
	const [sidebarPercentage, setSidebarPercentage] = useLocalStorage<number>("sidebarPercentage", 0)
	const isMobile = useIsMobile()

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
		<Wrapper>
			<div className="w-[65px] h-full">
				<SideBar />
			</div>
			<ResizablePanelGroup
				direction="horizontal"
				onLayout={e => setSidebarPercentage(e[0])}
			>
				{!isMobile && (
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
					<TopBar />
					<div className="flex grow">{children}</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</Wrapper>
	)
})

export default MainContainer
