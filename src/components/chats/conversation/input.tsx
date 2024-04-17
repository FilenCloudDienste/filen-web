import { memo, useState, useCallback, useMemo, useRef, useEffect } from "react"
import { withReact, ReactEditor, Slate, Editable } from "slate-react"
import { withHistory, type HistoryEditor } from "slate-history"
import { createEditor, Editor, type BaseEditor, Transforms } from "slate"
import Icon from "@/components/icon"
import worker from "@/lib/worker"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useChatsStore } from "@/stores/chats.store"
import { v4 as uuidv4 } from "uuid"
import useSDKConfig from "@/hooks/useSDKConfig"
import { useTranslation } from "react-i18next"
import Typing from "./typing"
import eventEmitter from "@/lib/eventEmitter"
import useErrorToast from "@/hooks/useErrorToast"
import useElementDimensions from "@/hooks/useElementDimensions"

export type CustomElement = { type: "paragraph"; children: CustomText[] }
export type CustomText = { text: string }

declare module "slate" {
	interface CustomTypes {
		Editor: BaseEditor & ReactEditor
		Element: CustomElement
		Text: CustomText
	}
}

export const Input = memo(({ conversation }: { conversation: ChatConversation }) => {
	const [editor] = useState<BaseEditor & ReactEditor & HistoryEditor>(() => withReact(withHistory(createEditor())))
	const { setMessages, setFailedMessages, setEditUUID, setReplyMessage, replyMessage, editUUID, messages } = useChatsStore()
	const { userId } = useSDKConfig()
	const { t } = useTranslation()
	const typingEventTimeout = useRef<ReturnType<typeof setTimeout>>()
	const typingEventEmitTimeout = useRef<number>(0)
	const errorToast = useErrorToast()
	const inputContainerDimensions = useElementDimensions("chat-input-container")

	const me = useMemo(() => {
		return conversation.participants.filter(participant => participant.userId === userId)[0]
	}, [conversation.participants, userId])

	const getEditorText = useCallback((): string => {
		if (!editor) {
			return ""
		}

		let message = ""

		try {
			message = (editor.children as CustomElement[])
				.map(child => (child.children[0].text.length === 0 ? "\n" : child.children[0].text))
				.join("\n")
				.trim()
		} catch (e) {
			console.error(e)
		}

		return message
	}, [editor])

	const focusEditor = useCallback((): void => {
		if (!editor) {
			return
		}

		ReactEditor.focus(editor)
		Transforms.select(editor, Editor.end(editor, []))
	}, [editor])

	const clearEditor = useCallback((): void => {
		if (!editor) {
			return
		}

		Transforms.delete(editor, {
			at: {
				anchor: Editor.start(editor, []),
				focus: Editor.end(editor, [])
			}
		})
	}, [editor])

	const insertText = useCallback(
		(text: string): void => {
			if (!editor || text.length === 0) {
				return
			}

			focusEditor()

			Transforms.insertText(editor, text)
			Transforms.select(editor, Editor.end(editor, []))

			focusEditor()
		},
		[editor, focusEditor]
	)

	const emitTypingEvent = useCallback((): void => {
		const now = Date.now()
		let didEmit = false

		if (typingEventEmitTimeout.current > now) {
			return
		}

		typingEventEmitTimeout.current = Date.now() + 2500

		clearTimeout(typingEventTimeout.current)

		worker
			.sendChatTyping({ conversation: conversation.uuid, type: "down" })
			.then(() => (didEmit = true))
			.catch(console.error)

		typingEventTimeout.current = setTimeout(() => {
			if (!didEmit) {
				return
			}

			worker.sendChatTyping({ conversation: conversation.uuid, type: "up" }).catch(console.error)
		}, 5000)
	}, [conversation.uuid])

	const findLastMessageToEdit = useCallback((): void => {
		const lastMessagesFromUser = messages.filter(m => m.senderId === userId).sort((a, b) => b.sentTimestamp - a.sentTimestamp)

		if (lastMessagesFromUser.length <= 0) {
			return
		}

		setEditUUID(lastMessagesFromUser[0].uuid)
		setReplyMessage(null)
		clearEditor()
		insertText(lastMessagesFromUser[0].message)
		setTimeout(focusEditor, 100)
	}, [messages, userId, setEditUUID, clearEditor, focusEditor, insertText, setReplyMessage])

	const sendMessage = useCallback(async (): Promise<void> => {
		const content = getEditorText()

		if (content.length === 0) {
			return
		}

		const uuid = uuidv4()

		try {
			setMessages(prev => [
				...prev.filter(m => m.uuid !== uuid),
				{
					conversation: conversation.uuid,
					uuid,
					senderId: me.userId,
					senderEmail: me.email,
					senderAvatar: me.avatar,
					senderNickName: me.nickName,
					message: content,
					replyTo: replyMessage
						? {
								uuid: replyMessage.uuid,
								senderId: replyMessage.senderId,
								senderEmail: replyMessage.senderEmail,
								senderAvatar: replyMessage.senderAvatar ?? "",
								senderNickName: replyMessage.senderNickName,
								message: replyMessage.message
							}
						: {
								uuid: "",
								senderId: 0,
								senderEmail: "",
								senderAvatar: "",
								senderNickName: "",
								message: ""
							},
					embedDisabled: false,
					edited: false,
					editedTimestamp: 0,
					sentTimestamp: Date.now()
				}
			])

			eventEmitter.emit("chatMarkAsRead")

			clearTimeout(typingEventTimeout.current)
			clearEditor()
			focusEditor()
			setEditUUID("")
			setReplyMessage(null)

			await Promise.all([
				worker.sendChatTyping({ conversation: conversation.uuid, type: "up" }),
				worker.sendChatMessage({
					conversation: conversation.uuid,
					message: content,
					replyTo: replyMessage ? replyMessage.uuid : "",
					uuid
				})
			])
		} catch (e) {
			console.error(e)

			setFailedMessages(prev => [...prev, uuid])

			const toast = errorToast((e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			setEditUUID("")
			setReplyMessage(null)
			clearEditor()
			focusEditor()
		}
	}, [
		setEditUUID,
		focusEditor,
		clearEditor,
		setReplyMessage,
		setFailedMessages,
		setMessages,
		conversation.uuid,
		me,
		getEditorText,
		replyMessage,
		errorToast
	])

	const editMessage = useCallback(async (): Promise<void> => {
		if (editUUID.length === 0) {
			return
		}

		const content = getEditorText()

		if (content.length === 0) {
			return
		}

		try {
			setMessages(prev => prev.map(m => (m.uuid === editUUID ? { ...m, message: content } : m)))

			clearTimeout(typingEventTimeout.current)
			clearEditor()
			focusEditor()
			setEditUUID("")
			setReplyMessage(null)

			await Promise.all([
				worker.sendChatTyping({ conversation: conversation.uuid, type: "up" }),
				worker.chatEditMessage({
					conversation: conversation.uuid,
					message: content,
					uuid: editUUID
				})
			])
		} catch (e) {
			console.error(e)

			setFailedMessages(prev => [...prev, editUUID])

			const toast = errorToast((e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			setEditUUID("")
			setReplyMessage(null)
			clearEditor()
			focusEditor()
		}
	}, [
		setEditUUID,
		focusEditor,
		clearEditor,
		setReplyMessage,
		setFailedMessages,
		setMessages,
		conversation.uuid,
		getEditorText,
		editUUID,
		errorToast
	])

	const onKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>): void => {
			emitTypingEvent()

			if (e.key === "Enter" && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
				e.preventDefault()

				if (editUUID.length === 0) {
					sendMessage()
				} else {
					editMessage()
				}

				return
			}

			if (e.key === "ArrowUp" && getEditorText().length === 0) {
				e.preventDefault()

				findLastMessageToEdit()

				return
			}
		},
		[emitTypingEvent, sendMessage, findLastMessageToEdit, getEditorText, editUUID, editMessage]
	)

	const onKeyUp = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>): void => {
			if (replyMessage && e.key === "Escape") {
				setReplyMessage(null)
			}

			if (editUUID.length > 0 && e.key === "Escape") {
				setEditUUID("")
			}
		},
		[setEditUUID, setReplyMessage, replyMessage, editUUID]
	)

	useEffect(() => {
		return () => {
			if (typingEventEmitTimeout.current > 0) {
				clearTimeout(typingEventTimeout.current)

				worker.sendChatTyping({ conversation: conversation.uuid, type: "up" }).catch(console.error)
			}
		}
	}, [conversation.uuid])

	useEffect(() => {
		const chatInputWriteTextListener = eventEmitter.on("chatInputWriteText", (text: string) => {
			clearEditor()
			insertText(text)
			setTimeout(focusEditor, 100)
		})

		const chatInputFocusListener = eventEmitter.on("chatInputFocus", () => {
			focusEditor()
			setTimeout(focusEditor, 100)
		})

		return () => {
			chatInputWriteTextListener.remove()
			chatInputFocusListener.remove()
		}
	}, [clearEditor, insertText, focusEditor])

	return (
		<div
			className="flex flex-col w-full h-auto px-4 pt-0 pb-2 gap-1"
			id="chat-input-container"
		>
			<div className="absolute z-50">
				<Icon
					name="plus-circle"
					size={24}
					className="cursor-pointer mt-[12px] ml-[10px] text-muted-foreground hover:text-foreground"
				/>
			</div>
			{replyMessage && (
				<div
					className="absolute mt-[-30px]"
					style={{
						width: inputContainerDimensions.width - 32
					}}
				>
					<div className="flex flex-row bg-secondary p-1 px-2 pb-5 rounded-t-lg items-center gap-4 justify-between">
						<div className="flex flex-row gap-1">
							<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground">{t("chats.input.replyingTo")}</p>
							<p className="line-clamp-1 text-ellipsis break-all">
								{replyMessage.senderNickName.length > 0 ? replyMessage.senderNickName : replyMessage.senderEmail}
							</p>
						</div>
						<Icon
							name="x-circle"
							size={16}
							className="cursor-pointer"
							onClick={() => setReplyMessage(null)}
						/>
					</div>
				</div>
			)}
			<Slate
				editor={editor}
				initialValue={[
					{
						type: "paragraph",
						children: [
							{
								text: ""
							}
						]
					}
				]}
			>
				<Editable
					onKeyDown={onKeyDown}
					onKeyUp={onKeyUp}
					placeholder={t("chats.input.placeholder")}
					className="slate-editor z-10 border rounded-lg shadow-sm bg-background w-full min-h-10 max-h-[40vh] overflow-y-auto overflow-x-hidden pl-11 pr-11 py-3 break-all outline-none focus:outline-none active:outline-none hover:outline-none"
					autoCorrect="none"
					autoCapitalize="none"
					autoFocus={false}
					autoComplete="none"
					spellCheck={false}
					maxLength={2000}
				/>
			</Slate>
			<Typing conversation={conversation} />
		</div>
	)
})

export default Input
