import { memo } from "react"
import { Link } from "@tanstack/react-router"
import useSDKConfig from "@/hooks/useSDKConfig"
import { CloudIcon, TimerIcon } from "lucide-react"
import useRouteParent from "@/hooks/useRouteParent"

export const SideBar = memo(() => {
	const sdkConfig = useSDKConfig()
	const routeParent = useRouteParent()

	console.log(routeParent)

	return (
		<div className="w-full h-screen">
			<div className="h-14 w-full border-b flex flex-row items-center pl-3 pr-3">
				<Link
					to="/drive/$"
					params={{
						_splat: sdkConfig.baseFolderUUID
					}}
				>
					<img
						src="https://drive.filen.io/static/media/light_logo.9f8ed143e54adb31009008c527f52c95.svg"
						className="w-8 h-8"
					/>
				</Link>
			</div>
			<div className="h-[calc(100vh-3.5rem)]">
				<div className="flex flex-row pl-3 pr-3 pt-3">
					<Link
						to="/drive/$"
						params={{
							_splat: sdkConfig.baseFolderUUID
						}}
						className={`flex flex-row gap-2 w-full hover:bg-accent p-2 rounded-lg hover:text-primary cursor-pointer ${routeParent === sdkConfig.baseFolderUUID ? "bg-accent text-primary" : "bg-transparent text-muted-foreground"}`}
					>
						<CloudIcon />
						<p>Cloud Drive</p>
					</Link>
				</div>
				<div className="flex flex-row pl-3 pr-3 pt-3">
					<Link
						to="/drive/$"
						params={{
							_splat: "recents"
						}}
						className={`flex flex-row gap-2 w-full hover:bg-accent p-2 rounded-lg hover:text-primary cursor-pointer ${routeParent === "recents" ? "bg-accent text-primary" : "bg-transparent text-muted-foreground"}`}
					>
						<TimerIcon />
						<p>Recents</p>
					</Link>
				</div>
			</div>
		</div>
	)
})

export default SideBar
