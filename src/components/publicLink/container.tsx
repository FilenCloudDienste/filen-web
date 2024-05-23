import { memo } from "react"
import { Link } from "@tanstack/react-router"
import { useLocalStorage } from "@uidotdev/usehooks"
import useIsMobile from "@/hooks/useIsMobile"
import { IS_DESKTOP } from "@/constants"
import { Loader, Shield, Lock, EyeOff, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import { cn } from "@/lib/utils"

export const Container = memo(({ children, loading }: { children: React.ReactNode; loading: boolean }) => {
	const [authed] = useLocalStorage<boolean>("authed", false)
	const isMobile = useIsMobile()
	const urlState = usePublicLinkURLState()

	return (
		<div className={cn("flex flex-row w-screen h-screen select-none", urlState.color && `bg-[#${urlState.color}]`)}>
			{!isMobile && !IS_DESKTOP && !urlState.embed && (
				<div className="flex flex-col w-[350px] border-r p-10 justify-center shrink-0 z-50 bg-background dragselect-start-allowed">
					<div className="absolute top-10 left-10">
						<Link
							to={authed ? "/" : "login"}
							className="flex shrink-0 flex-row items-center gap-2"
							draggable={false}
						>
							<img
								src="https://drive.filen.io/static/media/light_logo.9f8ed143e54adb31009008c527f52c95.svg"
								className="w-6 h-6"
								draggable={false}
							/>
							<p className="font-medium text-2xl">Filen</p>
						</Link>
					</div>
					<div className="flex flex-col">
						<p className="text-muted-foreground uppercase">We are Filen</p>
						<p className="text-3xl">Private and secure cloud storage</p>
					</div>
					<div className="flex flex-col mt-8 gap-3">
						<div className="flex flex-row gap-2">
							<Shield size={22} />
							<p>Privacy by design</p>
						</div>
						<div className="flex flex-row gap-2">
							<Lock size={22} />
							<p>End-to-end encryption</p>
						</div>
						<div className="flex flex-row gap-2">
							<EyeOff size={22} />
							<p>Zero knowledge technology</p>
						</div>
					</div>
					<Link
						to={authed ? "/" : "login"}
						className="shrink-0 w-full mt-8"
						draggable={false}
					>
						<Button className="w-full">10 GB for free</Button>
					</Link>
				</div>
			)}
			<div className="flex flex-row grow bg-muted/40">
				{!urlState.embed && (
					<div className="absolute bottom-4 right-4 z-50">
						<Button
							variant="secondary"
							className="items-center gap-2 shadow-sm"
						>
							<AlertCircle size={16} />
							Report abuse
						</Button>
					</div>
				)}
				{loading ? (
					<div className="flex flex-col w-full h-full items-center justify-center">
						<Loader
							size={32}
							className="animate-spin-medium"
						/>
					</div>
				) : (
					children
				)}
			</div>
		</div>
	)
})

export default Container
