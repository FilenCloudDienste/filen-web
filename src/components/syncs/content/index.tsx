import { memo, useState } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import Events from "./events"
import Ignored from "./ignored"
import Settings from "./settings"
import Issues from "./issues"
import TabsTriggers from "./tabsTriggers"

export const Content = memo(({ sync }: { sync: SyncPair }) => {
	const [activeTab, setActiveTab] = useState<string>("events")

	return (
		<div className="flex flex-row w-full h-full select-none">
			<Tabs
				defaultValue="events"
				className="h-[calc(100dvh-88px)] w-full"
				onValueChange={setActiveTab}
			>
				<TabsTriggers sync={sync} />
				<TabsContent
					value="events"
					className="h-full w-full pt-3"
				>
					{activeTab === "events" && <Events sync={sync} />}
				</TabsContent>
				<TabsContent
					value="ignored"
					className="w-full h-full pt-3"
				>
					{activeTab === "ignored" && <Ignored sync={sync} />}
				</TabsContent>
				<TabsContent
					value="issues"
					className="w-full h-full pt-3"
				>
					{activeTab === "issues" && <Issues sync={sync} />}
				</TabsContent>
				<TabsContent
					value="settings"
					className="w-full h-full pt-3"
				>
					{activeTab === "settings" && <Settings sync={sync} />}
				</TabsContent>
			</Tabs>
		</div>
	)
})

export default Content
