import { memo, useCallback, useState } from "react"
import Input from "@/components/input"
import { Button } from "@/components/ui/button"
import { Lock, Loader } from "lucide-react"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import worker from "@/lib/worker"
import { type FileLinkInfoResponse } from "@filen/sdk/dist/types/api/v3/file/link/info"
import { type DirLinkInfoDecryptedResponse } from "@filen/sdk/dist/types/api/v3/dir/link/info"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import { usePublicLinkStore } from "@/stores/publicLink.store"
import { useTranslation } from "react-i18next"

export const Password = memo(
	({
		onAccess,
		uuid,
		type,
		decryptionKey,
		salt
	}: {
		onAccess: (
			fileLinkInfo: (Omit<FileLinkInfoResponse, "size"> & { size: number }) | null,
			dirLinkInfo: DirLinkInfoDecryptedResponse | null,
			password: string
		) => void
		uuid: string
		type: "file" | "directory"
		decryptionKey: string
		salt?: string
	}) => {
		const { t } = useTranslation()
		const [password, setPassword] = useState<string>("")
		const loadingToast = useLoadingToast()
		const errorToast = useErrorToast()
		const [loading, setLoading] = useState<boolean>(false)
		const [showPassword, setShowPassword] = useState<boolean>(false)
		const urlState = usePublicLinkURLState()
		const { setPasswordState } = usePublicLinkStore()

		const onPasswordChange = useCallback(
			(e: React.ChangeEvent<HTMLInputElement>) => {
				setPassword(e.target.value)

				setPasswordState({
					uuid,
					password: e.target.value,
					salt: salt ? salt : ""
				})
			},
			[uuid, setPasswordState, salt]
		)

		const toggleShowPassword = useCallback(() => {
			setShowPassword(prev => !prev)
		}, [])

		const access = useCallback(async () => {
			if (password.length === 0) {
				return
			}

			setLoading(true)

			let toast: ReturnType<typeof loadingToast> | null = null

			if (!urlState.embed) {
				toast = loadingToast()
			}

			try {
				if (type === "file") {
					const info = await worker.filePublicLinkInfo({
						uuid,
						password,
						key: decryptionKey,
						salt
					})

					if (!info.password || info.password.length === 0) {
						onAccess(info, null, password)

						return
					}

					onAccess(info, null, password)
				} else {
					const info = await worker.directoryPublicLinkInfo({
						uuid,
						key: decryptionKey
					})

					if (!info.hasPassword) {
						onAccess(null, info, password)

						return
					}

					await worker.directoryPublicLinkContent({
						uuid,
						parent: info.parent,
						password,
						key: decryptionKey,
						salt: info.salt
					})

					onAccess(null, info, password)
				}
			} catch (e) {
				setPassword("")

				if (((e as unknown as Error).message ?? "").toLowerCase().includes("wrong password")) {
					errorToast(t("publicLink.auth.wrongPassword"))
				} else {
					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				}
			} finally {
				if (toast) {
					toast.dismiss()
				}

				setLoading(false)
			}
		}, [password, onAccess, errorToast, loadingToast, uuid, type, decryptionKey, salt, urlState.embed, t])

		const onKeyDown = useCallback(
			(e: React.KeyboardEvent<HTMLInputElement>) => {
				if (e.key === "Enter") {
					e.preventDefault()
					e.stopPropagation()

					access()
				}
			},
			[access]
		)

		return (
			<div className="flex flex-col w-full h-full items-center justify-center">
				<div className="flex flex-col w-80 h-auto gap-3 justify-center items-center">
					{!urlState.embed && (
						<>
							<div className="p-3 bg-secondary rounded-md">
								<Lock size={50} />
							</div>
							<div className="flex flex-col my-4">
								<p className="text-center">{t("publicLink.auth.title")}</p>
								<p className="text-muted-foreground text-sm text-center">{t("publicLink.auth.subTitle")}</p>
							</div>
						</>
					)}
					<div className="flex flex-col w-full gap-2">
						<Input
							autoFocus={true}
							type={showPassword ? "text" : "password"}
							value={password}
							onChange={onPasswordChange}
							className="w-full"
							placeholder={t("publicLink.auth.passwordPlaceholder")}
							onKeyDown={onKeyDown}
							disabled={loading}
							onPasswordToggle={toggleShowPassword}
							withPasswordToggleIcon={true}
							autoCapitalize="none"
							autoComplete="none"
							autoCorrect="none"
							required={true}
						/>
					</div>
					<Button
						className="w-full items-center gap-2"
						onClick={access}
						disabled={loading}
					>
						{loading && (
							<Loader
								className="animate-spin-medium"
								size={16}
							/>
						)}
						{t("publicLink.auth.access")}
					</Button>
				</div>
			</div>
		)
	}
)

export default Password
