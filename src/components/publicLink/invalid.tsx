import { memo } from "react"
import { useTranslation } from "react-i18next"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import { Link } from "@tanstack/react-router"
import { Button } from "../ui/button"
import { ArrowRight } from "lucide-react"
import { fileNameToSVGIcon } from "@/assets/fileExtensionIcons"

export const Invalid = memo(() => {
	const { t } = useTranslation()
	const urlState = usePublicLinkURLState()

	return (
		<div className="flex flex-col w-full h-full items-center justify-center">
			{!urlState.embed && !urlState.chatEmbed && (
				<img
					src={fileNameToSVGIcon("file")}
					className="shrink-0 object-cover w-24 h-24 mb-6"
					draggable={false}
				/>
			)}
			<div className="flex flex-col max-w-60 text-center items-center justify-center">
				<p className="text-xl text-center">{t("publicLink.invalid")}</p>
				<p className="text-muted-foreground text-center">{t("publicLink.invalidInfo")}</p>
			</div>
			{!urlState.embed && !urlState.chatEmbed && (
				<Link to="/">
					<Button
						variant="secondary"
						className="items-center gap-2 mt-8"
					>
						{t("publicLink.back")}
						<ArrowRight size={16} />
					</Button>
				</Link>
			)}
		</div>
	)
})

export default Invalid
