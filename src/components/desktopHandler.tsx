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

export const updateDesktopConfigMutex = new Semaphore(1)

export const DesktopHandler = memo(() => {
	const [authed] = useIsAuthed()
	const [desktopConfig, setDesktopConfig] = useDesktopConfig()
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

	const currentDesktopConfigStringified = useMemo(() => {
		return JSON.stringify(desktopConfig)
	}, [desktopConfig])

	const startNetworkDrive = useCallback(async () => {
		if (!authed) {
			return
		}

		setEnablingNetworkDrive(true)

		try {
			await window.desktopAPI.restartNetworkDrive()

			eventEmitter.emit("refetchNetworkDrive")
		} catch (e) {
			console.error(e)

			setDesktopConfig(prev => ({
				...prev,
				networkDriveConfig: {
					...prev.networkDriveConfig,
					enabled: false
				}
			}))
		} finally {
			setEnablingNetworkDrive(false)
		}
	}, [setDesktopConfig, authed, setEnablingNetworkDrive])

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
