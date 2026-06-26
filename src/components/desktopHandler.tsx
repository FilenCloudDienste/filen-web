import { memo, useEffect, useRef, useCallback, useMemo } from "react"
import { IS_DESKTOP } from "@/constants"
import eventEmitter from "@/lib/eventEmitter"
import useIsAuthed from "@/hooks/useIsAuthed"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import { Semaphore } from "@/lib/semaphore"
import { isNetworkDriveMounted } from "./mounts/networkDrive"
import { isWebDAVOnline } from "./mounts/webdav"
import { isS3Online } from "./mounts/s3"
import { useMountsStore } from "@/stores/mounts.store"
import { useLocalStorage } from "@uidotdev/usehooks"
import useIsSyncActive from "@/hooks/useIsSyncActive"
import useSyncIssueCount from "@/hooks/useSyncIssueCount"
import useSyncConfirmDeletion from "@/hooks/useSyncConfirmDeletion"
import useNetworkDriveStats from "@/hooks/useNetworkDriveStats"

const updateDesktopConfigMutex = new Semaphore(1)

export const DesktopHandler = memo(() => {
	const [authed] = useIsAuthed()
	const [desktopConfig] = useDesktopConfig()
	const lastDesktopConfigRef = useRef<string>("")
	const { setEnablingS3, setEnablingNetworkDrive, setEnablingWebDAV } = useMountsStore(
		useCallback(
			state => ({
				setEnablingS3: state.setEnablingS3,
				setEnablingNetworkDrive: state.setEnablingNetworkDrive,
				setEnablingWebDAV: state.setEnablingWebDAV
			}),
			[]
		)
	)
	const [minimizeToTrayEnabled] = useLocalStorage<boolean>("minimizeToTrayEnabled", false)
	const isSyncActive = useIsSyncActive()
	const syncIssueCount = useSyncIssueCount()
	const [startMinimizedEnabled] = useLocalStorage<boolean>("startMinimizedEnabled", false)
	const syncConfirmDeletion = useSyncConfirmDeletion()
	const { uploadsInProgress: networkDriveUploadsInProgress } = useNetworkDriveStats()

	const currentDesktopConfigStringified = useMemo(() => {
		return JSON.stringify(desktopConfig)
	}, [desktopConfig])

	// Auto-start helpers. On failure they intentionally do NOT flip `enabled` to false: that flag is the persisted
	// "user wants this on" intent that drives auto-start, so a transient boot failure (port busy, binary still warming,
	// etc.) must not silently erase it. The status query (refetched in `finally`) reflects that the role is not running,
	// and the role is retried on the next config change or app launch.
	const startNetworkDrive = useCallback(async () => {
		if (!authed) {
			return
		}

		setEnablingNetworkDrive(true)

		try {
			await window.desktopAPI.restartNetworkDrive()
		} catch (e) {
			console.error(e)
		} finally {
			eventEmitter.emit("refetchNetworkDrive")

			setEnablingNetworkDrive(false)
		}
	}, [authed, setEnablingNetworkDrive])

	const startWebDAV = useCallback(async () => {
		if (!authed) {
			return
		}

		setEnablingWebDAV(true)

		try {
			await window.desktopAPI.restartWebDAVServer()
		} catch (e) {
			console.error(e)
		} finally {
			eventEmitter.emit("refetchWebDAV")

			setEnablingWebDAV(false)
		}
	}, [authed, setEnablingWebDAV])

	const startS3 = useCallback(async () => {
		if (!authed) {
			return
		}

		setEnablingS3(true)

		try {
			await window.desktopAPI.restartS3Server()
		} catch (e) {
			console.error(e)
		} finally {
			eventEmitter.emit("refetchS3")

			setEnablingS3(false)
		}
	}, [authed, setEnablingS3])

	useEffect(() => {
		if (!authed) {
			return
		}

		Promise.all([
			window.desktopAPI.updateIsSyncing(isSyncActive || networkDriveUploadsInProgress > 0),
			window.desktopAPI.updateWarningCount(syncIssueCount + syncConfirmDeletion.length)
		]).catch(console.error)
	}, [isSyncActive, syncIssueCount, authed, syncConfirmDeletion.length, networkDriveUploadsInProgress])

	useEffect(() => {
		if (!authed) {
			return
		}

		Promise.all([
			window.desktopAPI.setMinimizeToTray(minimizeToTrayEnabled),
			window.desktopAPI.setStartMinimized(startMinimizedEnabled)
		]).catch(console.error)
	}, [minimizeToTrayEnabled, startMinimizedEnabled, authed])

	useEffect(() => {
		;(async () => {
			if (!IS_DESKTOP || lastDesktopConfigRef.current === currentDesktopConfigStringified) {
				return
			}

			lastDesktopConfigRef.current = currentDesktopConfigStringified

			await window.desktopAPI.setConfig(desktopConfig).catch(console.error)

			await updateDesktopConfigMutex.acquire()

			try {
				const [{ mounted: networkDriveMounted }, { online: webdavOnline }, { online: s3Online }] = await Promise.all([
					isNetworkDriveMounted(),
					isWebDAVOnline(),
					isS3Online()
				])

				await Promise.all([
					desktopConfig.networkDriveConfig.enabled && !networkDriveMounted ? startNetworkDrive() : Promise.resolve(),
					desktopConfig.webdavConfig.enabled && !webdavOnline ? startWebDAV() : Promise.resolve(),
					desktopConfig.s3Config.enabled && !s3Online ? startS3() : Promise.resolve()
				])
			} catch (e) {
				console.error(e)

				lastDesktopConfigRef.current = ""
			} finally {
				updateDesktopConfigMutex.release()
			}
		})()
	}, [currentDesktopConfigStringified, desktopConfig, startS3, startNetworkDrive, startWebDAV])

	return null
})

export default DesktopHandler
