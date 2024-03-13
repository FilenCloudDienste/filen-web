import { memo } from "react"
import Button from "./button"
import useSDKConfig from "@/hooks/useSDKConfig"
import { IS_DESKTOP } from "@/constants"

export const SideBar = memo(() => {
	const sdkConfig = useSDKConfig()

	return (
		<div className="w-full flex flex-col h-full gap-2 py-3 bg-secondary border-r select-none items-center overflow-x-hidden overflow-y-auto">
			{IS_DESKTOP && <Button id="syncs" />}
			<Button id={sdkConfig.baseFolderUUID} />
			<Button id="transfers" />
			<Button id="notes" />
			<Button id="chats" />
			<Button id="contacts" />
			<Button id="settings" />
		</div>
	)
})

export default SideBar
