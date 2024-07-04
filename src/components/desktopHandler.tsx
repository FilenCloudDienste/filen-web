import { memo, useEffect, useRef, useCallback, useMemo } from "react"
import { IS_DESKTOP } from "@/constants"
import eventEmitter from "@/lib/eventEmitter"
import { useLocalStorage } from "@uidotdev/usehooks"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import { Semaphore } from "@/lib/semaphore"
import { isVirtualDriveMounted } from "./mounts/virtualDrive"
import { isWebDAVOnline } from "./mounts/webdav"
import { isS3Online } from "./mounts/s3"

export const updateDesktopConfigMutex = new Semaphore(1)

export const DesktopHandler = memo(() => {
	const [authed] = useLocalStorage<boolean>("authed", false)
	const [desktopConfig, setDesktopConfig] = useDesktopConfig()
	const lastDesktopConfigRef = useRef<string>("")

	const currentDesktopConfigStringified = useMemo(() => {
		return JSON.stringify(desktopConfig)
	}, [desktopConfig])

	const startVirtualDrive = useCallback(async () => {
		if (!authed) {
			return
		}

		try {
			await window.desktopAPI.restartVirtualDrive()

			eventEmitter.emit("refetchVirtualDrive")
		} catch (e) {
			console.error(e)

			setDesktopConfig(prev => ({
				...prev,
				virtualDriveConfig: {
					...prev.virtualDriveConfig,
					enabled: false
				}
			}))
		}
	}, [setDesktopConfig, authed])

	const startWebDAV = useCallback(async () => {
		if (!authed) {
			return
		}

		try {
			await window.desktopAPI.restartWebDAVServer()

			eventEmitter.emit("refetchWebDAV")
		} catch (e) {
			console.error(e)

			setDesktopConfig(prev => ({
				...prev,
				webdavConfig: {
					...prev.webdavConfig,
					enabled: false
				}
			}))
		}
	}, [setDesktopConfig, authed])

	const startS3 = useCallback(async () => {
		if (!authed) {
			return
		}

		try {
			await window.desktopAPI.restartS3Server()

			eventEmitter.emit("refetchS3")
		} catch (e) {
			console.error(e)

			setDesktopConfig(prev => ({
				...prev,
				s3Config: {
					...prev.s3Config,
					enabled: false
				}
			}))
		}
	}, [setDesktopConfig, authed])

	useEffect(() => {
		;(async () => {
			if (!IS_DESKTOP || lastDesktopConfigRef.current === currentDesktopConfigStringified) {
				return
			}

			lastDesktopConfigRef.current = currentDesktopConfigStringified

			await window.desktopAPI.setConfig(desktopConfig).catch(console.error)

			await updateDesktopConfigMutex.acquire()

			try {
				const [isSyncActive, { mounted: virtualDriveMounted }, { online: webdavOnline }, { online: s3Online }] = await Promise.all([
					window.desktopAPI.isSyncActive(),
					isVirtualDriveMounted(),
					isWebDAVOnline(),
					isS3Online()
				])

				await Promise.all([
					isSyncActive
						? window.desktopAPI.forwardSyncMessage({
								type: "updateSyncPairs",
								data: {
									pairs: desktopConfig.syncConfig.syncPairs,
									resetCache: false
								}
							})
						: desktopConfig.syncConfig.syncPairs.length > 0
							? window.desktopAPI.restartSync()
							: Promise.resolve(),
					desktopConfig.virtualDriveConfig.enabled && !virtualDriveMounted ? startVirtualDrive() : Promise.resolve(),
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
	}, [currentDesktopConfigStringified, desktopConfig, startS3, startVirtualDrive, startWebDAV])

	return null
})

export default DesktopHandler
