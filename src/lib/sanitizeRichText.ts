import DOMPurify from "dompurify"

// Sanitizer for rich / checklist note HTML. Decrypted note content is untrusted (notes can be
// shared and collaboratively edited), so it must be sanitized before it reaches Quill's
// clipboard.convert(), which writes it into a live DOM node and would otherwise run inline
// handlers like <img onerror>.
//
// The allowlist is kept byte-for-byte in sync with the mobile app's shared config
// (packages/filen-mobile/src/components/textEditor/richText/dom.tsx) so a note authored on one
// client can never be stripped or used to attack the other. The web editor's toolbar/formats are
// aligned to this set (no strike / sub / sup), so Quill never emits a tag this list would drop.
// Checklist markup (<ul data-checked>) survives via DOMPurify's default ALLOW_DATA_ATTR; class
// carries size / align / indent / direction / code-block.
export const RICH_TEXT_ALLOWED_TAGS = [
	"p",
	"strong",
	"em",
	"u",
	"a",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"code",
	"ol",
	"ul",
	"li",
	"blockquote",
	"pre",
	"br",
	"span",
	"div"
]

export const RICH_TEXT_ALLOWED_ATTR = ["href", "target", "rel", "src", "alt", "class", "style"]

// Registered once at module load (DOMPurify hooks are global to this imported instance, matching
// mobile's dom.tsx): every <a href> that survives sanitization is forced to open externally with a
// locked-down rel, closing the reverse-tabnabbing hole a raw target="_blank" in untrusted content
// would otherwise open.
DOMPurify.addHook("afterSanitizeAttributes", node => {
	if (node.tagName === "A" && node.getAttribute("href")) {
		node.setAttribute("target", "_blank")
		node.setAttribute("rel", "noopener noreferrer")
	}
})

/**
 * Sanitize untrusted rich-text (Quill) note HTML for safe rendering/editing.
 *
 * @export
 * @param {string} html
 * @returns {string}
 */
export function sanitizeRichTextHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: RICH_TEXT_ALLOWED_TAGS,
		ALLOWED_ATTR: RICH_TEXT_ALLOWED_ATTR
	})
}
