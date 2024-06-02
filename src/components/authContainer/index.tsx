import { memo } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

export const AuthContainer = memo(({ children }: { children: React.ReactNode }) => {
	const { t } = useTranslation()

	return (
		<div className="flex h-screen w-screen flex-col overflow-y-auto overflow-x-hidden">
			<Link
				to="/login"
				className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20 items-center gap-2"
				draggable={false}
			>
				<img
					src="https://drive.filen.io/static/media/light_logo.9f8ed143e54adb31009008c527f52c95.svg"
					className="w-7 h-7"
					draggable={false}
				/>
				<p className="font-medium text-2xl">Filen</p>
			</Link>
			<div className="flex h-full flex-col items-center justify-center">
				<div className="flex flex-col p-8 w-80 sm:w-[420px]">{children}</div>
			</div>
			<div className="flex shrink-0 flex-row justify-center items-center py-10 gap-5">
				<a
					href="https://filen.io/terms"
					className="underline text-muted-foreground text-sm select-none"
					draggable={false}
					target="_blank"
				>
					{t("auth.footer.tos")}
				</a>
				<a
					href="https://filen.io/privacy"
					className="underline text-muted-foreground text-sm select-none"
					draggable={false}
					target="_blank"
				>
					{t("auth.footer.privacy")}
				</a>
			</div>
		</div>
	)
})

export default AuthContainer
