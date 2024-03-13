import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router"
import AuthContainer from "@/components/authContainer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCallback, useState } from "react"
import sdk from "@/lib/sdk"
import { APIError } from "@filen/sdk"
import { useToast } from "@/components/ui/use-toast"
import worker from "@/lib/worker"
import { useTranslation } from "react-i18next"
import RequireUnauthed from "@/components/requireUnauthed"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp"
import { EyeIcon } from "lucide-react"

export const Route = createLazyFileRoute("/login")({
	component: Login
})

export function Login() {
	const [email, setEmail] = useState<string>("")
	const [password, setPassword] = useState<string>("")
	const [twoFactorCode, setTwoFactorCode] = useState<string>("")
	const [showTwoFactorCodeInput, setShowTwoFactorCodeInput] = useState<boolean>(false)
	const [useTwoFactorRecoveryKey, setUseTwoFactorRecoveryKey] = useState<boolean>(false)
	const [showPassword, setShowPassword] = useState<boolean>(false)
	const { toast } = useToast()
	const { t } = useTranslation()
	const navigate = useNavigate()

	const login = useCallback(async () => {
		try {
			await sdk.login({
				email,
				password,
				twoFactorCode
			})

			await worker.initializeSDK({ config: sdk.config })

			localStorage.setItem("sdkConfig", JSON.stringify(sdk.config))
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

			toast({
				variant: "destructive",
				description: (e as Error).message
			})
		}
	}, [email, password, twoFactorCode, toast, navigate])

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
										/>
										<Button
											className="w-full mt-4"
											type="submit"
											onClick={login}
										>
											{t("login.buttons.login")}
										</Button>
									</>
								) : (
									<>
										<InputOTP
											maxLength={6}
											autoFocus={true}
											onKeyDown={e => {
												if (e.key === "Enter") {
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
										>
											{t("login.buttons.login")}
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
								/>
								<div className="w-full flex flex-row">
									<Input
										id="password"
										required={true}
										type={showPassword ? "text" : "password"}
										placeholder={t("login.placeholders.normal.password")}
										value={password}
										onChange={e => setPassword(e.target.value)}
										onKeyDown={e => {
											if (e.key === "Enter") {
												login()
											}
										}}
									/>
									<div className="flex flex-row absolute w-80 sm:w-[420px] h-10 ml-80 sm:ml-[420px]">
										<div className="flex flex-row items-center h-full w-full ml-[-95px]">
											<EyeIcon
												size={20}
												className="cursor-pointer"
												onClick={() => setShowPassword(prev => !prev)}
											/>
										</div>
									</div>
								</div>
								<Button
									className="w-full select-none"
									type="submit"
									onClick={login}
								>
									{t("login.buttons.login")}
								</Button>
								<Link
									className="inline-block w-full text-center text-sm underline text-muted-foreground"
									to="/login"
								>
									<Button
										className="w-full select-none"
										variant="outline"
									>
										{t("login.buttons.createAccount")}
									</Button>
								</Link>
								<Link
									className="inline-block w-full text-center text-sm underline text-muted-foreground select-none"
									to="/login"
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
