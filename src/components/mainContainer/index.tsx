import { memo, useMemo, useCallback } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useLocalStorage } from "@uidotdev/usehooks"
import SideBar from "./sideBar"
import InnerSideBar from "./innerSideBar"
import TopBar from "./topBar"
import { IS_DESKTOP, IS_APPLE_DEVICE } from "@/constants"
import { cn } from "@/lib/utils"
import useLocation from "@/hooks/useLocation"
import useWindowSize from "@/hooks/useWindowSize"
import { X, Maximize, Minus } from "lucide-react"
import { showConfirmDialog } from "../dialogs/confirm"
import { useTranslation } from "react-i18next"
import { useTheme } from "@/providers/themeProvider"

export const sidebarBasePx = 275
export const sidebarMinPx = 275
export const sidebarMaxPx = 500

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
	({ defaultSize, minSize, maxSize, location }: { defaultSize: number; minSize: number; maxSize: number; location: string }) => {
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
	const windowSize = useWindowSize()
	const [sidebarPercentage, setSidebarPercentage] = useLocalStorage<number>("sidebarPercentage", 0)
	const location = useLocation()
	const { dark } = useTheme()

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
				onLayout={e => setSidebarPercentage(e[0] ? e[0] : 20)}
				className={cn(dark ? "bg-muted/40" : "bg-background", IS_DESKTOP && "rounded-tl-[10px]")}
			>
				{!location.includes("terminal") && (
					<InnerSideBarWrapper
						defaultSize={sidebarSize}
						minSize={sidebarSizeRange.min}
						maxSize={sidebarSizeRange.max}
						location={location}
					/>
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
