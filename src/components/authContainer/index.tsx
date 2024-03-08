import { memo } from "react"
import { IS_DESKTOP } from "@/constants"

export const AuthContainer = memo(({ children }: { children: React.ReactNode }) => {
	return (
		<div className={"flex flex-col w-screen h-screen p-0 " + (!IS_DESKTOP ? "lg:p-32" : "")}>
			<div className="flex flex-row w-full h-full lg:rounded-lg border shadow-xl">
				<div className="bg-zinc-900 h-full w-1/2 hidden border-r rounded-l-lg lg:flex p-10 flex-col">
					<div className="flex flex-row items-center text-2xl font-bold gap-2">
						<img
							src="https://drive.filen.io/static/media/light_logo.9f8ed143e54adb31009008c527f52c95.svg"
							className="w-8 h-8"
						/>
						Filen
					</div>
				</div>
				<div className="w-full lg:w-1/2 h-full flex-col justify-center items-center flex p-5 overflow-y-auto">
					<div className="text-center flex flex-col gap-6 h-[320px]">{children}</div>
				</div>
			</div>
		</div>
	)
})

export default AuthContainer
