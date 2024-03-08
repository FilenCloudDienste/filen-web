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

export const Route = createLazyFileRoute("/login")({
	component: Login
})

function Login() {
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [twoFactorCode, setTwoFactorCode] = useState("")
	const [showTwoFactorCodeInput, setShowTwoFactorCodeInput] = useState(false)
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

					toast({
						variant: "default",
						description: t("login.alerts.enter2FA")
					})

					return
				}
			}

			setPassword("")
			setTwoFactorCode("")
			setShowTwoFactorCodeInput(false)

			toast({
				variant: "destructive",
				description: (e as Error).message
			})
		}
	}, [email, password, twoFactorCode, toast, t, navigate])

	return (
		<RequireUnauthed>
			<AuthContainer>
				<div className="flex flex-col gap-6">
					<div className="flex flex-col gap-2">
						<h1 className="text-2xl font-semibold">{t("login.header")}</h1>
						<p className="text-muted-foreground text-sm">{t("login.description")}</p>
					</div>
					<div className="flex flex-col gap-3">
						<Input
							id="email"
							placeholder={t("login.placeholders.example.email")}
							required={true}
							type="email"
							value={email}
							onChange={e => setEmail(e.target.value)}
						/>
						<Input
							id="password"
							required={true}
							type="password"
							placeholder={t("login.placeholders.normal.password")}
							value={password}
							onChange={e => setPassword(e.target.value)}
						/>
						{showTwoFactorCodeInput && (
							<Input
								id="twoFactorCode"
								required={false}
								type="text"
								placeholder={t("login.placeholders.normal.2faCode")}
								value={twoFactorCode}
								onChange={e => setTwoFactorCode(e.target.value)}
							/>
						)}
						<Button
							className="w-full"
							type="submit"
							onClick={login}
						>
							{t("login.buttons.login")}
						</Button>
						<Link to="/login">
							<Button
								className="w-full"
								variant="outline"
							>
								{t("login.buttons.createAccount")}
							</Button>
						</Link>
						<Link
							className="inline-block w-full text-center text-sm underline text-muted-foreground"
							to="/login"
						>
							{t("login.buttons.forgotPassword")}
						</Link>
					</div>
				</div>
			</AuthContainer>
		</RequireUnauthed>
	)
}
