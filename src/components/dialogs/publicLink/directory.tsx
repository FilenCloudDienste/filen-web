import { memo, useCallback, useState, useEffect } from "react"
import { type DriveCloudItem } from "@/components/drive"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { Switch } from "@/components/ui/switch"
import { useTranslation } from "react-i18next"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import Input from "@/components/input"
import { PUBLIC_LINK_BASE_URL } from "@/constants"
import { Button } from "@/components/ui/button"
import useSuccessToast from "@/hooks/useSuccessToast"
import { useDriveItemsStore } from "@/stores/drive.store"
import useLocation from "@/hooks/useLocation"
import eventEmitter from "@/lib/eventEmitter"
import { Loader } from "lucide-react"
import { type PublicLinkExpiration } from "@filen/sdk"
import { type DirLinkStatusResponse } from "@filen/sdk/dist/types/api/v3/dir/link/status"
import { type WorkerToMainMessage } from "@/lib/worker/types"

export const Directory = memo(
	({
		item,
		setOpen,
		saving,
		setSaving,
		setShowSave
	}: {
		item: DriveCloudItem
		setOpen: React.Dispatch<React.SetStateAction<boolean>>
		saving: boolean
		setSaving: React.Dispatch<React.SetStateAction<boolean>>
		setShowSave: React.Dispatch<React.SetStateAction<boolean>>
	}) => {
		const { t } = useTranslation()
		const loadingToast = useLoadingToast()
		const errorToast = useErrorToast()
		const [status, setStatus] = useState<DirLinkStatusResponse | null>(null)
		const successToast = useSuccessToast()
		const location = useLocation()
		const setItems = useDriveItemsStore(useCallback(state => state.setItems, []))
		const [password, setPassword] = useState<string>("")
		const [expiration, setExpiration] = useState<PublicLinkExpiration>("never")
		const [showPassword, setShowPassword] = useState<boolean>(false)
		const [decryptedLinkKey, setDecryptedLinkKey] = useState<string>("")
		const [downloadBtn, setDownloadBtn] = useState<boolean>(true)
		const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })

		const query = useQuery({
			queryKey: ["directoryPublicLinkStatus", item.uuid],
			queryFn: () => worker.directoryPublicLinkStatus({ uuid: item.uuid })
		})

		const toggleStatus = useCallback(
			async (checked: boolean) => {
				if (!status || saving) {
					return
				}

				setSaving(true)

				const toast = loadingToast()

				try {
					if (checked) {
						await worker.enablePublicLink({
							type: "directory",
							uuid: item.uuid
						})
					} else {
						if (!status.exists) {
							return
						}

						await worker.disablePublicLink({
							type: "directory",
							itemUUID: item.uuid,
							linkUUID: status.uuid
						})
					}

					await query.refetch()

					if (location.includes("links")) {
						setItems(prev => prev.filter(prevItem => prevItem.uuid !== item.uuid))
						setOpen(false)
					}
				} catch (e) {
					console.error(e)

					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				} finally {
					toast.dismiss()

					setProgress({ done: 0, total: 0 })
					setTimeout(() => setSaving(false), 100)
				}
			},
			[loadingToast, errorToast, query, item.uuid, status, location, setItems, setOpen, saving, setSaving]
		)
		const toggleDownloadButton = useCallback(async (checked: boolean) => {
			setDownloadBtn(checked)
		}, [])

		const save = useCallback(async () => {
			if (!status || !status.exists || saving) {
				return
			}

			setSaving(true)

			const toast = loadingToast()

			try {
				await worker.editPublicLink({
					type: "directory",
					itemUUID: item.uuid,
					linkUUID: status.uuid,
					enableDownload: downloadBtn,
					expiration,
					password: password && password.length > 0 ? password : undefined
				})

				setOpen(false)

				await query.refetch()
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()

				setProgress({ done: 0, total: 0 })
				setSaving(false)
			}
		}, [loadingToast, errorToast, query, item.uuid, status, setSaving, saving, password, expiration, downloadBtn, setOpen])

		const copyLink = useCallback(async () => {
			if (!status || !status.exists || decryptedLinkKey.length === 0) {
				return
			}

			try {
				await navigator.clipboard.writeText(
					PUBLIC_LINK_BASE_URL.split("/#/d/").join("/#/f/") +
						status.uuid +
						encodeURIComponent("#") +
						Buffer.from(decryptedLinkKey, "utf-8").toString("hex")
				)

				successToast(t("copiedToClipboard"))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			}
		}, [status, successToast, errorToast, decryptedLinkKey, t])

		const onPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
			setPassword(e.target.value)
		}, [])

		const onExpirationChange = useCallback((exp: PublicLinkExpiration) => {
			setExpiration(exp)
		}, [])

		const toggleShowPassword = useCallback(() => {
			setShowPassword(prev => !prev)
		}, [])

		const preventDefault = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
			e.preventDefault()
		}, [])

		const decryptLinkKey = useCallback(async () => {
			if (!status || !status.exists) {
				return
			}

			try {
				const decryptedKey = await worker.decryptDirectoryLinkKey({ key: status.key })

				setDecryptedLinkKey(decryptedKey)
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			}
		}, [status, errorToast])

		useEffect(() => {
			if (query.isSuccess) {
				setStatus(query.data)
				setExpiration(query.data.exists ? (query.data.expirationText as unknown as PublicLinkExpiration) : "never")
				decryptLinkKey()
				setDownloadBtn(query.data.exists ? query.data.downloadBtn === 1 : true)
				setShowSave(query.data.exists)
			}
		}, [query.isSuccess, query.data, decryptLinkKey, setShowSave])

		useEffect(() => {
			const workerMessageListener = eventEmitter.on("workerMessage", (message: WorkerToMainMessage) => {
				if (message.type === "publicLinkProgress" && message.uuid === item.uuid) {
					setProgress({
						done: message.done,
						total: message.total
					})
				}
			})

			return () => {
				workerMessageListener.remove()
			}
		}, [item.uuid])

		useEffect(() => {
			const savePublicLinkListener = eventEmitter.on("savePublicLink", () => {
				save()
			})

			return () => {
				savePublicLinkListener.remove()
			}
		}, [save])

		if (!status || saving) {
			return (
				<div className="flex flex-col py-6 items-center justify-center gap-2.5">
					<Loader className="animate-spin-medium" />
					{progress.total > 0 && (
						<p className="text-muted-foreground text-sm text-ellipsis line-clamp-1 break-all">
							{t("dialogs.publicLink.progress", progress)}
						</p>
					)}
				</div>
			)
		}

		return (
			<div className="flex flex-col py-6 gap-4">
				<div className="flex flex-row gap-10 items-center justify-between">
					<p>{t("dialogs.publicLink.enabled")}</p>
					<Switch
						checked={status.exists}
						onCheckedChange={toggleStatus}
						disabled={saving}
					/>
				</div>
				{status.exists && (
					<>
						<div className="flex flex-col gap-1">
							<p className="text-sm text-muted-foreground">{t("dialogs.publicLink.link")}</p>
							<div className="flex flex-row gap-2 justify-between items-center">
								<Input
									value={
										PUBLIC_LINK_BASE_URL.split("/#/d/").join("/#/f/") +
										status.uuid +
										encodeURIComponent("#") +
										Buffer.from(decryptedLinkKey, "utf-8").toString("hex")
									}
									onChange={preventDefault}
								/>
								<Button onClick={copyLink}>{t("dialogs.publicLink.copyLink")}</Button>
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<p className="text-sm text-muted-foreground">{t("dialogs.publicLink.expiresAfter")}</p>
							<Select onValueChange={onExpirationChange}>
								<SelectTrigger>
									<SelectValue placeholder={status.expirationText} />
								</SelectTrigger>
								<SelectContent className="max-h-[200px]">
									<SelectItem value="1h">1h</SelectItem>
									<SelectItem value="6h">6h</SelectItem>
									<SelectItem value="1d">1d</SelectItem>
									<SelectItem value="3d">3d</SelectItem>
									<SelectItem value="7d">7d</SelectItem>
									<SelectItem value="14d">14d</SelectItem>
									<SelectItem value="30d">30d</SelectItem>
									<SelectItem value="never">{t("dialogs.publicLink.expireNever")}</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1">
							<p className="text-sm text-muted-foreground">{t("dialogs.publicLink.password")}</p>
							<Input
								value={password}
								onChange={onPasswordChange}
								type={showPassword ? "text" : "password"}
								placeholder={status.password ? new Array(16).join("*") : t("dialogs.publicLink.passwordPlaceholder")}
								withPasswordToggleIcon={true}
								onPasswordToggle={toggleShowPassword}
								autoCapitalize="none"
								autoComplete="none"
								autoCorrect="none"
							/>
						</div>
						<div className="flex flex-row gap-10 items-center justify-between">
							<p className="line-clamp-1 text-ellipsis break-all">{t("dialogs.publicLink.downloadButton")}</p>
							<Switch
								checked={downloadBtn}
								onCheckedChange={toggleDownloadButton}
							/>
						</div>
					</>
				)}
			</div>
		)
	}
)

export default Directory
