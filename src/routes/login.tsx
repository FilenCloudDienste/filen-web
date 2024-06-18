import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import AuthContainer from "@/components/authContainer"
import Input from "@/components/input"
import { Button } from "@/components/ui/button"
import { useCallback, useState } from "react"
import sdk from "@/lib/sdk"
import { APIError } from "@filen/sdk"
import { useTranslation } from "react-i18next"
import RequireUnauthed from "@/components/requireUnauthed"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp"
import { Loader } from "lucide-react"
import { setup } from "@/lib/setup"
import worker from "@/lib/worker"
import { showInputDialog } from "@/components/dialogs/input"
import useErrorToast from "@/hooks/useErrorToast"
import useSuccessToast from "@/hooks/useSuccessToast"
import useLoadingToast from "@/hooks/useLoadingToast"

export const Route = createFileRoute("/login")({
	component: Login
})

export function Login() {
	const [email, setEmail] = useState<string>("")
	const [password, setPassword] = useState<string>("")
	const [twoFactorCode, setTwoFactorCode] = useState<string>("")
	const [showTwoFactorCodeInput, setShowTwoFactorCodeInput] = useState<boolean>(false)
	const [useTwoFactorRecoveryKey, setUseTwoFactorRecoveryKey] = useState<boolean>(false)
	const [showPassword, setShowPassword] = useState<boolean>(false)
	const { t } = useTranslation()
	const navigate = useNavigate()
	const [loading, setLoading] = useState<boolean>(false)
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()
	const successToast = useSuccessToast()

	const forgot = useCallback(async () => {
		const inputResponse = await showInputDialog({
			title: t("login.dialogs.forgotPassword.title"),
			continueButtonText: t("login.dialogs.forgotPassword.continue"),
			value: "",
			autoFocusInput: true,
			placeholder: t("login.dialogs.forgotPassword.placeholder")
		})

		if (inputResponse.cancelled) {
			return
		}

		const toast = loadingToast()

		try {
			await sdk.api(3).user().password().forgot({ email: inputResponse.value.trim() })

			successToast(t("login.alerts.forgotPasswordSent", { email: inputResponse.value.trim() }))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast, successToast, t])

	const login = useCallback(async () => {
		if (loading || email.trim().length === 0 || password.length === 0) {
			return
		}

		setLoading(true)

		try {
			const authInfo = await worker.authInfo({ email: email.trim() })

			await setup({
				email: email.trim(),
				password: "anonymous",
				masterKeys: ["anonymous"],
				connectToSocket: true,
				metadataCache: true,
				twoFactorCode: undefined,
				publicKey: "anonymous",
				privateKey: "anonymous",
				apiKey: "anonymous",
				authVersion: authInfo.authVersion,
				baseFolderUUID: "anonymous",
				userId: 1
			})

			await sdk.login({
				email: email.trim(),
				password,
				twoFactorCode
			})

			await setup({
				...sdk.config
			})

			localStorage.setItem(
				"sdkConfig",
				JSON.stringify({
					...sdk.config,
					password: "redacted"
				})
			)

			localStorage.setItem("authed", "true")

			navigate({
				to: "/drive/$",
				replace: true,
				resetScroll: true,
				params: {
					_splat: sdk.config.baseFolderUUID!
				}
			})
		} catch (e) {
			if (e instanceof APIError) {
				if (e.code === "enter_2fa") {
					setTwoFactorCode("")
					setShowTwoFactorCodeInput(true)

					return
				}
			}

			setPassword("")
			setTwoFactorCode("")
			setShowTwoFactorCodeInput(false)
			setUseTwoFactorRecoveryKey(false)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			setLoading(false)
		}
	}, [email, password, twoFactorCode, navigate, loading, errorToast])

	return (
		<RequireUnauthed>
			<AuthContainer>
				<div className="flex flex-col gap-6">
					<div className="flex flex-col gap-2">
						<h1 className="text-2xl font-semibold">{t("login.header")}</h1>
						<p className="text-muted-foreground text-sm">
							{showTwoFactorCodeInput
								? useTwoFactorRecoveryKey
									? t("login.alerts.enter2FARecoveryKey")
									: t("login.alerts.enter2FA")
								: t("login.description")}
						</p>
					</div>
					<div className="flex flex-col gap-3">
						{showTwoFactorCodeInput ? (
							<>
								{useTwoFactorRecoveryKey ? (
									<>
										<Input
											id="twoFactorCode"
											required={true}
											autoFocus={true}
											type="text"
											placeholder={t("login.placeholders.normal.2faRecoveryKey")}
											value={twoFactorCode}
											onChange={e => setTwoFactorCode(e.target.value)}
											onKeyDown={e => {
												if (e.key === "Enter") {
													login()
												}
											}}
											autoCapitalize="none"
											autoComplete="none"
											autoCorrect="none"
										/>
										<Button
											className="w-full mt-4"
											type="submit"
											onClick={login}
											disabled={loading}
										>
											{loading ? <Loader className="animate-spin-medium" /> : t("login.buttons.login")}
										</Button>
									</>
								) : (
									<>
										<InputOTP
											maxLength={6}
											autoFocus={true}
											onKeyDown={e => {
												if (e.key === "Enter" && twoFactorCode.length === 6) {
													login()
												}
											}}
											value={twoFactorCode}
											onChange={setTwoFactorCode}
											render={({ slots }) => (
												<>
													<InputOTPGroup>
														{slots.slice(0, 3).map((slot, index) => (
															<InputOTPSlot
																key={index}
																{...slot}
															/>
														))}{" "}
													</InputOTPGroup>
													<InputOTPSeparator />
													<InputOTPGroup>
														{slots.slice(3).map((slot, index) => (
															<InputOTPSlot
																key={index}
																{...slot}
															/>
														))}
													</InputOTPGroup>
												</>
											)}
										/>
										<p
											className="text-muted-foreground text-sm underline mt-4 cursor-pointer"
											onClick={() => setUseTwoFactorRecoveryKey(true)}
										>
											{t("login.useTwoFactorRecoveryKey")}
										</p>
										<Button
											className="w-full mt-4"
											type="submit"
											onClick={login}
											disabled={loading}
										>
											{loading ? <Loader className="animate-spin-medium" /> : t("login.buttons.login")}
										</Button>
									</>
								)}
							</>
						) : (
							<>
								<Input
									id="email"
									placeholder={t("login.placeholders.example.email")}
									required={true}
									type="email"
									value={email}
									onChange={e => setEmail(e.target.value)}
									onKeyDown={e => {
										if (e.key === "Enter") {
											login()
										}
									}}
									autoCapitalize="none"
									autoComplete="none"
									autoCorrect="none"
								/>
								<div className="w-full flex flex-row">
									<Input
										id="password"
										required={true}
										type={showPassword ? "text" : "password"}
										placeholder={t("login.placeholders.normal.password")}
										value={password}
										onChange={e => setPassword(e.target.value)}
										withPasswordToggleIcon={true}
										onPasswordToggle={() => setShowPassword(prev => !prev)}
										onKeyDown={e => {
											if (e.key === "Enter") {
												login()
											}
										}}
										autoCapitalize="none"
										autoComplete="none"
										autoCorrect="none"
									/>
								</div>
								<Button
									className="w-full select-none mt-2"
									type="submit"
									onClick={login}
									disabled={loading}
								>
									{loading ? <Loader className="animate-spin-medium" /> : t("login.buttons.login")}
								</Button>
								<Link
									className="inline-block w-full text-center text-sm underline text-muted-foreground"
									to="/register"
									disabled={loading}
									draggable={false}
								>
									<Button
										className="w-full select-none"
										variant="outline"
										disabled={loading}
									>
										{t("login.buttons.createAccount")}
									</Button>
								</Link>
								<Link
									className="inline-block w-full text-center text-sm underline text-muted-foreground select-none"
									to="/login"
									disabled={loading}
									draggable={false}
									onClick={e => {
										e.preventDefault()

										forgot()
									}}
								>
									{t("login.buttons.forgotPassword")}
								</Link>
							</>
						)}
					</div>
				</div>
			</AuthContainer>
		</RequireUnauthed>
	)
}
