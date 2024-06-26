import { memo, useEffect, useRef, useCallback } from "react"
import { IS_DESKTOP } from "@/constants"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import { useVirtualDriveStore } from "@/stores/mounts.store"
import eventEmitter from "@/lib/eventEmitter"

export const DesktopHandler = memo(({ children }: { children: React.ReactNode }) => {
	const initDoneRef = useRef<boolean>(false)
	const [desktopConfig] = useDesktopConfig()
	const [virtualDriveStore, setVirtualDriveStore] = useVirtualDriveStore()

	const startVirtualDrive = useCallback(async () => {
		try {
			await window.desktopAPI.setConfig(desktopConfig)
			await window.desktopAPI.restartVirtualDrive()

			eventEmitter.emit("refetchVirtualDrive")
		} catch (e) {
			console.error(e)

			setVirtualDriveStore(prev => ({
				...prev,
				enabled: false
			}))
		}
	}, [desktopConfig, setVirtualDriveStore])

	const cleanupCache = useCallback(async () => {
		try {
			await window.desktopAPI.virtualDriveCleanupCache()
		} catch (e) {
			console.error(e)
		}
	}, [])

	useEffect(() => {
		if (!IS_DESKTOP || initDoneRef.current) {
			return
		}

		initDoneRef.current = true

		if (virtualDriveStore.enabled) {
			startVirtualDrive()
		}
	}, [virtualDriveStore.enabled, startVirtualDrive])

	useEffect(() => {
		const cacheCleanupInterval = setInterval(() => {
			cleanupCache()
		}, 900 * 1000)

		return () => {
			clearInterval(cacheCleanupInterval)
		}
	}, [cleanupCache])

	return children
})

export default DesktopHandler
