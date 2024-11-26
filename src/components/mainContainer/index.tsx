import { memo, useCallback, useMemo } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import SideBar from "./sideBar"
import InnerSideBar from "./innerSideBar"
import TopBar from "./topBar"
import { IS_DESKTOP, IS_APPLE_DEVICE, DESKTOP_TOPBAR_HEIGHT, SIDEBAR_WIDTH } from "@/constants"
import { cn, pixelsToPercentage, percentageToPixels } from "@/lib/utils"
import useLocation from "@/hooks/useLocation"
import { useLocalStorage } from "@uidotdev/usehooks"
import { useTheme } from "@/providers/themeProvider"
import useWindowSize from "@/hooks/useWindowSize"
import useIsMobile from "@/hooks/useIsMobile"
import WindowControls from "../windowControls"

export const Wrapper = memo(({ children }: { children: React.ReactNode }) => {
	const { dark } = useTheme()

	if (IS_DESKTOP && !IS_APPLE_DEVICE) {
		return (
			<div className={cn("w-screen h-[100dvh] flex flex-col border", !dark && "bg-secondary")}>
				<div
					className="flex flex-row w-full z-0 select-none"
					style={{
						// @ts-expect-error not typed
						WebkitAppRegion: "drag",
						height: DESKTOP_TOPBAR_HEIGHT
					}}
				>
					<div
						className="flex flex-row items-center justify-center px-3"
						style={{
							width: SIDEBAR_WIDTH - 2
						}}
					>
						<p
							className="text-muted-foreground"
							style={{
								fontSize: 14
							}}
						>
							Filen
						</p>
					</div>
					<div className="flex flex-row w-full justify-end">
						<WindowControls />
					</div>
				</div>
				<div
					className="flex flex-row w-full"
					style={{
						height: "calc(100dvh - " + DESKTOP_TOPBAR_HEIGHT + "px)"
					}}
				>
					{children}
				</div>
			</div>
		)
	}

	return <div className={cn("w-screen h-[100dvh] flex flex-row", !dark && "bg-secondary")}>{children}</div>
})

export const InnerSideBarWrapper = memo(
	({ defaultSize, minSize, maxSize, location }: { defaultSize?: number; minSize?: number; maxSize?: number; location: string }) => {
		const isMobile = useIsMobile()

		if (isMobile) {
			return (
				<div
					className={cn(
						"flex flex-col border-r",
						location.includes("/chats") || location.includes("/notes") ? "w-[150px]" : "w-[68px]"
					)}
					id="left-resizable-panel"
				>
					<InnerSideBar />
				</div>
			)
		}

		if (
			location.includes("/settings") ||
			location.includes("/chats") ||
			location.includes("/contacts") ||
			location.includes("/drive") ||
			location.includes("/mounts") ||
			location.includes("/syncs")
		) {
			return (
				<div
					className={cn(
						"flex flex-col border-r",
						location.includes("/drive") || location.includes("/chats") || location.includes("/notes")
							? "w-[250px]"
							: "w-[225px]"
					)}
					id="left-resizable-panel"
				>
					<InnerSideBar />
				</div>
			)
		}

		return (
			<>
				<ResizablePanel
					defaultSize={defaultSize}
					minSize={minSize}
					maxSize={maxSize}
					order={1}
					id="left-resizable-panel"
				>
					<InnerSideBar />
				</ResizablePanel>
				<ResizableHandle
					className="dragselect-start-disallowed"
					withHandle={true}
				/>
			</>
		)
	}
)

export const MainContainer = memo(({ children }: { children: React.ReactNode }) => {
	const location = useLocation()
	const { dark } = useTheme()
	const windowSize = useWindowSize()
	const [resizablePanelSizes, setResizablePanelSizes] = useLocalStorage<(number | undefined | null)[]>(
		location.includes("/notes") ? "mainContainerResizablePanelSizes:notes" : "mainContainerResizablePanelSizes",
		[undefined, undefined]
	)

	const panelContainerWidth = useMemo(() => {
		return windowSize.width - SIDEBAR_WIDTH
	}, [windowSize.width])

	const panelSizes = useMemo(() => {
		const leftDefaultSize = 300
		const leftMinSize = 250
		const leftMaxSize = panelContainerWidth / 2

		const left = {
			value: resizablePanelSizes[0]
				? pixelsToPercentage(resizablePanelSizes[0], panelContainerWidth)
				: pixelsToPercentage(leftDefaultSize, panelContainerWidth),
			minSize: pixelsToPercentage(leftMinSize, panelContainerWidth),
			maxSize: pixelsToPercentage(leftMaxSize, panelContainerWidth)
		}

		return {
			left,
			right: {
				value: resizablePanelSizes[1]
					? pixelsToPercentage(resizablePanelSizes[1], panelContainerWidth)
					: pixelsToPercentage(panelContainerWidth - leftDefaultSize, panelContainerWidth)
			}
		}
	}, [resizablePanelSizes, panelContainerWidth])

	const updatePanelSizes = useCallback(
		(e?: (number | undefined | null)[]) => {
			if (!e || !e[0] || !e[1]) {
				return
			}

			setResizablePanelSizes([percentageToPixels(e[0], panelContainerWidth), percentageToPixels(e[1], panelContainerWidth)])
		},
		[setResizablePanelSizes, panelContainerWidth]
	)

	return (
		<Wrapper>
			<SideBar key="sidebar" />
			<ResizablePanelGroup
				direction="horizontal"
				onLayout={updatePanelSizes}
				className={cn(
					dark ? "bg-muted/40" : "bg-background",
					IS_DESKTOP && !IS_APPLE_DEVICE ? "rounded-tl-md border-l border-t" : "border-l"
				)}
			>
				{!location.includes("/terminal") && (
					<InnerSideBarWrapper
						defaultSize={panelSizes.left.value}
						minSize={panelSizes.left.minSize}
						maxSize={panelSizes.left.maxSize}
						location={location}
					/>
				)}
				<ResizablePanel
					defaultSize={panelSizes.right.value}
					order={2}
					id="right-resizable-panel"
				>
					{!location.includes("/terminal") && !location.includes("/mounts") && <TopBar />}
					<div className="flex grow">{children}</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</Wrapper>
	)
})

export default MainContainer
