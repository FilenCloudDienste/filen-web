import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"

/**
 * Sort and filter chat conversations by search term, participants and name
 *
 * @export
 * @param {ChatConversation[]} conversations
 * @param {string} search
 * @param {number} userId
 * @returns {ChatConversation[]}
 */
export function sortAndFilterConversations(conversations: ChatConversation[], search: string, userId: number): ChatConversation[] {
	return conversations
		.filter(convo => convo.participants.length >= 1 && (convo.lastMessageTimestamp > 0 || userId === convo.ownerId))
		.filter(convo => {
			if (search.length === 0) {
				return true
			}

			if (
				convo.participants
					.map(p => (p.nickName.length > 0 ? p.nickName : p.email))
					.join(", ")
					.toLowerCase()
					.trim()
					.indexOf(search.toLowerCase().trim()) !== -1
			) {
				return true
			}

			if (convo.lastMessage?.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1) {
				return true
			}

			return false
		})
		.sort((a, b) => {
			if (a.lastMessageTimestamp > 0 && b.lastMessageTimestamp > 0) {
				return b.lastMessageTimestamp - a.lastMessageTimestamp
			} else if (a.lastMessageTimestamp === 0 && b.lastMessageTimestamp === 0) {
				return b.createdTimestamp - a.createdTimestamp
			} else {
				return b.lastMessageTimestamp - a.lastMessageTimestamp
			}
		})
}
