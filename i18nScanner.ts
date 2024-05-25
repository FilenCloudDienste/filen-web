import fs from "fs-extra"
import path from "path"
import * as glob from "glob"

const SRC_DIR = "./src"
const TRANSLATION_JSON = path.join("locales", "en", "en.json")

const getAllFiles = (dir: string): string[] => {
	const files = [
		...glob.sync(`${dir}/**/*.tsx`),
		...glob.sync(`${dir}/**/*.ts`),
		...glob.sync(`${dir}/**/*.js`),
		...glob.sync(`${dir}/**/*.jsx`)
	]

	return files
}

const extractI18nKeys = (file: string): string[] => {
	const content = fs.readFileSync(file, "utf-8")
	// eslint-disable-next-line no-useless-escape
	const keyRegex = /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*[,\)]/g
	const keys: string[] = []
	let match: RegExpExecArray | null

	while ((match = keyRegex.exec(content)) !== null) {
		keys.push(match[1])
	}

	return keys
}

const keyExistsInTranslation = (key: string, translation: object): boolean => {
	const keys = key.split(".")
	let currentLevel = translation

	for (const k of keys) {
		if (currentLevel[k] === undefined) {
			return false
		}

		currentLevel = currentLevel[k]
	}

	return true
}

const findMissingKeys = (): void => {
	const translation = fs.readJSONSync(TRANSLATION_JSON, { encoding: "utf-8" })
	const files = getAllFiles(SRC_DIR)
	const allKeys: string[] = []

	files.forEach(file => {
		const keys = extractI18nKeys(file)
		allKeys.push(...keys)
	})

	const missingKeys = allKeys.filter(key => !keyExistsInTranslation(key, translation))

	if (missingKeys.length > 0) {
		console.log("Missing translation keys:")

		missingKeys.forEach(key => console.log(key))
	} else {
		console.log("All keys are present in the translation file.")
	}
}

findMissingKeys()
