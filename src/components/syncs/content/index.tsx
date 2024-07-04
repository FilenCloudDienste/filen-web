import { memo, useMemo } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSyncsStore } from "@/stores/syncs.store"
import { AlertCircle } from "lucide-react"

export const Content = memo(({ sync }: { sync: SyncPair }) => {
	const { transferEvents, cycleState, transfers, localIgnored, remoteIgnored } = useSyncsStore()

	const state = useMemo(() => {
		return {
			transferEvents: transferEvents[sync.uuid] ? transferEvents[sync.uuid]! : [],
			transfers: transfers[sync.uuid] ? transfers[sync.uuid]! : [],
			cycleState: cycleState[sync.uuid] ? cycleState[sync.uuid]! : "Starting",
			localIgnored: localIgnored[sync.uuid] ? localIgnored[sync.uuid]! : [],
			remoteIgnored: remoteIgnored[sync.uuid] ? remoteIgnored[sync.uuid]! : []
		}
	}, [sync.uuid, transferEvents, cycleState, transfers, localIgnored, remoteIgnored])

	return (
		<div className="flex flex-row w-full h-full select-none">
			<Tabs
				defaultValue="events"
				className="h-full w-full"
			>
				<TabsList className="mx-4 mt-4">
					<TabsTrigger value="events">Events</TabsTrigger>
					<TabsTrigger
						value="ignored"
						className="flex flex-row gap-1.5 items-center"
					>
						{state.localIgnored.length + state.remoteIgnored.length > 0 && <AlertCircle className="w-4 h-4 text-red-500" />}
						<p>Ignored</p>
					</TabsTrigger>
					<TabsTrigger value="issues">Issues</TabsTrigger>
					<TabsTrigger value="settings">Settings</TabsTrigger>
				</TabsList>
				<TabsContent
					value="events"
					className="h-[500px] w-[500px] break-all overflow-y-auto"
				>
					<p>Cycle: {state.cycleState}</p>
					{state.transferEvents.map((event, index) => {
						return (
							<div
								className="flex flex-row"
								key={index}
							>
								{JSON.stringify(event)}
							</div>
						)
					})}
				</TabsContent>
				<TabsContent
					value="ignored"
					className="w-full h-full flex flex-col gap-1"
				>
					{state.localIgnored.map((ignored, index) => {
						return (
							<div
								className="flex flex-row gap-2 items-center"
								key={index}
							>
								<p>
									{ignored.localPath}: {ignored.reason}
								</p>
							</div>
						)
					})}
					{state.remoteIgnored.map((ignored, index) => {
						return (
							<div
								className="flex flex-row gap-2 items-center"
								key={index}
							>
								<p>
									{ignored.localPath}: {ignored.reason}
								</p>
							</div>
						)
					})}
				</TabsContent>
				<TabsContent
					value="issues"
					className="w-full h-full"
				>
					issues
				</TabsContent>
				<TabsContent
					value="settings"
					className="w-full h-full"
				>
					settings
				</TabsContent>
			</Tabs>
			<div className="flex flex-col h-full w-[300px] border-l">
				<div className="flex flex-row w-full h-12">
					{state.transfers.map(transfer => {
						return (
							<div
								className="flex flex-row"
								key={transfer.localPath}
							>
								{JSON.stringify(transfer)}
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
})

export default Content
