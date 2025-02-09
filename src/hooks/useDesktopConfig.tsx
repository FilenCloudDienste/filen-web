import { useLocalStorage } from "@uidotdev/usehooks"
import { type FilenDesktopConfig } from "@filen/desktop/dist/types"
import { DEFAULT_DESKTOP_CONFIG } from "@/lib/setup"
import { DESKTOP_CONFIG_VERSION, SDK_CONFIG_VERSION } from "@/constants"
import { getSDK } from "@/lib/sdk"
import { useMemo, useCallback } from "react"

export type UserSpecificSyncConfig = Record<number, FilenDesktopConfig["syncConfig"]>
export type UserSpecificWebDAVConfig = Record<number, FilenDesktopConfig["webdavConfig"]>
export type UserSpecificNetworkDriveConfig = Record<number, FilenDesktopConfig["networkDriveConfig"]>
export type UserSpecificS3Config = Record<number, FilenDesktopConfig["s3Config"]>

export const localStorageKey = `desktopConfig:${DESKTOP_CONFIG_VERSION}:${SDK_CONFIG_VERSION}`
export const SYNC_CONFIG_VERSION = 1
export const syncConfigLocalStorageKey = `syncConfig:${SYNC_CONFIG_VERSION}`
export const NETWORK_DRIVE_CONFIG_VERSION = 1
export const networkDriveConfigLocalStorageKey = `networkDriveConfig:${NETWORK_DRIVE_CONFIG_VERSION}`
export const WEBDAV_CONFIG_VERSION = 1
export const webdavConfigLocalStorageKey = `webdavConfig:${WEBDAV_CONFIG_VERSION}`
export const S3_CONFIG_VERSION = 1
export const s3ConfigLocalStorageKey = `s3Config:${S3_CONFIG_VERSION}`

export function getDesktopConfig(): FilenDesktopConfig {
	const desktopConfig = window.localStorage.getItem(localStorageKey)

	if (!desktopConfig) {
		return DEFAULT_DESKTOP_CONFIG
	}

	const sdk = getSDK()

	try {
		if (sdk.config.userId && sdk.config.userId !== 1 && sdk.config.userId > 0) {
			const desktopConfigParsed: FilenDesktopConfig = JSON.parse(desktopConfig)
			const syncConfig: UserSpecificSyncConfig = JSON.parse(window.localStorage.getItem(syncConfigLocalStorageKey) ?? "{}")
			const networkDriveConfig: UserSpecificNetworkDriveConfig = JSON.parse(
				window.localStorage.getItem(networkDriveConfigLocalStorageKey) ?? "{}"
			)
			const webdavConfig: UserSpecificWebDAVConfig = JSON.parse(window.localStorage.getItem(webdavConfigLocalStorageKey) ?? "{}")
			const s3Config: UserSpecificS3Config = JSON.parse(window.localStorage.getItem(s3ConfigLocalStorageKey) ?? "{}")

			return {
				...desktopConfigParsed,
				syncConfig: syncConfig && syncConfig[sdk.config.userId] ? syncConfig[sdk.config.userId]! : desktopConfigParsed.syncConfig,
				networkDriveConfig:
					networkDriveConfig && networkDriveConfig[sdk.config.userId]
						? networkDriveConfig[sdk.config.userId]!
						: desktopConfigParsed.networkDriveConfig,
				webdavConfig:
					webdavConfig && webdavConfig[sdk.config.userId] ? webdavConfig[sdk.config.userId]! : desktopConfigParsed.webdavConfig,
				s3Config: s3Config && s3Config[sdk.config.userId] ? s3Config[sdk.config.userId]! : desktopConfigParsed.s3Config
			}
		}

		return JSON.parse(desktopConfig)
	} catch (e) {
		console.error(e)

		return DEFAULT_DESKTOP_CONFIG
	}
}

export function setDesktopConfig(config: FilenDesktopConfig, setUserSpecificConfigs: boolean): void {
	window.localStorage.setItem(localStorageKey, JSON.stringify(config))

	if (setUserSpecificConfigs) {
		const sdk = getSDK()

		if (sdk.config.userId && sdk.config.userId !== 1 && sdk.config.userId > 0) {
			const syncConfig: UserSpecificSyncConfig = JSON.parse(window.localStorage.getItem(syncConfigLocalStorageKey) ?? "{}")
			const networkDriveConfig: UserSpecificNetworkDriveConfig = JSON.parse(
				window.localStorage.getItem(networkDriveConfigLocalStorageKey) ?? "{}"
			)
			const webdavConfig: UserSpecificWebDAVConfig = JSON.parse(window.localStorage.getItem(webdavConfigLocalStorageKey) ?? "{}")
			const s3Config: UserSpecificS3Config = JSON.parse(window.localStorage.getItem(s3ConfigLocalStorageKey) ?? "{}")

			if (syncConfig) {
				window.localStorage.setItem(
					syncConfigLocalStorageKey,
					JSON.stringify({
						...syncConfig,
						[sdk.config.userId!]: config.syncConfig
					})
				)
			}

			if (networkDriveConfig) {
				window.localStorage.setItem(
					networkDriveConfigLocalStorageKey,
					JSON.stringify({
						...networkDriveConfig,
						[sdk.config.userId!]: config.networkDriveConfig
					})
				)
			}

			if (webdavConfig) {
				window.localStorage.setItem(
					webdavConfigLocalStorageKey,
					JSON.stringify({
						...webdavConfig,
						[sdk.config.userId!]: config.webdavConfig
					})
				)
			}

			if (s3Config) {
				window.localStorage.setItem(
					s3ConfigLocalStorageKey,
					JSON.stringify({
						...s3Config,
						[sdk.config.userId!]: config.s3Config
					})
				)
			}
		}
	}
}

export default function useDesktopConfig() {
	const [desktopConfig, setDesktopConfig] = useLocalStorage<FilenDesktopConfig>(localStorageKey, DEFAULT_DESKTOP_CONFIG)
	const [syncConfig, setSyncConfig] = useLocalStorage<UserSpecificSyncConfig>(syncConfigLocalStorageKey, {})
	const [networkDriveConfig, setNetworkDriveConfig] = useLocalStorage<UserSpecificNetworkDriveConfig>(
		networkDriveConfigLocalStorageKey,
		DEFAULT_DESKTOP_CONFIG.networkDriveConfig
	)
	const [webdavConfig, setWebDAVConfig] = useLocalStorage<UserSpecificWebDAVConfig>(
		webdavConfigLocalStorageKey,
		DEFAULT_DESKTOP_CONFIG.webdavConfig
	)
	const [s3Config, setS3Config] = useLocalStorage<UserSpecificS3Config>(s3ConfigLocalStorageKey, DEFAULT_DESKTOP_CONFIG.s3Config)

	const config: FilenDesktopConfig = useMemo((): FilenDesktopConfig => {
		const sdk = getSDK()

		if (sdk.config.userId && sdk.config.userId !== 1 && sdk.config.userId > 0) {
			return {
				...desktopConfig,
				syncConfig: syncConfig[sdk.config.userId] ? syncConfig[sdk.config.userId]! : desktopConfig.syncConfig,
				networkDriveConfig: networkDriveConfig[sdk.config.userId]
					? networkDriveConfig[sdk.config.userId]!
					: desktopConfig.networkDriveConfig,
				webdavConfig: webdavConfig[sdk.config.userId] ? webdavConfig[sdk.config.userId]! : desktopConfig.webdavConfig,
				s3Config: s3Config[sdk.config.userId] ? s3Config[sdk.config.userId]! : desktopConfig.s3Config
			} satisfies FilenDesktopConfig
		}

		return desktopConfig
	}, [syncConfig, desktopConfig, networkDriveConfig, webdavConfig, s3Config])

	const setConfig = useCallback(
		(fn: FilenDesktopConfig | ((prev: FilenDesktopConfig) => FilenDesktopConfig)) => {
			const sdk = getSDK()

			if (typeof fn === "function") {
				setDesktopConfig(prev => {
					const newConfig = fn(prev)

					if (sdk.config.userId && sdk.config.userId !== 1 && sdk.config.userId > 0) {
						setSyncConfig(prev => ({
							...prev,
							[sdk.config.userId!]: newConfig.syncConfig
						}))

						setNetworkDriveConfig(prev => ({
							...prev,
							[sdk.config.userId!]: newConfig.networkDriveConfig
						}))

						setWebDAVConfig(prev => ({
							...prev,
							[sdk.config.userId!]: newConfig.webdavConfig
						}))

						setS3Config(prev => ({
							...prev,
							[sdk.config.userId!]: newConfig.s3Config
						}))
					}

					return newConfig
				})
			} else {
				setDesktopConfig(fn)

				if (sdk.config.userId && sdk.config.userId !== 1 && sdk.config.userId > 0) {
					setSyncConfig(prev => ({
						...prev,
						[sdk.config.userId!]: fn.syncConfig
					}))

					setNetworkDriveConfig(prev => ({
						...prev,
						[sdk.config.userId!]: fn.networkDriveConfig
					}))

					setWebDAVConfig(prev => ({
						...prev,
						[sdk.config.userId!]: fn.webdavConfig
					}))

					setS3Config(prev => ({
						...prev,
						[sdk.config.userId!]: fn.s3Config
					}))
				}
			}
		},
		[setDesktopConfig, setSyncConfig, setNetworkDriveConfig, setS3Config, setWebDAVConfig]
	)

	return [config, setConfig] as [
		FilenDesktopConfig,
		(fn: FilenDesktopConfig | ((prev: FilenDesktopConfig) => FilenDesktopConfig)) => void
	]
}
