import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import AuthContainer from "@/components/authContainer"
import Input from "@/components/input"
import { Button } from "@/components/ui/button"
import { useCallback, useState, useMemo } from "react"
import { getSDK } from "@/lib/sdk"
import { useTranslation } from "react-i18next"
import RequireUnauthed from "@/components/requireUnauthed"
import { Loader, XCircle, CheckCircle } from "lucide-react"
import { setup } from "@/lib/setup"
import useErrorToast from "@/hooks/useErrorToast"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { showInputDialog } from "@/components/dialogs/input"
import useSuccessToast from "@/hooks/useSuccessToast"
import useLoadingToast from "@/hooks/useLoadingToast"

export const Route = createFileRoute("/register")({
	component: Register
})

export function ratePassword(password: string): {
	strength: "weak" | "normal" | "strong" | "best"
	uppercase: boolean
	lowercase: boolean
	specialChars: boolean
	length: boolean
} {
	const hasUppercase = /[A-Z]/.test(password)
	const hasLowercase = /[a-z]/.test(password)
	const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password)
	const length = password.length

	let strength: "weak" | "normal" | "strong" | "best" = "weak"

	if (length >= 10 && hasUppercase && hasLowercase && hasSpecialChars) {
		if (length >= 16) {
			strength = "best"
		} else {
			strength = "strong"
		}
	} else if (length >= 10 && ((hasUppercase && hasLowercase) || (hasUppercase && hasSpecialChars) || (hasLowercase && hasSpecialChars))) {
		strength = "normal"
	}

	return {
		strength,
		uppercase: hasUppercase,
		lowercase: hasLowercase,
		specialChars: hasSpecialChars,
		length: length >= 10
	}
}

export function Register() {
	const [email, setEmail] = useState<string>("")
	const [password, setPassword] = useState<string>("")
	const [confirmPassword, setConfirmPassword] = useState<string>("")
	const [showPassword, setShowPassword] = useState<boolean>(false)
	const { t } = useTranslation()
	const [loading, setLoading] = useState<boolean>(false)
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()
	const successToast = useSuccessToast()
	const navigate = useNavigate()

	const passwordStrength = useMemo(() => {
		return ratePassword(password)
	}, [password])

	const resend = useCallback(async () => {
		const inputResponse = await showInputDialog({
			title: t("register.dialogs.confirmationSend.title"),
			continueButtonText: t("register.dialogs.confirmationSend.continue"),
			value: "",
			autoFocusInput: true,
			placeholder: t("register.dialogs.confirmationSend.placeholder")
		})

		if (inputResponse.cancelled || inputResponse.value.trim().length === 0) {
			return
		}

		const toast = loadingToast()

		try {
			await getSDK().api(3).confirmationSend({ email: inputResponse.value.trim() })

			successToast(t("register.alerts.confirmationSent", { email: inputResponse.value.trim() }))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast, successToast, t])

	const register = useCallback(async () => {
		if (loading || email.trim().length === 0 || password.length === 0 || confirmPassword.length === 0) {
			return
		}

		if (passwordStrength.strength === "weak") {
			errorToast(t("register.alerts.passwordWeak"))

			return
		}

		if (password !== confirmPassword) {
			errorToast(t("register.alerts.passwordsNotMatching"))

			return
		}

		setLoading(true)

		try {
			await setup(
				{
					email: email.trim(),
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
				},
				false
			)

			const salt = await getSDK().crypto().utils.generateRandomString({ length: 256 })
			const derived = await getSDK().crypto().utils.generatePasswordAndMasterKeyBasedOnAuthVersion({
				rawPassword: password,
				salt,
				authVersion: 2
			})

			await getSDK().api(3).register({
				email,
				password: derived.derivedPassword,
				salt,
				authVersion: 2
			})

			await showConfirmDialog({
				title: t("register.alerts.success.title"),
				continueButtonText: t("register.alerts.success.continue"),
				description: t("register.alerts.success.description", {
					email
				}),
				continueButtonVariant: "default"
			})

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
	}, [errorToast, passwordStrength.strength, t, email, password, confirmPassword, loading, navigate])

	const onKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				register()
			}
		},
		[register]
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
						<h1 className="text-2xl font-semibold">{t("register.header")}</h1>
						<p className="text-muted-foreground text-sm">{t("register.description")}</p>
					</div>
					<div className="flex flex-col gap-3">
						<Input
							id="email"
							placeholder={t("register.placeholders.example.email")}
							required={true}
							type="email"
							value={email}
							onChange={e => setEmail(e.target.value)}
							onKeyDown={onKeyDown}
							autoCapitalize="none"
							autoComplete="none"
							autoCorrect="none"
						/>
						<div className="w-full flex flex-row">
							<Input
								id="password"
								required={true}
								type={showPassword ? "text" : "password"}
								placeholder={t("register.placeholders.normal.password")}
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
								placeholder={t("register.placeholders.normal.confirmPassword")}
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
							className="w-full select-none mt-2"
							type="submit"
							onClick={register}
							disabled={loading}
						>
							{loading ? <Loader className="animate-spin-medium" /> : t("register.buttons.register")}
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
								{t("register.buttons.login")}
							</Button>
						</Link>
						<Link
							className="inline-block w-full text-center text-sm underline text-muted-foreground select-none"
							to="/register"
							disabled={loading}
							draggable={false}
							onClick={e => {
								e.preventDefault()

								resend()
							}}
						>
							{t("register.buttons.resendConfirmation")}
						</Link>
					</div>
				</div>
			</AuthContainer>
		</RequireUnauthed>
	)
}
