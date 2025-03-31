import { memo, useState, useCallback, useMemo, useRef, useEffect } from "react"
import { withReact, ReactEditor, Slate, Editable } from "slate-react"
import { withHistory, type HistoryEditor } from "slate-history"
import { createEditor, Editor, type BaseEditor, Transforms } from "slate"
import { PlusCircle, XCircle, Smile } from "lucide-react"
import worker from "@/lib/worker"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useChatsStore } from "@/stores/chats.store"
import { v4 as uuidv4 } from "uuid"
import useSDKConfig from "@/hooks/useSDKConfig"
import { useTranslation } from "react-i18next"
import Typing from "./typing"
import eventEmitter from "@/lib/eventEmitter"
import useErrorToast from "@/hooks/useErrorToast"
import { findClosestIndex, cn, promiseAllChunked } from "@/lib/utils"
import useElementDimensions from "@/hooks/useElementDimensions"
import Avatar from "@/components/avatar"
import { SearchIndex } from "emoji-mart"
import { EmojiElement } from "./message/utils"
import { custom as customEmojis } from "../customEmojis"
import emojiData from "@emoji-mart/data"
import EmojiPicker from "@emoji-mart/react"
import memoize from "lodash/memoize"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useTheme } from "@/providers/themeProvider"
import { type DriveCloudItem } from "@/components/drive"
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { selectDriveItem } from "@/components/dialogs/selectDriveItem"
import useLoadingToast from "@/hooks/useLoadingToast"
import { PUBLIC_LINK_BASE_URL } from "@/constants"
import useIsMobile from "@/hooks/useIsMobile"
import { MAX_CHAT_SIZE } from "@filen/sdk"

export type CustomElement = { type: "paragraph"; children: CustomText[] }
export type CustomText = { text: string }

declare module "slate" {
	interface CustomTypes {
		Editor: BaseEditor & ReactEditor
		Element: CustomElement
		Text: CustomText
	}
}

export const searchEmojiIndex = memoize((query: string): Promise<{ skins?: { src: string; shortcodes: string }[] }[]> => {
	return SearchIndex.search(query)
})

export const Input = memo(({ conversation }: { conversation: ChatConversation }) => {
	const [editor] = useState<BaseEditor & ReactEditor & HistoryEditor>(() => withReact(withHistory(createEditor())))
	const {
		setMessages,
		setFailedMessages,
		setEditUUID,
		setReplyMessage,
		replyMessage,
		editUUID,
		messages,
		setSelectedConversation,
		setConversations
	} = useChatsStore(
		useCallback(
			state => ({
				setMessages: state.setMessages,
				setFailedMessages: state.setFailedMessages,
				setEditUUID: state.setEditUUID,
				setReplyMessage: state.setReplyMessage,
				replyMessage: state.replyMessage,
				editUUID: state.editUUID,
				messages: state.messages,
				setSelectedConversation: state.setSelectedConversation,
				setConversations: state.setConversations
			}),
			[]
		)
	)
	const { userId } = useSDKConfig()
	const { t } = useTranslation()
	const typingEventTimeout = useRef<ReturnType<typeof setTimeout>>()
	const typingEventEmitTimeout = useRef<number>(0)
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()
	const inputContainerDimensions = useElementDimensions("chat-input-container")
	const [showMentionSuggestions, setShowMentionSuggestions] = useState<boolean>(false)
	const [showEmojiSuggestions, setShowEmojiSuggestions] = useState<boolean>(false)
	const [mentionsSuggestionsText, setMentionsSuggestionsText] = useState<string>("")
	const [mentionsSuggestionsIndex, setMentionsSuggestionsIndex] = useState<number>(0)
	const [emojisSuggestionsText, setEmojisSuggestionsText] = useState<string>("")
	const [emojisSuggestionsIndex, setEmojisSuggestionsIndex] = useState<number>(0)
	const [emojisSuggestionsShortCodes, setEmojisSuggestionsShortCodes] = useState<string[]>([])
	const theme = useTheme()
	const focusEditorTimeout = useRef<ReturnType<typeof setTimeout>>()
	const isMobile = useIsMobile()

	const me = useMemo(() => {
		return conversation.participants.filter(participant => participant.userId === userId)[0]
	}, [conversation.participants, userId])

	const filteredMentions = useMemo(() => {
		const search = (mentionsSuggestionsText.startsWith("@") ? mentionsSuggestionsText.slice(1) : mentionsSuggestionsText).toLowerCase()

		return conversation.participants
			.filter(p => p.nickName.toLowerCase().includes(search) || p.email.toLowerCase().includes(search))
			.slice(0, 10)
	}, [mentionsSuggestionsText, conversation.participants])

	const getEditorText = useCallback((): string => {
		if (!editor) {
			return ""
		}

		let message = ""

		try {
			message = (editor.children as CustomElement[])
				.map(child => (child.children[0] ? (child.children[0].text.length === 0 ? "\n" : child.children[0].text) : ""))
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

	const insertEmoji = useCallback(
		(shortCode: string): void => {
			if (!editor || shortCode.length === 0) {
				return
			}

			const text = getEditorText()

			focusEditor()

			Transforms.insertText(editor, text.length === 0 ? shortCode + " " : (text.endsWith(" ") ? "" : " ") + shortCode + " ")
			Transforms.select(editor, Editor.end(editor, []))

			focusEditor()
		},
		[editor, focusEditor, getEditorText]
	)

	const insertPublicLinks = useCallback(
		(links: string[]) => {
			if (!editor || links.length === 0) {
				return
			}

			const currentText = getEditorText()
			const newText =
				currentText.length === 0 || currentText.endsWith("\n") ? links.join("\n") + "\n\n" : "\n" + links.join("\n") + "\n\n"

			focusEditor()

			Transforms.insertText(editor, newText)
			Transforms.select(editor, Editor.end(editor, []))

			focusEditor()
		},
		[editor, focusEditor, getEditorText]
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

	const hideEmojiSuggestions = useCallback(() => {
		setShowEmojiSuggestions(false)
		setEmojisSuggestionsText("")
		setEmojisSuggestionsIndex(0)
	}, [])

	const hideMentionsSuggestions = useCallback(() => {
		setShowMentionSuggestions(false)
		setMentionsSuggestionsText("")
		setMentionsSuggestionsIndex(0)
	}, [])

	const hideSuggestions = useCallback(() => {
		hideEmojiSuggestions()
		hideMentionsSuggestions()
	}, [hideEmojiSuggestions, hideMentionsSuggestions])

	const findLastMessageToEdit = useCallback((): void => {
		const lastMessagesFromUser = messages.filter(m => m.senderId === userId).sort((a, b) => b.sentTimestamp - a.sentTimestamp)

		if (lastMessagesFromUser.length <= 0 || !lastMessagesFromUser[0]) {
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

		if (content.length === 0 || !me) {
			return
		}

		if (content.length >= MAX_CHAT_SIZE - 64) {
			errorToast(t("chats.maxSizeReached", { chars: MAX_CHAT_SIZE - 64 }))

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

			setConversations(prev =>
				prev.map(c =>
					c.uuid === conversation.uuid
						? {
								...c,
								lastMessage: content,
								lastMessageSender: me.userId,
								lastMessageTimestamp: Date.now(),
								lastMessageUUID: uuid
							}
						: c
				)
			)

			setSelectedConversation(prev =>
				prev
					? prev.uuid === conversation.uuid
						? {
								...prev,
								lastMessage: content,
								lastMessageSender: me.userId,
								lastMessageTimestamp: Date.now(),
								lastMessageUUID: uuid
							}
						: prev
					: prev
			)

			eventEmitter.emit("chatMarkAsRead")
			eventEmitter.emit("scrollChatToBottom")

			clearTimeout(typingEventTimeout.current)
			clearEditor()
			focusEditor()
			setEditUUID("")
			setReplyMessage(null)

			await Promise.all([
				worker.sendChatTyping({
					conversation: conversation.uuid,
					type: "up"
				}),
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

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			setEditUUID("")
			setReplyMessage(null)
			clearEditor()
			focusEditor()
			hideSuggestions()
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
		errorToast,
		hideSuggestions,
		setSelectedConversation,
		setConversations,
		t
	])

	const editMessage = useCallback(async (): Promise<void> => {
		if (editUUID.length === 0) {
			return
		}

		const content = getEditorText()

		if (content.length === 0) {
			return
		}

		if (content.length >= MAX_CHAT_SIZE - 64) {
			errorToast(t("chats.maxSizeReached", { chars: MAX_CHAT_SIZE - 64 }))

			return
		}

		try {
			setMessages(prev => prev.map(m => (m.uuid === editUUID ? { ...m, message: content } : m)))

			clearTimeout(typingEventTimeout.current)
			clearEditor()
			focusEditor()
			setEditUUID("")
			setReplyMessage(null)

			eventEmitter.emit("chatMarkAsRead")
			eventEmitter.emit("scrollChatToBottom")

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

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			setEditUUID("")
			setReplyMessage(null)
			clearEditor()
			focusEditor()
			hideSuggestions()
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
		errorToast,
		hideSuggestions,
		t
	])

	const toggleMentionsAndEmojis = useCallback((): void => {
		if (!editor) {
			hideSuggestions()

			return
		}

		const selection = editor.selection

		if (!selection || !selection.anchor || selection.anchor.offset <= 0) {
			hideSuggestions()

			return
		}

		const path = selection.anchor.path[0]

		if (!path) {
			hideSuggestions()

			return
		}

		const selected = editor.children[path] as CustomElement

		if (!selected || !selected.children || !Array.isArray(selected.children) || selected.children.length === 0) {
			hideSuggestions()

			return
		}

		const text = selected.children[0]?.text

		if (!text) {
			hideSuggestions()

			return
		}

		if (text.length === 0 || !(text.includes("@") || text.includes(":"))) {
			hideSuggestions()

			return
		}

		const mentionsClosestIndex = findClosestIndex(text, "@", selection.anchor.offset)
		const mentionsSliced = text.slice(
			mentionsClosestIndex === -1 ? text.lastIndexOf("@") : mentionsClosestIndex,
			selection.anchor.offset
		)
		const mentionsOpen = mentionsSliced.startsWith("@") && mentionsSliced.length >= 1 && !mentionsSliced.includes(" ")

		const emojisClosestIndex = findClosestIndex(text, ":", selection.anchor.offset)
		const emojisSliced = text.slice(emojisClosestIndex === -1 ? text.lastIndexOf(":") : emojisClosestIndex, selection.anchor.offset)
		const emojisOpen =
			emojisSliced.startsWith(":") &&
			emojisSliced.length >= 2 &&
			emojisSliced.indexOf(" ") === -1 &&
			!emojisSliced.endsWith(":") &&
			!emojisSliced.endsWith(" ")

		setShowEmojiSuggestions(emojisOpen)
		setShowMentionSuggestions(mentionsOpen)
		setMentionsSuggestionsText(mentionsSliced)
		setEmojisSuggestionsText(emojisSliced)

		if (!emojisOpen) {
			hideEmojiSuggestions()

			SearchIndex.reset()
		} else {
			searchEmojiIndex(emojisSliced.split(":").join(""))
				.then(result => {
					const filtered = result.filter(
						emoji =>
							emoji &&
							emoji.skins &&
							Array.isArray(emoji.skins) &&
							emoji.skins.length > 0 &&
							emoji.skins[0] &&
							emoji.skins[0].shortcodes
					)

					if (filtered.length === 0) {
						setEmojisSuggestionsShortCodes([])

						return
					}

					const shortCodes = filtered.map(emoji => (emoji.skins && emoji.skins[0] ? emoji.skins[0].shortcodes : ""))

					if (shortCodes.length === 0) {
						setEmojisSuggestionsShortCodes([])

						return
					}

					setEmojisSuggestionsShortCodes(shortCodes.slice(0, 10))
				})
				.catch(err => {
					console.error(err)

					setEmojisSuggestionsShortCodes([])
				})
		}

		if (!mentionsOpen) {
			hideMentionsSuggestions()
		}
	}, [editor, hideSuggestions, hideMentionsSuggestions, hideEmojiSuggestions])

	const addTextAfterTextComponent = useCallback(
		(component: string, text: string): void => {
			if (!editor) {
				return
			}

			const selection = editor.selection

			if (!selection || !selection.anchor) {
				return
			}

			const selectedChildrenIndex = selection.anchor.path[0]
			const selected = editor.children[selectedChildrenIndex!] as CustomElement

			if (!selected || !selected.children || !Array.isArray(selected.children) || selected.children.length === 0) {
				return
			}

			const message = selected.children[0]?.text

			if (!message) {
				return
			}

			const closestIndex = findClosestIndex(message, component, selection.anchor.offset)

			if (closestIndex === -1) {
				return
			}

			const replacedMessage = message.slice(0, closestIndex) + text + " "

			if (replacedMessage.trim().length === 0) {
				return
			}

			const currentChildren = editor.children as CustomElement[]

			editor.children = currentChildren.map((child, index) =>
				index === selectedChildrenIndex ? { ...child, children: [{ ...child.children, text: replacedMessage }] } : child
			)

			Transforms.select(editor, Editor.end(editor, []))

			focusEditor()
			hideSuggestions()
		},
		[editor, focusEditor, hideSuggestions]
	)

	const addMentionToInput = useCallback(
		(id: number) => {
			if (!editor) {
				return
			}

			const foundParticipant = conversation.participants.filter(p => p.userId === id)
			const selection = editor.selection

			if (!selection || !selection.anchor || foundParticipant.length === 0) {
				hideSuggestions()
				focusEditor()

				return
			}

			const selectedChildrenIndex = selection.anchor.path[0]
			const selected = editor.children[selectedChildrenIndex!] as CustomElement

			if (!selected || !selected.children || !Array.isArray(selected.children) || selected.children.length === 0) {
				hideSuggestions()
				focusEditor()

				return
			}

			const message = selected.children[0]?.text

			if (!message) {
				hideSuggestions()
				focusEditor()

				return
			}

			const closestIndex = findClosestIndex(message, "@", selection.anchor.offset)

			if (closestIndex === -1) {
				hideSuggestions()
				focusEditor()

				return
			}

			const replacedMessage = message.slice(0, closestIndex) + "@" + foundParticipant[0]?.email + " "

			if (replacedMessage.trim().length === 0) {
				hideSuggestions()
				focusEditor()

				return
			}

			const currentChildren = editor.children as CustomElement[]

			editor.children = currentChildren.map((child, index) =>
				index === selectedChildrenIndex
					? {
							...child,
							children: [
								{
									...child.children,
									text: replacedMessage
								}
							]
						}
					: child
			)

			Transforms.select(editor, Editor.end(editor, []))

			focusEditor()
			hideSuggestions()
		},
		[editor, conversation.participants, focusEditor, hideSuggestions]
	)

	const onKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>): void => {
			emitTypingEvent()
			toggleMentionsAndEmojis()

			if (e.key === "Enter" && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
				e.preventDefault()

				if (showMentionSuggestions && filteredMentions.length > 0) {
					const mention = filteredMentions[mentionsSuggestionsIndex]

					if (!mention) {
						return
					}

					addMentionToInput(mention.userId)

					return
				}

				if (showEmojiSuggestions && emojisSuggestionsShortCodes.length > 0) {
					const shortCode = emojisSuggestionsShortCodes[emojisSuggestionsIndex]

					if (!shortCode) {
						return
					}

					addTextAfterTextComponent(":", shortCode)

					return
				}

				if (editUUID.length === 0) {
					sendMessage()
				} else {
					editMessage()
				}

				return
			}

			const text = getEditorText()

			if (e.key === "ArrowUp" && text.length === 0) {
				e.preventDefault()

				findLastMessageToEdit()

				return
			}

			if (e.key === "ArrowUp" && showMentionSuggestions && filteredMentions.length !== 0) {
				e.preventDefault()

				setMentionsSuggestionsIndex(prev => (prev - 1 < 0 ? filteredMentions.length - 1 : prev - 1))

				return
			}

			if (e.key === "ArrowDown" && showMentionSuggestions && filteredMentions.length !== 0) {
				e.preventDefault()

				setMentionsSuggestionsIndex(prev => (prev + 1 > filteredMentions.length - 1 ? 0 : prev + 1))

				return
			}

			if (e.key === "ArrowUp" && showEmojiSuggestions && emojisSuggestionsShortCodes.length !== 0) {
				e.preventDefault()

				setEmojisSuggestionsIndex(prev => (prev - 1 < 0 ? emojisSuggestionsShortCodes.length - 1 : prev - 1))

				return
			}

			if (e.key === "ArrowDown" && showEmojiSuggestions && emojisSuggestionsShortCodes.length !== 0) {
				e.preventDefault()

				setEmojisSuggestionsIndex(prev => (prev + 1 > emojisSuggestionsShortCodes.length - 1 ? 0 : prev + 1))

				return
			}
		},
		[
			emitTypingEvent,
			sendMessage,
			findLastMessageToEdit,
			getEditorText,
			editUUID,
			editMessage,
			toggleMentionsAndEmojis,
			filteredMentions,
			mentionsSuggestionsIndex,
			showMentionSuggestions,
			addMentionToInput,
			showEmojiSuggestions,
			emojisSuggestionsShortCodes,
			emojisSuggestionsIndex,
			addTextAfterTextComponent
		]
	)

	const onKeyUp = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>): void => {
			toggleMentionsAndEmojis()

			if (replyMessage && e.key === "Escape") {
				e.preventDefault()

				setReplyMessage(null)

				return
			}

			if (editUUID.length > 0 && e.key === "Escape") {
				e.preventDefault()

				setEditUUID("")
				clearEditor()
				focusEditor()

				return
			}

			if (e.key === "Escape" && (showEmojiSuggestions || showMentionSuggestions)) {
				e.preventDefault()

				hideSuggestions()

				return
			}

			const text = getEditorText()

			if (text.length === 0) {
				hideSuggestions()
			}
		},
		[
			setEditUUID,
			setReplyMessage,
			replyMessage,
			editUUID,
			clearEditor,
			focusEditor,
			hideSuggestions,
			getEditorText,
			showEmojiSuggestions,
			showMentionSuggestions,
			toggleMentionsAndEmojis
		]
	)

	const attachFiles = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			if (!e.target.files) {
				e.target.value = ""

				return
			}

			const files: File[] = []

			for (const file of e.target.files) {
				files.push(file)
			}

			let toast: ReturnType<typeof loadingToast> | null = null

			try {
				const uploadedFiles = await worker.uploadFilesToChatUploads({ files })
				const filesWithLinkUUIDs: { file: DriveCloudItem; linkUUID: string }[] = []

				toast = loadingToast()

				await promiseAllChunked(
					uploadedFiles.map(
						file =>
							new Promise<void>((resolve, reject) => {
								worker
									.enablePublicLink({ type: file.type, uuid: file.uuid })
									.then(linkUUID => {
										filesWithLinkUUIDs.push({
											file,
											linkUUID
										})

										resolve()
									})
									.catch(reject)
							})
					)
				)

				eventEmitter.emit("attachFilesToChat", filesWithLinkUUIDs)
			} catch (e) {
				if (e instanceof Error && e.message.toLowerCase().includes("maximum storage reached")) {
					eventEmitter.emit("openStorageDialog")

					return
				}

				if (e instanceof Error && !e.message.toLowerCase().includes("abort")) {
					console.error(e)

					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				}
			} finally {
				e.target.value = ""

				if (toast) {
					toast.dismiss()
				}
			}
		},
		[errorToast, loadingToast]
	)

	const attachFilesFromDrive = useCallback(async () => {
		const items = await selectDriveItem({
			type: "file",
			multiple: true
		})

		if (items.cancelled) {
			return
		}

		const toast = loadingToast()

		try {
			const filesWithLinkUUIDs: { file: DriveCloudItem; linkUUID: string }[] = []

			await promiseAllChunked(
				items.items.map(
					file =>
						new Promise<void>((resolve, reject) => {
							worker
								.enablePublicLink({ type: file.type, uuid: file.uuid })
								.then(linkUUID => {
									filesWithLinkUUIDs.push({
										file,
										linkUUID
									})

									resolve()
								})
								.catch(reject)
						})
				)
			)

			eventEmitter.emit("attachFilesToChat", filesWithLinkUUIDs)
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [errorToast, loadingToast])

	useEffect(() => {
		return () => {
			if (typingEventEmitTimeout.current > 0) {
				clearTimeout(typingEventTimeout.current)

				worker.sendChatTyping({ conversation: conversation.uuid, type: "up" }).catch(console.error)
			}
		}
	}, [conversation.uuid])

	useEffect(() => {
		if (editor && !isMobile) {
			clearTimeout(focusEditorTimeout.current)

			focusEditorTimeout.current = setTimeout(focusEditor, 100)
		}
	}, [editor, focusEditor, isMobile])

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

		const attachFilesToChatListener = eventEmitter.on("attachFilesToChat", (files: { file: DriveCloudItem; linkUUID: string }[]) => {
			insertPublicLinks(
				files.map(
					file =>
						PUBLIC_LINK_BASE_URL +
						file.linkUUID +
						encodeURIComponent("#") +
						Buffer.from(file.file.type === "file" ? file.file.key : "", "utf-8").toString("hex")
				)
			)
		})

		return () => {
			chatInputWriteTextListener.remove()
			chatInputFocusListener.remove()
			attachFilesToChatListener.remove()
		}
	}, [clearEditor, insertText, focusEditor, insertPublicLinks])

	return (
		<div
			className="flex flex-col w-full h-auto px-4 pt-0 pb-2 gap-1"
			id="chat-input-container"
		>
			<input
				type="file"
				id="file-input"
				multiple={true}
				onChange={attachFiles}
				className="hidden"
			/>
			<div className="absolute z-50">
				<DropdownMenu>
					<DropdownMenuTrigger asChild={true}>
						<PlusCircle
							size={24}
							className="cursor-pointer mt-[12px] ml-[10px] text-muted-foreground hover:text-foreground"
						/>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem
							className="cursor-pointer"
							onClick={attachFilesFromDrive}
						>
							{t("contextMenus.chat.input.selectFromDrive")}
						</DropdownMenuItem>
						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() => document.getElementById("file-input")?.click()}
						>
							{t("contextMenus.chat.input.attachFiles")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			{!isMobile && (
				<div className="absolute z-50 w-[1px]">
					<Popover>
						<PopoverTrigger asChild={true}>
							<Smile
								size={24}
								className={"cursor-pointer mt-[12px] text-muted-foreground hover:text-foreground"}
								style={{
									marginLeft: inputContainerDimensions.width - 70
								}}
							/>
						</PopoverTrigger>
						<PopoverContent
							className="bg-transparent border-none w-auto h-auto"
							align="end"
						>
							<EmojiPicker
								onEmojiSelect={(e: { shortcodes: string }) => insertEmoji(e.shortcodes)}
								autoFocus={!isMobile}
								icons="outline"
								locale="en"
								theme={theme.theme}
								data={emojiData}
								custom={customEmojis}
							/>
						</PopoverContent>
					</Popover>
				</div>
			)}
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
						<XCircle
							size={16}
							className="cursor-pointer text-muted-foreground hover:text-primary"
							onClick={() => setReplyMessage(null)}
						/>
					</div>
				</div>
			)}
			{showMentionSuggestions && filteredMentions.length > 0 && (
				<div
					className="absolute bottom-[70px]"
					style={{
						width: inputContainerDimensions.width - 32
					}}
				>
					<div className="flex flex-col bg-secondary p-1.5 px-2 pb-5 rounded-t-lg gap-2">
						<div className="flex flex-row gap-1 items-center justify-between">
							<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground">{t("chats.input.replyingTo")}</p>
							<XCircle
								size={18}
								className="cursor-pointer text-muted-foreground hover:text-primary"
								onClick={hideSuggestions}
							/>
						</div>
						<div className="flex flex-col overflow-x-hidden overflow-y-auto max-h-[40vh]">
							{filteredMentions.map((participant, index) => {
								return (
									<div
										className={cn(
											"flex flex-row items-center justify-between py-2 px-2 rounded-md hover:bg-primary-foreground cursor-pointer mb-0.5",
											index === mentionsSuggestionsIndex ? "bg-primary-foreground" : "bg-transparent"
										)}
										key={participant.userId}
										onClick={() => {
											addMentionToInput(participant.userId)
											hideSuggestions()
											focusEditor()
										}}
									>
										<div className="flex flex-row gap-2">
											<Avatar
												src={participant.avatar}
												size={24}
											/>
											<p className="line-clamp-1 text-ellipsis break-all">
												{participant.nickName.length > 0 ? participant.nickName : participant.email}
											</p>
										</div>
										<p className="text-muted-foreground line-clamp-1 text-ellipsis break-all">{participant.email}</p>
									</div>
								)
							})}
						</div>
					</div>
				</div>
			)}
			{showEmojiSuggestions && emojisSuggestionsShortCodes.length > 0 && (
				<div
					className="absolute bottom-[70px]"
					style={{
						width: inputContainerDimensions.width - 32
					}}
				>
					<div className="flex flex-col bg-secondary p-1.5 px-2 pb-5 rounded-t-lg gap-2">
						<div className="flex flex-row gap-1 items-center justify-between">
							<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground">
								{t("chats.emojisMatching", { text: emojisSuggestionsText })}
							</p>
							<XCircle
								size={18}
								className="cursor-pointer text-muted-foreground hover:text-primary"
								onClick={hideSuggestions}
							/>
						</div>
						<div className="flex flex-col overflow-x-hidden overflow-y-auto max-h-[40vh]">
							{emojisSuggestionsShortCodes.map((shortCode, index) => {
								return (
									<div
										className={cn(
											"flex flex-row items-center justify-between py-2 px-2 rounded-md hover:bg-primary-foreground cursor-pointer mb-0.5",
											index === emojisSuggestionsIndex ? "bg-primary-foreground" : "bg-transparent"
										)}
										key={shortCode + ":" + index}
										onClick={() => {
											addTextAfterTextComponent(":", shortCode)
											hideSuggestions()
											focusEditor()
										}}
									>
										<div className="flex flex-row gap-2">
											<EmojiElement
												shortcodes={shortCode}
												fallback={shortCode}
												size="18px"
											/>
											<p className="line-clamp-1 text-ellipsis break-all">{shortCode}</p>
										</div>
									</div>
								)
							})}
						</div>
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
					placeholder={isMobile ? t("chats.input.placeholderMobile") : t("chats.input.placeholder")}
					className={cn(
						"slate-editor z-10 border rounded-md bg-background w-full min-h-10 max-h-[40vh] overflow-y-auto overflow-x-hidden pl-11 py-3 break-all outline-none focus:outline-none active:outline-none hover:outline-none",
						!isMobile && "pr-11"
					)}
					autoCorrect="none"
					autoCapitalize="none"
					autoFocus={!isMobile}
					autoComplete="none"
					spellCheck={false}
					maxLength={MAX_CHAT_SIZE - 64}
				/>
			</Slate>
			<Typing conversation={conversation} />
		</div>
	)
})

export default Input
