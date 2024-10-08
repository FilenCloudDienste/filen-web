import { memo, useCallback } from "react"
import { useSyncsStore } from "@/stores/syncs.store"
import { cn } from "@/lib/utils"
import { RefreshCw, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import eventEmitter from "@/lib/eventEmitter"
import Content from "./content"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"

export const Syncs = memo(() => {
	const [desktopConfig] = useDesktopConfig()
	const selectedSync = useSyncsStore(useCallback(state => state.selectedSync, []))
	const { t } = useTranslation()

	const create = useCallback(() => {
		eventEmitter.emit("openCreateSyncDialog")
	}, [])

	return (
		<div
			className={cn("w-full flex flex-col", !selectedSync && "items-center justify-center")}
			style={{
				height: "calc(100dvh - " + DESKTOP_TOPBAR_HEIGHT + "px)"
			}}
		>
			{selectedSync ? (
				<Content sync={selectedSync} />
			) : desktopConfig.syncConfig.syncPairs.length === 0 ? (
				<div className="flex flex-row items-center justify-center w-full h-full select-none">
					<div className="flex flex-col p-4 justify-center items-center">
						<RefreshCw
							width={128}
							height={128}
							className="text-muted-foreground"
						/>
						<p className="text-xl text-center mt-4">{t("syncs.empty.title")}</p>
						<p className="text-muted-foreground text-center">{t("syncs.empty.description")}</p>
						<Button
							variant="secondary"
							className="items-center gap-2 mt-4"
							onClick={create}
						>
							<Plus size={16} />
							{t("syncs.empty.create")}
						</Button>
					</div>
				</div>
			) : null}
		</div>
	)
})

export default Syncs
