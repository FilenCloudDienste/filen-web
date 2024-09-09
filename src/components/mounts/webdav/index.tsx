import { memo, useState, useCallback, useEffect } from "react"
import Section from "@/components/settings/section"
import useSettingsContainerSize from "@/hooks/useSettingsContainerSize"
import { useTranslation } from "react-i18next"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import { useQuery } from "@tanstack/react-query"
import { Loader, CheckCircle, XCircle, Copy } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import useErrorToast from "@/hooks/useErrorToast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Input from "@/components/input"
import { VALID_LOCAL_PORT_RANGE } from "@/constants"
import { isPortValidLocally, isValidIPv4 } from "../utils"
import eventEmitter from "@/lib/eventEmitter"
import { Button } from "@/components/ui/button"
import useSuccessToast from "@/hooks/useSuccessToast"
import { useMountsStore } from "@/stores/mounts.store"

export async function isWebDAVOnline(): Promise<{ online: boolean }> {
	const [online, active] = await Promise.all([window.desktopAPI.isWebDAVOnline(), window.desktopAPI.isWebDAVActive()])

	return {
		online: online && active
	}
}

export const WebDAV = memo(() => {
	const settingsContainerSize = useSettingsContainerSize()
	const { enablingWebDAV, setEnablingWebDAV } = useMountsStore(
		useCallback(
			state => ({
				enablingWebDAV: state.enablingWebDAV,
				setEnablingWebDAV: state.setEnablingWebDAV
			}),
			[]
		)
	)
	const [desktopConfig, setDesktopConfig] = useDesktopConfig()
	const { t } = useTranslation()
	const errorToast = useErrorToast()
	const [hostname, setHostname] = useState<string>(desktopConfig.webdavConfig.hostname)
	const [port, setPort] = useState<number>(desktopConfig.webdavConfig.port)
	const [username, setUsername] = useState<string>(desktopConfig.webdavConfig.username)
	const [password, setPassword] = useState<string>(desktopConfig.webdavConfig.password)
	const successToast = useSuccessToast()

	const isOnlineQuery = useQuery({
		queryKey: ["isWebDAVOnline"],
		queryFn: () => isWebDAVOnline()
	})

	const onCheckedChange = useCallback(
		async (checked: boolean) => {
			if (enablingWebDAV) {
				return
			}

			if (
				!checked &&
				!(await showConfirmDialog({
					title: t("mounts.webdav.dialogs.disable.title"),
					continueButtonText: t("mounts.webdav.dialogs.disable.continue"),
					description: t("mounts.webdav.dialogs.disable.description"),
					continueButtonVariant: "destructive"
				}))
			) {
				return
			}

			if (checked && (!isValidIPv4(hostname) || !(await window.desktopAPI.canStartServerOnIPAndPort({ ip: hostname, port })))) {
				errorToast(t("mounts.webdav.errors.invalidHostname"))

				return
			}

			if (checked && !isPortValidLocally(port)) {
				errorToast(t("mounts.webdav.errors.invalidPort", { range: `${VALID_LOCAL_PORT_RANGE[0]}-${VALID_LOCAL_PORT_RANGE[1]}` }))

				return
			}

			setEnablingWebDAV(true)

			try {
				if (checked) {
					await window.desktopAPI.restartWebDAVServer()

					if (!(await isWebDAVOnline()).online) {
						throw new Error("Could not start WebDAV server.")
					}
				} else {
					await window.desktopAPI.stopWebDAVServer()
				}

				await isOnlineQuery.refetch()

				setDesktopConfig(prev => ({
					...prev,
					webdavConfig: {
						...prev.webdavConfig,
						enabled: checked,
						username,
						password,
						port,
						hostname
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setDesktopConfig(prev => ({
					...prev,
					webdavConfig: {
						...prev.webdavConfig,
						enabled: false,
						username,
						password,
						port,
						hostname
					}
				}))
			} finally {
				setEnablingWebDAV(false)
			}
		},
		[t, enablingWebDAV, setEnablingWebDAV, isOnlineQuery, errorToast, setDesktopConfig, username, password, port, hostname]
	)

	const onAuthModeChange = useCallback(
		async (mode: "basic" | "digest") => {
			if (enablingWebDAV) {
				return
			}

			if (!isValidIPv4(hostname) || !(await window.desktopAPI.canStartServerOnIPAndPort({ ip: hostname, port }))) {
				errorToast(t("mounts.webdav.errors.invalidHostname"))

				return
			}

			if (!isPortValidLocally(port)) {
				errorToast(t("mounts.webdav.errors.invalidPort", { range: `${VALID_LOCAL_PORT_RANGE[0]}-${VALID_LOCAL_PORT_RANGE[1]}` }))

				return
			}

			setEnablingWebDAV(true)

			try {
				if ((await isWebDAVOnline()).online) {
					await window.desktopAPI.restartWebDAVServer()

					if (!(await isWebDAVOnline()).online) {
						throw new Error("Could not start WebDAV server.")
					}
				}

				await isOnlineQuery.refetch()

				setDesktopConfig(prev => ({
					...prev,
					webdavConfig: {
						...prev.webdavConfig,
						authMode: mode,
						username,
						password,
						port,
						hostname
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setDesktopConfig(prev => ({
					...prev,
					webdavConfig: {
						...prev.webdavConfig,
						enabled: false,
						username,
						password,
						port,
						hostname
					}
				}))
			} finally {
				setEnablingWebDAV(false)
			}
		},
		[errorToast, enablingWebDAV, setEnablingWebDAV, isOnlineQuery, setDesktopConfig, port, username, password, t, hostname]
	)

	const onProtocolChange = useCallback(
		async (protocol: "http" | "https") => {
			if (enablingWebDAV) {
				return
			}

			if (!isValidIPv4(hostname) || !(await window.desktopAPI.canStartServerOnIPAndPort({ ip: hostname, port }))) {
				errorToast(t("mounts.webdav.errors.invalidHostname"))

				return
			}

			if (!isPortValidLocally(port)) {
				errorToast(t("mounts.webdav.errors.invalidPort", { range: `${VALID_LOCAL_PORT_RANGE[0]}-${VALID_LOCAL_PORT_RANGE[1]}` }))

				return
			}

			setEnablingWebDAV(true)

			try {
				if ((await isWebDAVOnline()).online) {
					await window.desktopAPI.restartWebDAVServer()

					if (!(await isWebDAVOnline()).online) {
						throw new Error("Could not start WebDAV server.")
					}
				}

				await isOnlineQuery.refetch()

				setDesktopConfig(prev => ({
					...prev,
					webdavConfig: {
						...prev.webdavConfig,
						https: protocol === "https",
						username,
						password,
						port,
						hostname
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setDesktopConfig(prev => ({
					...prev,
					webdavConfig: {
						...prev.webdavConfig,
						enabled: false,
						username,
						password,
						port,
						hostname
					}
				}))
			} finally {
				setEnablingWebDAV(false)
			}
		},
		[errorToast, enablingWebDAV, setEnablingWebDAV, isOnlineQuery, setDesktopConfig, username, password, port, t, hostname]
	)

	const onProxyModeChange = useCallback(
		async (checked: boolean) => {
			if (enablingWebDAV) {
				return
			}

			if (!isValidIPv4(hostname) || !(await window.desktopAPI.canStartServerOnIPAndPort({ ip: hostname, port }))) {
				errorToast(t("mounts.webdav.errors.invalidHostname"))

				return
			}

			if (!isPortValidLocally(port)) {
				errorToast(t("mounts.webdav.errors.invalidPort", { range: `${VALID_LOCAL_PORT_RANGE[0]}-${VALID_LOCAL_PORT_RANGE[1]}` }))

				return
			}

			setEnablingWebDAV(true)

			try {
				if ((await isWebDAVOnline()).online) {
					await window.desktopAPI.restartWebDAVServer()

					if (!(await isWebDAVOnline()).online) {
						throw new Error("Could not start WebDAV server.")
					}
				}

				await isOnlineQuery.refetch()

				setDesktopConfig(prev => ({
					...prev,
					webdavConfig: {
						...prev.webdavConfig,
						proxyMode: checked,
						username,
						password,
						port,
						hostname
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setDesktopConfig(prev => ({
					...prev,
					webdavConfig: {
						...prev.webdavConfig,
						enabled: false,
						username,
						password,
						port,
						hostname
					}
				}))
			} finally {
				setEnablingWebDAV(false)
			}
		},
		[errorToast, enablingWebDAV, setEnablingWebDAV, isOnlineQuery, setDesktopConfig, username, password, port, t, hostname]
	)

	const copyConnect = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(
				`${desktopConfig.webdavConfig.https ? "https" : "http"}://${desktopConfig.webdavConfig.hostname}:${desktopConfig.webdavConfig.port}`
			)

			successToast(t("copiedToClipboard"))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [
		successToast,
		errorToast,
		t,
		desktopConfig.webdavConfig.https,
		desktopConfig.webdavConfig.hostname,
		desktopConfig.webdavConfig.port
	])

	useEffect(() => {
		const refetchWebDAVListener = eventEmitter.on("refetchWebDAV", () => {
			isOnlineQuery.refetch().catch(console.error)
		})

		return () => {
			refetchWebDAVListener.remove()
		}
	}, [isOnlineQuery])

	return (
		<div className="flex flex-col w-full h-[100dvh] overflow-y-auto overflow-x-hidden">
			<div
				className="flex flex-col p-6 h-full"
				style={{
					width: settingsContainerSize.width
				}}
			>
				<div className="flex flex-col gap-4">
					<Section
						name={t("mounts.webdav.sections.active.name")}
						style={{
							// @ts-expect-error not typed
							WebkitAppRegion: "drag"
						}}
					>
						{enablingWebDAV || !isOnlineQuery.isSuccess ? (
							<Loader className="animate-spin-medium" />
						) : isOnlineQuery.data.online ? (
							<div className="flex flex-row gap-3">
								<CheckCircle className="text-green-500" />
							</div>
						) : (
							<XCircle className="text-red-500" />
						)}
					</Section>
					<div className="flex flex-col gap-3">
						<p className="text-muted-foreground text-sm">{t("mounts.webdav.description")}</p>
					</div>
					<Section
						name={t("mounts.webdav.sections.enabled.name")}
						info={t("mounts.webdav.sections.enabled.info")}
						className="mt-10"
					>
						<Switch
							disabled={enablingWebDAV}
							checked={isOnlineQuery.isSuccess && isOnlineQuery.data.online}
							onCheckedChange={onCheckedChange}
						/>
					</Section>
					<Section
						name={t("mounts.webdav.sections.protocol.name")}
						info={t("mounts.webdav.sections.protocol.info")}
					>
						<Select
							onValueChange={onProtocolChange}
							value={desktopConfig.webdavConfig.https ? "https" : "http"}
							disabled={enablingWebDAV || (isOnlineQuery.isSuccess && isOnlineQuery.data.online)}
						>
							<SelectTrigger className="min-w-[90px]">
								<SelectValue placeholder={desktopConfig.webdavConfig.https ? "https" : "http"} />
							</SelectTrigger>
							<SelectContent className="max-h-[200px]">
								<SelectItem value="http">HTTP</SelectItem>
								<SelectItem value="https">HTTPS</SelectItem>
							</SelectContent>
						</Select>
					</Section>
					<Section
						name={t("mounts.webdav.sections.hostname.name")}
						info={t("mounts.webdav.sections.hostname.info")}
					>
						<Input
							value={hostname}
							type="text"
							onChange={e => setHostname(e.target.value.trim())}
							className="w-[130px]"
							disabled={enablingWebDAV || (isOnlineQuery.isSuccess && isOnlineQuery.data.online)}
							autoCapitalize="none"
							autoComplete="none"
							autoCorrect="none"
						/>
					</Section>
					<Section
						name={t("mounts.webdav.sections.port.name")}
						info={t("mounts.webdav.sections.port.info")}
					>
						<Input
							value={port}
							type="number"
							onChange={e => setPort(parseInt(e.target.value.trim()))}
							className="w-[80px]"
							disabled={enablingWebDAV || (isOnlineQuery.isSuccess && isOnlineQuery.data.online)}
							autoCapitalize="none"
							autoComplete="none"
							autoCorrect="none"
						/>
					</Section>
					<Section
						name={t("mounts.webdav.sections.authMode.name")}
						info={t("mounts.webdav.sections.authMode.info")}
					>
						<Select
							onValueChange={onAuthModeChange}
							value={desktopConfig.webdavConfig.authMode}
							disabled={enablingWebDAV || (isOnlineQuery.isSuccess && isOnlineQuery.data.online)}
						>
							<SelectTrigger className="min-w-[90px]">
								<SelectValue placeholder={desktopConfig.webdavConfig.authMode} />
							</SelectTrigger>
							<SelectContent className="max-h-[200px]">
								<SelectItem value="basic">Basic</SelectItem>
								<SelectItem value="digest">Digest</SelectItem>
							</SelectContent>
						</Select>
					</Section>
					<Section
						name={t("mounts.webdav.sections.username.name")}
						info={t("mounts.webdav.sections.username.info")}
					>
						<Input
							value={username}
							type="text"
							onChange={e => {
								const user = e.target.value.trim()

								setUsername(user.length === 0 ? "admin" : user)
							}}
							className="w-[200px]"
							disabled={enablingWebDAV || (isOnlineQuery.isSuccess && isOnlineQuery.data.online)}
							autoCapitalize="none"
							autoComplete="none"
							autoCorrect="none"
							minLength={1}
							maxLength={32}
						/>
					</Section>
					<Section
						name={t("mounts.webdav.sections.password.name")}
						info={t("mounts.webdav.sections.password.info")}
					>
						<Input
							value={password}
							type="text"
							onChange={e => {
								const pass = e.target.value.trim()

								setPassword(pass.length === 0 ? "admin" : pass)
							}}
							className="w-[200px]"
							disabled={enablingWebDAV || (isOnlineQuery.isSuccess && isOnlineQuery.data.online)}
							autoCapitalize="none"
							autoComplete="none"
							autoCorrect="none"
							minLength={1}
							maxLength={32}
						/>
					</Section>
					<Section
						name={t("mounts.webdav.sections.proxyMode.name")}
						info={t("mounts.webdav.sections.proxyMode.info")}
					>
						<Switch
							disabled={enablingWebDAV || (isOnlineQuery.isSuccess && isOnlineQuery.data.online)}
							checked={desktopConfig.webdavConfig.proxyMode}
							onCheckedChange={onProxyModeChange}
						/>
					</Section>
					{!enablingWebDAV && isOnlineQuery.isSuccess && isOnlineQuery.data.online && (
						<Section
							name={t("mounts.webdav.sections.connect.name")}
							info={t("mounts.webdav.sections.connect.info")}
							className="mt-10"
						>
							<div className="flex flex-row gap-1 items-center">
								<Input
									value={`${desktopConfig.webdavConfig.https ? "https" : "http"}://${desktopConfig.webdavConfig.hostname}:${desktopConfig.webdavConfig.port}`}
									type="text"
									onChange={e => {
										e.preventDefault()
										e.target.blur()
									}}
									className="w-[250px] cursor-pointer"
									onClick={copyConnect}
									autoCapitalize="none"
									autoComplete="none"
									autoCorrect="none"
								/>
								<Button
									size="sm"
									onClick={copyConnect}
								>
									<Copy size={18} />
								</Button>
							</div>
						</Section>
					)}
					<div className="w-full h-20" />
				</div>
			</div>
		</div>
	)
})

export default WebDAV
