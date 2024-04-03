import { type NoteTag, type Note } from "@filen/sdk/dist/types/api/v3/notes"

export function sortAndFilterTags(tags: NoteTag[]) {
	return tags.sort((a, b) => {
		if (a.favorite !== b.favorite) {
			return b.favorite ? 1 : -1
		}

		return b.editedTimestamp - a.editedTimestamp
	})
}

export function sortAndFilterNotes(notes: Note[], search: string, activeTag: string) {
	const filtered = notes
		.sort((a, b) => {
			if (a.pinned !== b.pinned) {
				return b.pinned ? 1 : -1
			}

			if (a.trash !== b.trash && a.archive === false) {
				return a.trash ? 1 : -1
			}

			if (a.archive !== b.archive) {
				return a.archive ? 1 : -1
			}

			if (a.trash !== b.trash) {
				return a.trash ? 1 : -1
			}

			return b.editedTimestamp - a.editedTimestamp
		})
		.filter(note => {
			if (search.length === 0) {
				return true
			}

			if (note.title.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1) {
				return true
			}

			if (note.preview.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1) {
				return true
			}

			return false
		})

	if (activeTag.length > 0) {
		if (activeTag === "all") {
			return filtered
		}

		if (activeTag === "favorites") {
			return filtered.filter(note => note.favorite)
		}

		if (activeTag === "pinned") {
			return filtered.filter(note => note.pinned)
		}

		return filtered.filter(note => note.tags.map(t => t.uuid).includes(activeTag))
	}

	return filtered
}

export function normalizeChecklistValue(value: string): string {
	if (!value.includes("<ul data-checked") || value.trim() === "<p><br></p>" || value.length <= 0) {
		// eslint-disable-next-line quotes
		value = '<ul data-checked="false"><li><br></li></ul>'
	}

	if (value.indexOf("<p") !== -1) {
		value = value.replace(/<p>.*?<\/p>/g, "")
	}

	return value
}
