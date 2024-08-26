export default function quillStyle() {
	return `
        .ql-container {
            font-size: 16px;
            /*font-family: "Inconsolata";*/
            font-weight: 400;
        }

        .ql-editor {
            user-select: text;
            /*font-family: "Inter", sans-serif;*/
        }

        .ql-toolbar.ql-snow {
            border: none;
            border-bottom: 1px solid hsl(var(--border));
            font-size: 16px;
            /*font-family: "Inter", sans-serif;*/
            font-weight: 400;
        }

        .ql-snow .ql-picker {
            color: hsl(var(--muted-foreground));
        }

        .ql-snow .ql-picker-options {
            background-color: hsl(var(--secondary));
            border-radius: 5px;
            padding: 10px;
            padding-top: 0px;
            padding-bottom: 5px;
        }

        .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
            margin-top: 5px;
        }

        .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
            border-color: hsl(var(--border));
        }

        .ql-formats > button:hover {
            color: #3B82F6;
        }

        .ql-container.ql-snow {
            border: none;
        }

        .ql-snow .ql-tooltip {
            background-color: hsl(var(--secondary));
            border-radius: 5px;
            border: 1px solid hsl(var(--border));
            color: hsl(var(--muted-foreground));
            box-shadow: none;
            padding: 5px 12px;
            white-space: nowrap;
            font-size: 16px;
            margin-left: 110px;
            /*font-family: "Inter", sans-serif;*/
        }

        .ql-snow .ql-editor blockquote {
            border-left: 4px solid hsl(var(--primary-foreground));
        }

        .ql-snow .ql-tooltip input[type=text] {
            color: hsl(var(--muted-foreground));
            background-color: hsl(var(--secondary));
            border-radius: 3px;
            border: 1px solid hsl(var(--border));
            font-size: 16px;
        }

        .ql-snow .ql-tooltip input[type=text]:focus, .ql-snow .ql-tooltip input[type=text]:active {
            outline: none;
            border: 1px solid hsl(var(--primary-foreground));
        }

        .ql-snow.ql-toolbar button:hover, .ql-snow .ql-toolbar button:hover, .ql-snow.ql-toolbar button:focus, .ql-snow .ql-toolbar button:focus, .ql-snow.ql-toolbar button.ql-active, .ql-snow .ql-toolbar button.ql-active, .ql-snow.ql-toolbar .ql-picker-label:hover, .ql-snow .ql-toolbar .ql-picker-label:hover, .ql-snow.ql-toolbar .ql-picker-label.ql-active, .ql-snow .ql-toolbar .ql-picker-label.ql-active, .ql-snow.ql-toolbar .ql-picker-item:hover, .ql-snow .ql-toolbar .ql-picker-item:hover, .ql-snow.ql-toolbar .ql-picker-item.ql-selected, .ql-snow .ql-toolbar .ql-picker-item.ql-selected {
            color: #3B82F6;
        }

        .ql-snow.ql-toolbar button:hover,
        .ql-snow .ql-toolbar button:hover,
        .ql-snow.ql-toolbar button:focus,
        .ql-snow .ql-toolbar button:focus,
        .ql-snow.ql-toolbar button.ql-active,
        .ql-snow .ql-toolbar button.ql-active,
        .ql-snow.ql-toolbar .ql-picker-label:hover,
        .ql-snow .ql-toolbar .ql-picker-label:hover,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active,
        .ql-snow.ql-toolbar .ql-picker-item:hover,
        .ql-snow .ql-toolbar .ql-picker-item:hover,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected {
            color: #3B82F6;
        }

        .ql-snow.ql-toolbar button:hover .ql-fill,
        .ql-snow .ql-toolbar button:hover .ql-fill,
        .ql-snow.ql-toolbar button:focus .ql-fill,
        .ql-snow .ql-toolbar button:focus .ql-fill,
        .ql-snow.ql-toolbar button.ql-active .ql-fill,
        .ql-snow .ql-toolbar button.ql-active .ql-fill,
        .ql-snow.ql-toolbar .ql-picker-label:hover .ql-fill,
        .ql-snow .ql-toolbar .ql-picker-label:hover .ql-fill,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-fill,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-fill,
        .ql-snow.ql-toolbar .ql-picker-item:hover .ql-fill,
        .ql-snow .ql-toolbar .ql-picker-item:hover .ql-fill,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-fill,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-fill,
        .ql-snow.ql-toolbar button:hover .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar button:hover .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar button:focus .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar button:focus .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar button.ql-active .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke.ql-fill {
            fill: #3B82F6;
        }

        .ql-snow.ql-toolbar button:hover .ql-stroke,
        .ql-snow .ql-toolbar button:hover .ql-stroke,
        .ql-snow.ql-toolbar button:focus .ql-stroke,
        .ql-snow .ql-toolbar button:focus .ql-stroke,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke,
        .ql-snow .ql-toolbar button.ql-active .ql-stroke,
        .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke,
        .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke,
        .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke,
        .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
        .ql-snow.ql-toolbar button:hover .ql-stroke-miter,
        .ql-snow .ql-toolbar button:hover .ql-stroke-miter,
        .ql-snow.ql-toolbar button:focus .ql-stroke-miter,
        .ql-snow .ql-toolbar button:focus .ql-stroke-miter,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke-miter,
        .ql-snow .ql-toolbar button.ql-active .ql-stroke-miter,
        .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
        .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
        .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
        .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter {
            stroke: hsl(var(--border));
        }

        .ql-toolbar.ql-snow .ql-picker-label {
            border-color: hsl(var(--border));
            border-radius: 5px;
            font-size: 15px;
        }

        .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-label {
            border-color: hsl(var(--border));
            border-radius: 5px;
        }

        .ql-snow .ql-tooltip[data-mode=link]::before {
            content: "Link";
        }

        .ql-snow a {
            color: #3B82F6;
        }

        .ql-snow a:hover {
            text-decoration: underline;
        }

        .ql-editor ul[data-checked=true] > li::before, .ql-editor ul[data-checked=false] > li::before {
            color: hsl(var(--primary));
        }

        .ql-editor ul[data-checked=false] > li::before {
            content: '\\2713';
            color: transparent;
            display: inline-block;
            width: 18px;
            height: 18px;
            border: 1px solid hsl(var(--primary));
            border-radius: 50%;
            margin-right: 0.5em;
            text-align: center;
            line-height: 17px;
            background-color: transparent;
        }

        .ql-editor ul[data-checked=true] > li::before {
            content: '\\2714';
            color: hsl(var(--background));
            display: inline-block;
            width: 18px;
            height: 18px;
            border: 1px solid #3B82F6;
            border-radius: 50%;
            margin-right: 0.5em;
            text-align: center;
            line-height: 17px;
            background-color: #3B82F6;
        }

        .ql-editor ul[data-checked=false] > li {
            margin-top: 8px;
        }

        .ql-editor ul[data-checked=true] > li {
            margin-top: 8px;
        }

        .ql-snow .ql-editor pre.ql-syntax {
            background-color: hsl(var(--secondary));
            color: hsl(var(--primary));
            overflow: visible;
            border-radius: 5px;
        }

        .ql-snow.ql-toolbar button, .ql-snow .ql-toolbar button {
            height: 28px;
            width: 28px;
        }
    `
}
