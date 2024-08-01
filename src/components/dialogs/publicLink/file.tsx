import { memo, useCallback, useState, useEffect } from "react"
import { type DriveCloudItem } from "@/components/drive"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { Switch } from "@/components/ui/switch"
import { useTranslation } from "react-i18next"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import { type FileLinkStatusResponse } from "@filen/sdk/dist/types/api/v3/file/link/status"
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

export const File = memo(
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
		const [status, setStatus] = useState<FileLinkStatusResponse | null>(null)
		const successToast = useSuccessToast()
		const location = useLocation()
		const setItems = useDriveItemsStore(useCallback(state => state.setItems, []))
		const [password, setPassword] = useState<string>("")
		const [expiration, setExpiration] = useState<PublicLinkExpiration>("never")
		const [showPassword, setShowPassword] = useState<boolean>(false)
		const [downloadBtn, setDownloadBtn] = useState<boolean>(true)

		const query = useQuery({
			queryKey: ["filePublicLinkStatus", item.uuid],
			queryFn: () => worker.filePublicLinkStatus({ uuid: item.uuid })
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
							type: "file",
							uuid: item.uuid
						})
					} else {
						if (!status.uuid) {
							return
						}

						await worker.disablePublicLink({
							type: "file",
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

					setTimeout(() => setSaving(false), 100)
				}
			},
			[loadingToast, errorToast, query, item.uuid, status, location, setItems, setOpen, saving, setSaving]
		)

		const toggleDownloadButton = useCallback(async (checked: boolean) => {
			setDownloadBtn(checked)
		}, [])

		const save = useCallback(async () => {
			if (!status || !status.uuid || saving) {
				return
			}

			setSaving(true)

			const toast = loadingToast()

			try {
				await worker.editPublicLink({
					type: "file",
					itemUUID: item.uuid,
					linkUUID: status.uuid,
					enableDownload: downloadBtn,
					expiration,
					password: password && password.length > 0 ? password : undefined
				})

				await query.refetch()
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()

				setSaving(false)
			}
		}, [loadingToast, errorToast, query, item.uuid, status, setSaving, saving, password, expiration, downloadBtn])

		const copyLink = useCallback(async () => {
			if (!status || !status.uuid) {
				return
			}

			try {
				await navigator.clipboard.writeText(PUBLIC_LINK_BASE_URL + status.uuid + "#" + (item.type === "file" ? item.key : ""))

				successToast(t("copiedToClipboard"))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			}
		}, [status, successToast, errorToast, item, t])

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

		useEffect(() => {
			if (query.isSuccess) {
				setStatus(query.data)
				setExpiration(query.data.expirationText as unknown as PublicLinkExpiration)
				setDownloadBtn(query.data.downloadBtn === 1)
				setShowSave(query.data.enabled)
			}
		}, [query.isSuccess, query.data, setShowSave])

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
				<div className="flex flex-row py-6 items-center justify-center">
					<Loader className="animate-spin-medium" />
				</div>
			)
		}

		return (
			<div className="flex flex-col py-6 gap-4">
				<div className="flex flex-row gap-10 items-center justify-between">
					<p>{t("dialogs.publicLink.enabled")}</p>
					<Switch
						checked={status.enabled}
						onCheckedChange={toggleStatus}
						disabled={saving}
					/>
				</div>
				{status.enabled && (
					<>
						<div className="flex flex-col gap-1">
							<p className="text-sm text-muted-foreground">{t("dialogs.publicLink.link")}</p>
							<div className="flex flex-row gap-2 justify-between items-center">
								<Input
									value={PUBLIC_LINK_BASE_URL + status.uuid + "#" + (item.type === "file" ? item.key : "")}
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
								<SelectContent>
									<SelectItem value="1h">1h</SelectItem>
									<SelectItem value="6h">6h</SelectItem>
									<SelectItem value="1d">1d</SelectItem>
									<SelectItem value="3d">3d</SelectItem>
									<SelectItem value="7d">7d</SelectItem>
									<SelectItem value="14d">14d</SelectItem>
									<SelectItem value="14d">30d</SelectItem>
									<SelectItem value="14d">never</SelectItem>
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

export default File
