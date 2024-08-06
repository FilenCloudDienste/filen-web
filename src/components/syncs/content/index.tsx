import { memo } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import Events from "./events"
import Ignored from "./ignored"
import Settings from "./settings"
import Issues from "./issues"
import TabsTriggers from "./tabsTriggers"

export const Content = memo(({ sync }: { sync: SyncPair }) => {
	return (
		<div className="flex flex-row w-full h-full select-none">
			<Tabs
				key={sync.uuid}
				defaultValue="events"
				className="h-[calc(100dvh-88px)] w-full"
			>
				<TabsTriggers sync={sync} />
				<TabsContent
					value="events"
					className="h-full w-full pt-3"
				>
					<Events sync={sync} />
				</TabsContent>
				<TabsContent
					value="ignored"
					className="w-full h-full pt-3"
				>
					<Ignored sync={sync} />
				</TabsContent>
				<TabsContent
					value="issues"
					className="w-full h-full pt-3"
				>
					<Issues sync={sync} />
				</TabsContent>
				<TabsContent
					value="settings"
					className="w-full h-full pt-3"
				>
					<Settings sync={sync} />
				</TabsContent>
			</Tabs>
		</div>
	)
})

export default Content
