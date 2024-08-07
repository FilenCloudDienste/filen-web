import { memo, useState, useCallback, useEffect } from "react"
import Section from "@/components/settings/section"
import Skeletons from "@/components/settings/skeletons"
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

export async function isS3Online(): Promise<{ online: boolean }> {
	const [online, active] = await Promise.all([window.desktopAPI.isS3Online(), window.desktopAPI.isS3Active()])

	return {
		online: online && active
	}
}

export const S3 = memo(() => {
	const settingsContainerSize = useSettingsContainerSize()
	const [desktopConfig, setDesktopConfig] = useDesktopConfig()
	const { t } = useTranslation()
	const errorToast = useErrorToast()
	const [hostname, setHostname] = useState<string>(desktopConfig.s3Config.hostname)
	const [port, setPort] = useState<number>(desktopConfig.s3Config.port)
	const [accessKeyId, setAccessKeyId] = useState<string>(desktopConfig.s3Config.accessKeyId)
	const [secretKeyId, setSecretKeyId] = useState<string>(desktopConfig.s3Config.accessKeyId)
	const successToast = useSuccessToast()
	const { enablingS3, setEnablingS3 } = useMountsStore(
		useCallback(state => ({ enablingS3: state.enablingS3, setEnablingS3: state.setEnablingS3 }), [])
	)

	const isOnlineQuery = useQuery({
		queryKey: ["isS3Online"],
		queryFn: () => isS3Online()
	})

	const onCheckedChange = useCallback(
		async (checked: boolean) => {
			if (enablingS3) {
				return
			}

			if (
				!checked &&
				!(await showConfirmDialog({
					title: t("mounts.s3.dialogs.disable.title"),
					continueButtonText: t("mounts.s3.dialogs.disable.continue"),
					description: t("mounts.s3.dialogs.disable.description"),
					continueButtonVariant: "destructive"
				}))
			) {
				return
			}

			if (checked && (!isValidIPv4(hostname) || !(await window.desktopAPI.canStartServerOnIPAndPort({ ip: hostname, port })))) {
				errorToast(t("mounts.s3.errors.invalidHostname"))

				return
			}

			if (checked && !isPortValidLocally(port)) {
				errorToast(t("mounts.s3.errors.invalidPort", { range: `${VALID_LOCAL_PORT_RANGE[0]}-${VALID_LOCAL_PORT_RANGE[1]}` }))

				return
			}

			setEnablingS3(true)

			try {
				if (checked) {
					await window.desktopAPI.restartS3Server()

					if (!(await isS3Online()).online) {
						throw new Error("Could not start S3 server.")
					}
				} else {
					await window.desktopAPI.stopS3Server()
				}

				await isOnlineQuery.refetch()

				setDesktopConfig(prev => ({
					...prev,
					s3Config: {
						...prev.s3Config,
						enabled: checked,
						accessKeyId,
						secretKeyId,
						port,
						hostname
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setDesktopConfig(prev => ({
					...prev,
					s3Config: {
						...prev.s3Config,
						enabled: false,
						accessKeyId,
						secretKeyId,
						port,
						hostname
					}
				}))
			} finally {
				setEnablingS3(false)
			}
		},
		[t, setEnablingS3, enablingS3, setDesktopConfig, isOnlineQuery, errorToast, accessKeyId, secretKeyId, port, hostname]
	)

	const onProtocolChange = useCallback(
		async (protocol: "http" | "https") => {
			if (enablingS3) {
				return
			}

			if (!isValidIPv4(hostname) || !(await window.desktopAPI.canStartServerOnIPAndPort({ ip: hostname, port }))) {
				errorToast(t("mounts.s3.errors.invalidHostname"))

				return
			}

			if (!isPortValidLocally(port)) {
				errorToast(t("mounts.s3.errors.invalidPort", { range: `${VALID_LOCAL_PORT_RANGE[0]}-${VALID_LOCAL_PORT_RANGE[1]}` }))

				return
			}

			setEnablingS3(true)

			try {
				if ((await isS3Online()).online) {
					await window.desktopAPI.restartS3Server()

					if (!(await isS3Online()).online) {
						throw new Error("Could not start S3 server.")
					}
				}

				await isOnlineQuery.refetch()

				setDesktopConfig(prev => ({
					...prev,
					s3Config: {
						...prev.s3Config,
						https: protocol === "https",
						accessKeyId,
						secretKeyId,
						port,
						hostname
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setDesktopConfig(prev => ({
					...prev,
					s3Config: {
						...prev.s3Config,
						enabled: false,
						accessKeyId,
						secretKeyId,
						port,
						hostname
					}
				}))
			} finally {
				setEnablingS3(false)
			}
		},
		[errorToast, setEnablingS3, enablingS3, isOnlineQuery, setDesktopConfig, accessKeyId, secretKeyId, port, t, hostname]
	)

	const copyConnect = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(
				`${desktopConfig.s3Config.https ? "https" : "http"}://${desktopConfig.s3Config.hostname}:${desktopConfig.s3Config.port}`
			)

			successToast(t("copiedToClipboard"))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [successToast, errorToast, t, desktopConfig.s3Config.https, desktopConfig.s3Config.hostname, desktopConfig.s3Config.port])

	useEffect(() => {
		if (isOnlineQuery.isSuccess && !isOnlineQuery.data.online) {
			setDesktopConfig(prev => ({
				...prev,
				s3Config: {
					...prev.s3Config,
					enabled: false
				}
			}))
		}
	}, [isOnlineQuery.isSuccess, isOnlineQuery.data, setDesktopConfig])

	useEffect(() => {
		const refetchS3Listener = eventEmitter.on("refetchS3", () => {
			isOnlineQuery.refetch().catch(console.error)
		})

		return () => {
			refetchS3Listener.remove()
		}
	}, [isOnlineQuery])

	if (!isOnlineQuery.isSuccess) {
		return <Skeletons />
	}

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
						name={t("mounts.s3.sections.active.name")}
						style={{
							// @ts-expect-error not typed
							WebkitAppRegion: "drag"
						}}
					>
						{enablingS3 ? (
							<Loader className="animate-spin-medium" />
						) : isOnlineQuery.data.online ? (
							<div className="flex flex-row gap-3">
								<CheckCircle className="text-green-500" />
							</div>
						) : (
							<XCircle className="text-red-500" />
						)}
					</Section>
					<Section
						name={t("mounts.s3.sections.enabled.name")}
						info={t("mounts.s3.sections.enabled.info")}
						className="mt-10"
					>
						<Switch
							disabled={enablingS3}
							checked={isOnlineQuery.isSuccess && isOnlineQuery.data.online}
							onCheckedChange={onCheckedChange}
						/>
					</Section>
					<Section
						name={t("mounts.s3.sections.protocol.name")}
						info={t("mounts.s3.sections.protocol.info")}
					>
						<Select
							onValueChange={onProtocolChange}
							value={desktopConfig.s3Config.https ? "https" : "http"}
							disabled={enablingS3 || (isOnlineQuery.isSuccess && isOnlineQuery.data.online)}
						>
							<SelectTrigger className="min-w-[90px]">
								<SelectValue placeholder={desktopConfig.s3Config.https ? "https" : "http"} />
							</SelectTrigger>
							<SelectContent className="max-h-[200px]">
								<SelectItem value="http">HTTP</SelectItem>
								<SelectItem value="https">HTTPS</SelectItem>
							</SelectContent>
						</Select>
					</Section>
					<Section
						name={t("mounts.s3.sections.hostname.name")}
						info={t("mounts.s3.sections.hostname.info")}
					>
						<Input
							value={hostname}
							type="text"
							onChange={e => setHostname(e.target.value.trim())}
							className="w-[130px]"
							disabled={enablingS3 || (isOnlineQuery.isSuccess && isOnlineQuery.data.online)}
							autoCapitalize="none"
							autoComplete="none"
							autoCorrect="none"
						/>
					</Section>
					<Section
						name={t("mounts.s3.sections.port.name")}
						info={t("mounts.s3.sections.port.info")}
					>
						<Input
							value={port}
							type="number"
							onChange={e => setPort(parseInt(e.target.value.trim()))}
							className="w-[80px]"
							disabled={enablingS3 || (isOnlineQuery.isSuccess && isOnlineQuery.data.online)}
							autoCapitalize="none"
							autoComplete="none"
							autoCorrect="none"
						/>
					</Section>
					<Section
						name={t("mounts.s3.sections.accessKeyId.name")}
						info={t("mounts.s3.sections.accessKeyId.info")}
					>
						<Input
							value={accessKeyId}
							type="text"
							onChange={e => {
								const access = e.target.value.trim()

								setAccessKeyId(access.length === 0 ? "admin" : access)
							}}
							className="w-[200px]"
							disabled={enablingS3 || (isOnlineQuery.isSuccess && isOnlineQuery.data.online)}
							autoCapitalize="none"
							autoComplete="none"
							autoCorrect="none"
							minLength={1}
							maxLength={32}
						/>
					</Section>
					<Section
						name={t("mounts.s3.sections.secretKeyId.name")}
						info={t("mounts.s3.sections.secretKeyId.info")}
					>
						<Input
							value={secretKeyId}
							type="text"
							onChange={e => {
								const secret = e.target.value.trim()

								setSecretKeyId(secret.length === 0 ? "admin" : secret)
							}}
							className="w-[200px]"
							disabled={enablingS3 || (isOnlineQuery.isSuccess && isOnlineQuery.data.online)}
							autoCapitalize="none"
							autoComplete="none"
							autoCorrect="none"
							minLength={1}
							maxLength={32}
						/>
					</Section>
					{!enablingS3 && isOnlineQuery.isSuccess && isOnlineQuery.data.online && (
						<Section
							name={t("mounts.s3.sections.connect.name")}
							info={t("mounts.s3.sections.connect.info")}
							className="mt-10"
						>
							<div className="flex flex-row gap-1 items-center">
								<Input
									value={`${desktopConfig.s3Config.https ? "https" : "http"}://${desktopConfig.s3Config.hostname}:${desktopConfig.s3Config.port}`}
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

export default S3
