import { memo, useCallback, useMemo } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import SideBar from "./sideBar"
import InnerSideBar from "./innerSideBar"
import TopBar from "./topBar"
import { IS_DESKTOP, IS_APPLE_DEVICE } from "@/constants"
import { cn, pixelsToPercentage, percentageToPixels } from "@/lib/utils"
import useLocation from "@/hooks/useLocation"
import { useLocalStorage } from "@uidotdev/usehooks"
import { X, Maximize, Minus } from "lucide-react"
import { showConfirmDialog } from "../dialogs/confirm"
import { useTranslation } from "react-i18next"
import { useTheme } from "@/providers/themeProvider"
import useWindowSize from "@/hooks/useWindowSize"

export const Wrapper = memo(({ children }: { children: React.ReactNode }) => {
	const { t } = useTranslation()
	const { dark } = useTheme()

	const minimizeWindow = useCallback(() => {
		window.desktopAPI.minimizeWindow().catch(console.error)
	}, [])

	const maximizeWindow = useCallback(() => {
		window.desktopAPI.maximizeWindow().catch(console.error)
	}, [])

	const closeWindow = useCallback(
		async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			if (!e.shiftKey) {
				if (
					!(await showConfirmDialog({
						title: t("desktop.dialogs.close.title"),
						continueButtonText: t("desktop.dialogs.close.continue"),
						description: t("desktop.dialogs.close.description"),
						continueButtonVariant: "destructive"
					}))
				) {
					return
				}
			}

			window.desktopAPI.closeWindow().catch(console.error)
		},
		[t]
	)

	if (IS_DESKTOP) {
		return (
			<div className={cn("w-screen h-screen flex flex-col", !dark && "bg-secondary")}>
				<div
					className="flex flex-row w-full h-[24px] z-0 select-none"
					style={{
						// @ts-expect-error not typed
						WebkitAppRegion: "drag"
					}}
				>
					{!IS_APPLE_DEVICE && (
						<>
							<div className="w-[64px] flex flex-row items-center px-3">
								<p className="text-sm text-muted-foreground">Filen</p>
							</div>
							<div className="flex flex-row w-full justify-end">
								<div
									className={cn(
										"w-auto px-2 z-10 cursor-pointer text-muted-foreground h-full flex flex-row items-center justify-center hover:text-primary",
										dark ? "hover:bg-secondary" : "hover:bg-[lightgray]"
									)}
									style={{
										// @ts-expect-error not typed
										WebkitAppRegion: "no-drag"
									}}
									onClick={minimizeWindow}
								>
									<Minus size={15} />
								</div>
								<div
									className={cn(
										"w-auto px-2 z-10 cursor-pointer text-muted-foreground h-full flex flex-row items-center justify-center hover:text-primary",
										dark ? "hover:bg-secondary" : "hover:bg-[lightgray]"
									)}
									style={{
										// @ts-expect-error not typed
										WebkitAppRegion: "no-drag"
									}}
									onClick={maximizeWindow}
								>
									<Maximize size={13} />
								</div>
								<div
									className="w-auto px-2 z-10 cursor-pointer text-muted-foreground h-full flex flex-row items-center justify-center hover:bg-red-600 hover:text-white"
									style={{
										// @ts-expect-error not typed
										WebkitAppRegion: "no-drag"
									}}
									onClick={closeWindow}
								>
									<X size={15} />
								</div>
							</div>
						</>
					)}
				</div>
				<div className="flex flex-row w-full h-[calc(100vh-24px)]">{children}</div>
			</div>
		)
	}

	return <div className={cn("w-screen h-screen flex flex-row", !dark && "bg-secondary")}>{children}</div>
})

export const InnerSideBarWrapper = memo(
	({ defaultSize, minSize, maxSize, location }: { defaultSize?: number; minSize?: number; maxSize?: number; location: string }) => {
		if (location.includes("settings") || location.includes("chats") || location.includes("contacts")) {
			return (
				<div
					className={cn("flex flex-col border-r", location.includes("chats") ? " w-[275px]" : "w-[225px]")}
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
				<ResizableHandle className="dragselect-start-disallowed" />
			</>
		)
	}
)

export const MainContainer = memo(({ children }: { children: React.ReactNode }) => {
	const location = useLocation()
	const { dark } = useTheme()
	const windowSize = useWindowSize()
	const [resizablePanelSizes, setResizablePanelSizes] = useLocalStorage<(number | undefined | null)[]>(
		location.includes("notes") ? "mainContainerResizablePanelSizes:notes" : "mainContainerResizablePanelSizes",
		[undefined, undefined]
	)

	const panelContainerWidth = useMemo(() => {
		return windowSize.width - 64
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
			<div className="w-[64px] h-full">
				<SideBar />
			</div>
			<ResizablePanelGroup
				direction="horizontal"
				onLayout={updatePanelSizes}
				className={cn(dark ? "bg-muted/40" : "bg-background", IS_DESKTOP && "rounded-tl-[10px]")}
			>
				{!location.includes("terminal") && (
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
					{!location.includes("terminal") && <TopBar />}
					<div className="flex grow">{children}</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</Wrapper>
	)
})

export default MainContainer
