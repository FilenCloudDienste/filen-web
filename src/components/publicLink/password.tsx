import { memo, useCallback, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock, Loader, Eye, EyeOff } from "lucide-react"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import worker from "@/lib/worker"
import { type FileLinkInfoResponse } from "@filen/sdk/dist/types/api/v3/file/link/info"
import { type DirLinkInfoDecryptedResponse } from "@filen/sdk/dist/types/api/v3/dir/link/info"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"

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
		const [password, setPassword] = useState<string>("")
		const loadingToast = useLoadingToast()
		const errorToast = useErrorToast()
		const [loading, setLoading] = useState<boolean>(false)
		const [showPassword, setShowPassword] = useState<boolean>(false)
		const urlState = usePublicLinkURLState()

		const onPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
			setPassword(e.target.value)
		}, [])

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
					errorToast("Wrong password")
				} else {
					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				}
			} finally {
				if (toast) {
					toast.dismiss()
				}

				setLoading(false)
			}
		}, [password, onAccess, errorToast, loadingToast, uuid, type, decryptionKey, salt, urlState.embed])

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
								<p className="text-center">This link is password protected</p>
								<p className="text-muted-foreground text-sm text-center">
									Please enter the password provided by the sender to gain access.
								</p>
							</div>
						</>
					)}
					<div className="flex flex-col w-full gap-2">
						<p className="text-muted-foreground text-sm">Password</p>
						<div className="absolute ml-[290px] mt-[39px]">
							{showPassword ? (
								<EyeOff
									size={18}
									onClick={toggleShowPassword}
									className="cursor-pointer"
								/>
							) : (
								<Eye
									size={18}
									onClick={toggleShowPassword}
									className="cursor-pointer"
								/>
							)}
						</div>
						<Input
							autoFocus={true}
							type={showPassword ? "text" : "password"}
							value={password}
							onChange={onPasswordChange}
							className="w-full pr-12"
							placeholder="Password"
							onKeyDown={onKeyDown}
							disabled={loading}
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
						Access
					</Button>
				</div>
			</div>
		)
	}
)

export default Password
