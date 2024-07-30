import { memo, useEffect, useRef, useCallback, useMemo } from "react"
import { IS_DESKTOP } from "@/constants"
import eventEmitter from "@/lib/eventEmitter"
import { useLocalStorage } from "@uidotdev/usehooks"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import { Semaphore } from "@/lib/semaphore"
import { isVirtualDriveMounted } from "./mounts/virtualDrive"
import { isWebDAVOnline } from "./mounts/webdav"
import { isS3Online } from "./mounts/s3"
import { useMountsStore } from "@/stores/mounts.store"

export const updateDesktopConfigMutex = new Semaphore(1)

export const DesktopHandler = memo(() => {
	const [authed] = useLocalStorage<boolean>("authed", false)
	const [desktopConfig, setDesktopConfig] = useDesktopConfig()
	const lastDesktopConfigRef = useRef<string>("")
	const { setEnablingS3, setEnablingVirtualDrive, setEnablingWebDAV } = useMountsStore()

	const currentDesktopConfigStringified = useMemo(() => {
		return JSON.stringify(desktopConfig)
	}, [desktopConfig])

	const startVirtualDrive = useCallback(async () => {
		if (!authed) {
			return
		}

		setEnablingVirtualDrive(true)

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
		} finally {
			setEnablingVirtualDrive(false)
		}
	}, [setDesktopConfig, authed, setEnablingVirtualDrive])

	const startWebDAV = useCallback(async () => {
		if (!authed) {
			return
		}

		setEnablingWebDAV(true)

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
		} finally {
			setEnablingWebDAV(false)
		}
	}, [setDesktopConfig, authed, setEnablingWebDAV])

	const startS3 = useCallback(async () => {
		if (!authed) {
			return
		}

		setEnablingS3(true)

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
		} finally {
			setEnablingS3(false)
		}
	}, [setDesktopConfig, authed, setEnablingS3])

	useEffect(() => {
		;(async () => {
			if (!IS_DESKTOP || lastDesktopConfigRef.current === currentDesktopConfigStringified) {
				return
			}

			lastDesktopConfigRef.current = currentDesktopConfigStringified

			await window.desktopAPI.setConfig(desktopConfig).catch(console.error)

			await updateDesktopConfigMutex.acquire()

			try {
				const [{ mounted: virtualDriveMounted }, { online: webdavOnline }, { online: s3Online }] = await Promise.all([
					isVirtualDriveMounted(),
					isWebDAVOnline(),
					isS3Online()
				])

				await Promise.all([
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
