import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import AuthContainer from "@/components/authContainer"
import Input from "@/components/input"
import { Button } from "@/components/ui/button"
import { useCallback, useState, useMemo } from "react"
import sdk from "@/lib/sdk"
import { useTranslation } from "react-i18next"
import RequireUnauthed from "@/components/requireUnauthed"
import { Loader, XCircle, CheckCircle, Info } from "lucide-react"
import { setup } from "@/lib/setup"
import useErrorToast from "@/hooks/useErrorToast"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import useSuccessToast from "@/hooks/useSuccessToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import { ratePassword } from "./register"
import useRouteParent from "@/hooks/useRouteParent"
import worker from "@/lib/worker"

export const Route = createFileRoute("/reset/$token")({
	component: Reset
})

export function Reset() {
	const [password, setPassword] = useState<string>("")
	const [confirmPassword, setConfirmPassword] = useState<string>("")
	const [showPassword, setShowPassword] = useState<boolean>(false)
	const { t } = useTranslation()
	const [loading, setLoading] = useState<boolean>(false)
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()
	const successToast = useSuccessToast()
	const token = useRouteParent()
	const [email, setEmail] = useState<string>("")
	const [importedMasterKeys, setImportedMasterKeys] = useState<string[]>([])
	const navigate = useNavigate()

	const passwordStrength = useMemo(() => {
		return ratePassword(password)
	}, [password])

	const parseMasterKeys = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const target = e.target

			if (!target.files) {
				errorToast(t("reset.alerts.invalidMasterKeysFile"))

				return
			}

			const file = target.files[0]

			if (!file) {
				errorToast(t("reset.alerts.invalidMasterKeysFile"))

				return
			}

			setLoading(true)

			const toast = loadingToast()

			try {
				const authInfo = await worker.authInfo({ email })
				const content = await new Promise<string>((resolve, reject) => {
					const reader = new FileReader()

					reader.onloadend = () => {
						try {
							resolve(Buffer.from(reader.result as string, "base64").toString("utf-8"))
						} catch (e) {
							reject(e)
						}
					}

					reader.onerror = reject

					reader.readAsText(file)
				})

				if (!content.includes("_VALID_FILEN_MASTERKEY_")) {
					errorToast(t("reset.alerts.invalidMasterKeysFile"))

					return
				}

				const keysEx = content.split("|")
				const masterKeys: string[] = []

				for (const key of keysEx) {
					if (key.split("_VALID_FILEN_MASTERKEY_").length === 3) {
						const foundKey = key.split("_VALID_FILEN_MASTERKEY_").join("")

						if (foundKey.length > 16 && foundKey.length < 128) {
							if (foundKey.includes("@")) {
								const foundKeyEx = foundKey.split("@")
								const foundKeyKey = foundKeyEx[0]
								const foundUserId = foundKeyEx[1]

								if (foundUserId && foundKeyKey && parseInt(foundUserId) === authInfo.id) {
									if (!masterKeys.includes(foundKeyKey)) {
										masterKeys.push(foundKeyKey)
									}
								} else {
									errorToast(t("reset.alerts.invalidMasterKeysFileWrongUserId"))

									return
								}
							} else {
								if (!masterKeys.includes(foundKey)) {
									masterKeys.push(foundKey)
								}
							}
						}
					} else {
						errorToast(t("reset.alerts.invalidMasterKeysFile"))

						return
					}
				}

				if (masterKeys.length === 0) {
					errorToast(t("reset.alerts.invalidMasterKeysFile"))

					return
				}

				setImportedMasterKeys(masterKeys)

				successToast(t("reset.alerts.masterKeysImported"))
			} catch (e) {
				console.error(e)

				target.value = ""

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()

				setLoading(false)
			}
		},
		[errorToast, t, loadingToast, email, successToast]
	)

	const reset = useCallback(async () => {
		if (loading || password.length === 0 || confirmPassword.length === 0) {
			return
		}

		if (passwordStrength.strength === "weak") {
			errorToast(t("reset.alerts.passwordWeak"))

			return
		}

		if (password !== confirmPassword) {
			errorToast(t("reset.alerts.passwordsNotMatching"))

			return
		}

		if (importedMasterKeys.length === 0) {
			if (
				!(await showConfirmDialog({
					title: t("reset.dialogs.noMasterKeysImported.title"),
					continueButtonText: t("reset.dialogs.noMasterKeysImported.continue"),
					description: t("reset.dialogs.noMasterKeysImported.description"),
					continueButtonVariant: "destructive"
				}))
			) {
				return
			}

			if (
				!(await showConfirmDialog({
					title: t("reset.dialogs.noMasterKeysImported2.title"),
					continueButtonText: t("reset.dialogs.noMasterKeysImported2.continue"),
					description: t("reset.dialogs.noMasterKeysImported2.description"),
					continueButtonVariant: "destructive"
				}))
			) {
				return
			}

			if (
				!(await showConfirmDialog({
					title: t("reset.dialogs.noMasterKeysImported3.title"),
					continueButtonText: t("reset.dialogs.noMasterKeysImported3.continue"),
					description: t("reset.dialogs.noMasterKeysImported3.description"),
					continueButtonVariant: "destructive"
				}))
			) {
				return
			}
		}

		setLoading(true)

		try {
			await setup({
				email: "anonymous",
				password: "anonymous",
				masterKeys: ["anonymous"],
				connectToSocket: true,
				metadataCache: true,
				twoFactorCode: undefined,
				publicKey: "anonymous",
				privateKey: "anonymous",
				apiKey: "anonymous",
				authVersion: 2,
				baseFolderUUID: "anonymous",
				userId: 1
			})

			const salt = await sdk.crypto().utils.generateRandomString({ length: 256 })
			const derived = await sdk.crypto().utils.generatePasswordAndMasterKeyBasedOnAuthVersion({
				rawPassword: password,
				salt,
				authVersion: 2
			})
			const hasRecoveryKeys = importedMasterKeys.length > 0
			const newMasterKeys =
				importedMasterKeys.length > 0
					? [...importedMasterKeys.filter(key => key !== derived.derivedMasterKeys), derived.derivedMasterKeys]
					: [derived.derivedMasterKeys]

			if (newMasterKeys.length === 0) {
				errorToast(t("reset.alerts.invalidMasterKeys"))

				return
			}

			const newMasterKeysEncrypted = await sdk
				.crypto()
				.encrypt()
				.metadata({
					metadata: newMasterKeys.join("|"),
					key: newMasterKeys[newMasterKeys.length - 1]
				})

			await sdk.api(3).user().password().forgotReset({
				token,
				password: derived.derivedPassword,
				salt,
				authVersion: 2,
				hasRecoveryKeys,
				newMasterKeys: newMasterKeysEncrypted
			})

			successToast(t("reset.alerts.passwordChanged"))

			navigate({
				to: "/login",
				replace: true,
				resetScroll: true
			})
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			setPassword("")
			setConfirmPassword("")
			setEmail("")
			setShowPassword(false)
			setLoading(false)
		}
	}, [errorToast, passwordStrength.strength, t, password, confirmPassword, token, loading, importedMasterKeys, successToast, navigate])

	const onKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				reset()
			}
		},
		[reset]
	)

	return (
		<RequireUnauthed>
			<AuthContainer>
				<div
					className="flex flex-col gap-6"
					style={{
						// @ts-expect-error not typed
						WebkitAppRegion: "no-drag"
					}}
				>
					<div className="flex flex-col gap-2">
						<h1 className="text-2xl font-semibold">{t("reset.header")}</h1>
						<p className="text-muted-foreground text-sm">{t("reset.description")}</p>
					</div>
					<div className="flex flex-col gap-3">
						<Input
							id="email"
							placeholder={t("reset.placeholders.example.email")}
							required={true}
							type="email"
							value={email}
							onChange={e => setEmail(e.target.value)}
							onKeyDown={onKeyDown}
							autoCapitalize="none"
							autoComplete="none"
							autoCorrect="none"
						/>
						<div className="w-full flex flex-row gap-2">
							<input
								type="file"
								accept="text/plain"
								id="master-keys-input"
								className="hidden"
								onChange={parseMasterKeys}
							/>
							<div className="flex flex-row items-center gap-2 grow">
								{importedMasterKeys.length > 0 ? (
									<>
										<CheckCircle
											size={16}
											className="text-green-500"
										/>
										<p className="text-sm text-muted-foreground">{t("reset.masterKeysImported")}</p>
									</>
								) : (
									<>
										<XCircle
											size={16}
											className="text-red-500"
										/>
										<p className="text-sm text-muted-foreground">{t("reset.masterKeysNotImported")}</p>
									</>
								)}
							</div>
							<Button
								onClick={() => document.getElementById("master-keys-input")?.click()}
								disabled={loading}
							>
								{t("reset.importMasterKeys")}
							</Button>
						</div>
						<div className="w-full flex flex-row">
							<Input
								id="password"
								required={true}
								type={showPassword ? "text" : "password"}
								placeholder={t("reset.placeholders.normal.password")}
								value={password}
								onChange={e => setPassword(e.target.value)}
								onKeyDown={onKeyDown}
								withPasswordToggleIcon={true}
								onPasswordToggle={() => setShowPassword(prev => !prev)}
								autoCapitalize="none"
								autoComplete="none"
								autoCorrect="none"
							/>
						</div>
						<div className="w-full flex flex-row">
							<Input
								id="confirmPassword"
								required={true}
								type={showPassword ? "text" : "password"}
								placeholder={t("reset.placeholders.normal.confirmPassword")}
								value={confirmPassword}
								onChange={e => setConfirmPassword(e.target.value)}
								onKeyDown={onKeyDown}
								withPasswordToggleIcon={true}
								onPasswordToggle={() => setShowPassword(prev => !prev)}
								autoCapitalize="none"
								autoComplete="none"
								autoCorrect="none"
							/>
						</div>
						{password.length > 0 && (
							<div className="flex flex-col gap-2 mt-2">
								{passwordStrength.strength === "weak" && (
									<div className="flex flex-row gap-1 w-full">
										<div className="w-[15%] h-[5px] bg-red-500" />
										<div className="w-[15%] h-[5px] bg-secondary" />
										<div className="w-[15%] h-[5px] bg-secondary" />
										<div className="w-[15%] h-[5px] bg-secondary" />
									</div>
								)}
								{passwordStrength.strength === "normal" && (
									<div className="flex flex-row gap-1 w-full">
										<div className="w-[15%] h-[5px] bg-orange-500" />
										<div className="w-[15%] h-[5px] bg-orange-500" />
										<div className="w-[15%] h-[5px] bg-secondary" />
										<div className="w-[15%] h-[5px] bg-secondary" />
									</div>
								)}
								{passwordStrength.strength === "strong" && (
									<div className="flex flex-row gap-1 w-full">
										<div className="w-[15%] h-[5px] bg-blue-500" />
										<div className="w-[15%] h-[5px] bg-blue-500" />
										<div className="w-[15%] h-[5px] bg-blue-500" />
										<div className="w-[15%] h-[5px] bg-secondary" />
									</div>
								)}
								{passwordStrength.strength === "best" && (
									<div className="flex flex-row gap-1 w-full">
										<div className="w-[15%] h-[5px] bg-green-500" />
										<div className="w-[15%] h-[5px] bg-green-500" />
										<div className="w-[15%] h-[5px] bg-green-500" />
										<div className="w-[15%] h-[5px] bg-green-500" />
									</div>
								)}
								<div className="flex flex-row gap-2 items-center mt-1">
									{passwordStrength.length ? (
										<CheckCircle
											size={14}
											className="text-green-500"
										/>
									) : (
										<XCircle
											size={14}
											className="text-red-500"
										/>
									)}
									<p className="text-sm text-muted-foreground">{t("register.passwordStrength.length")}</p>
								</div>
								<div className="flex flex-row gap-2 items-center">
									{passwordStrength.uppercase ? (
										<CheckCircle
											size={14}
											className="text-green-500"
										/>
									) : (
										<XCircle
											size={14}
											className="text-red-500"
										/>
									)}
									<p className="text-sm text-muted-foreground">{t("register.passwordStrength.uppercase")}</p>
								</div>
								<div className="flex flex-row gap-2 items-center">
									{passwordStrength.lowercase ? (
										<CheckCircle
											size={14}
											className="text-green-500"
										/>
									) : (
										<XCircle
											size={14}
											className="text-red-500"
										/>
									)}
									<p className="text-sm text-muted-foreground">{t("register.passwordStrength.lowercase")}</p>
								</div>
								<div className="flex flex-row gap-2 items-center">
									{passwordStrength.specialChars ? (
										<CheckCircle
											size={14}
											className="text-green-500"
										/>
									) : (
										<XCircle
											size={14}
											className="text-red-500"
										/>
									)}
									<p className="text-sm text-muted-foreground">{t("register.passwordStrength.specialChars")}</p>
								</div>
							</div>
						)}
						<Button
							className="w-full select-none mt-2 items-center gap-2"
							type="submit"
							onClick={reset}
							disabled={loading}
						>
							{loading ? (
								<Loader className="animate-spin-medium" />
							) : (
								<>
									{importedMasterKeys.length === 0 && (
										<Info
											size={16}
											className="text-red-500"
										/>
									)}
									{t("reset.buttons.reset")}
								</>
							)}
						</Button>
						<Link
							className="inline-block w-full text-center text-sm underline text-muted-foreground"
							to="/login"
							disabled={loading}
							draggable={false}
						>
							<Button
								className="w-full select-none"
								variant="outline"
								disabled={loading}
							>
								{t("reset.buttons.back")}
							</Button>
						</Link>
					</div>
				</div>
			</AuthContainer>
		</RequireUnauthed>
	)
}
