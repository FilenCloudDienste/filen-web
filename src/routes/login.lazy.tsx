import { createLazyFileRoute } from "@tanstack/react-router"
import AuthContainer from "@/components/authContainer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCallback, useState } from "react"
import sdk from "@/lib/sdk"
import { APIError } from "@filen/sdk"
import { useToast } from "@/components/ui/use-toast"

export const Route = createLazyFileRoute("/login")({
	component: Login
})

function Login() {
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [twoFactorCode, setTwoFactorCode] = useState("")
	const [showTwoFactorCodeInput, setShowTwoFactorCodeInput] = useState(false)
	const { toast } = useToast()

	const login = useCallback(async () => {
		try {
			await sdk.login({
				email,
				password,
				twoFactorCode
			})

			console.log("logged in")

			console.log(sdk.config)
		} catch (e) {
			setEmail("")
			setPassword("")
			setTwoFactorCode("")
			setShowTwoFactorCodeInput(false)

			if (e instanceof APIError) {
				if (e.code === "enter_2fa") {
					setShowTwoFactorCodeInput(true)

					return
				}
			}

			toast({
				variant: "destructive",
				description: (e as Error).message
			})
		}
	}, [email, password, twoFactorCode, toast])

	return (
		<AuthContainer>
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold">Login</h1>
				<p className="text-muted-foreground text-sm">Enter your email below to login to your account</p>
			</div>
			<div className="flex flex-col gap-3">
				<Input
					id="email"
					placeholder="me@example.com"
					required={true}
					type="email"
					value={email}
					onChange={e => setEmail(e.target.value)}
				/>
				<Input
					id="password"
					required={true}
					type="password"
					placeholder="Password"
					value={password}
					onChange={e => setPassword(e.target.value)}
				/>
				{showTwoFactorCodeInput && (
					<Input
						id="twoFactorCode"
						required={false}
						type="text"
						placeholder="2FA OTP code"
						value={twoFactorCode}
						onChange={e => setTwoFactorCode(e.target.value)}
					/>
				)}
				<Button
					className="w-full"
					type="submit"
					onClick={login}
				>
					Login
				</Button>
				<Button
					className="w-full"
					variant="outline"
				>
					Create an account
				</Button>
				<a
					className="inline-block w-full text-center text-sm underline text-muted-foreground"
					href="#"
				>
					Forgot your password?
				</a>
			</div>
		</AuthContainer>
	)
}
