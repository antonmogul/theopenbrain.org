<script setup>
import { ref, watch, onBeforeUnmount } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

const props = defineProps({
    modelValue: {
        type: String,
        default: "",
    },
    placeholder: {
        type: String,
        default: "Start writing...",
    },
    editable: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits(["update:modelValue"]);

const editor = useEditor({
    content: props.modelValue,
    editable: props.editable,
    extensions: [
        StarterKit.configure({
            heading: {
                levels: [1, 2, 3],
            },
        }),
        Image.configure({
            inline: true,
            allowBase64: true,
        }),
        Link.configure({
            openOnClick: false,
            HTMLAttributes: {
                class: "text-violet underline",
            },
        }),
        Placeholder.configure({
            placeholder: props.placeholder,
        }),
    ],
    onUpdate: ({ editor }) => {
        emit("update:modelValue", editor.getHTML());
    },
});

// Watch for external content changes
watch(
    () => props.modelValue,
    (newValue) => {
        if (editor.value && newValue !== editor.value.getHTML()) {
            editor.value.commands.setContent(newValue, false);
        }
    },
);

// Watch for editable changes
watch(
    () => props.editable,
    (newValue) => {
        if (editor.value) {
            editor.value.setEditable(newValue);
        }
    },
);

onBeforeUnmount(() => {
    if (editor.value) {
        editor.value.destroy();
    }
});

// Toolbar actions
const toggleBold = () => editor.value?.chain().focus().toggleBold().run();
const toggleItalic = () => editor.value?.chain().focus().toggleItalic().run();
const toggleStrike = () => editor.value?.chain().focus().toggleStrike().run();
const toggleCode = () => editor.value?.chain().focus().toggleCode().run();
const toggleHeading = (level) =>
    editor.value?.chain().focus().toggleHeading({ level }).run();
const toggleBulletList = () =>
    editor.value?.chain().focus().toggleBulletList().run();
const toggleOrderedList = () =>
    editor.value?.chain().focus().toggleOrderedList().run();
const toggleBlockquote = () =>
    editor.value?.chain().focus().toggleBlockquote().run();
const toggleCodeBlock = () =>
    editor.value?.chain().focus().toggleCodeBlock().run();
const setHorizontalRule = () =>
    editor.value?.chain().focus().setHorizontalRule().run();
const undo = () => editor.value?.chain().focus().undo().run();
const redo = () => editor.value?.chain().focus().redo().run();

const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url) {
        editor.value?.chain().focus().setImage({ src: url }).run();
    }
};

const setLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
        editor.value
            ?.chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
    }
};

const unsetLink = () => {
    editor.value?.chain().focus().unsetLink().run();
};

// Check if formatting is active
const isActive = (type, attrs = {}) => {
    return editor.value?.isActive(type, attrs) ?? false;
};
</script>

<template>
    <div class="tiptap-editor">
        <!-- Toolbar -->
        <div v-if="editable" class="toolbar">
            <!-- Text Style Group -->
            <div class="toolbar-group">
                <button
                    @click="toggleHeading(1)"
                    :class="{ active: isActive('heading', { level: 1 }) }"
                    title="Heading 1 (Ctrl+Alt+1)"
                    class="heading-btn"
                >
                    <span class="btn-label">H1</span>
                </button>
                <button
                    @click="toggleHeading(2)"
                    :class="{ active: isActive('heading', { level: 2 }) }"
                    title="Heading 2 (Ctrl+Alt+2)"
                    class="heading-btn"
                >
                    <span class="btn-label">H2</span>
                </button>
                <button
                    @click="toggleHeading(3)"
                    :class="{ active: isActive('heading', { level: 3 }) }"
                    title="Heading 3 (Ctrl+Alt+3)"
                    class="heading-btn"
                >
                    <span class="btn-label">H3</span>
                </button>
            </div>

            <div class="toolbar-divider" />

            <!-- Formatting Group -->
            <div class="toolbar-group">
                <button
                    @click="toggleBold"
                    :class="{ active: isActive('bold') }"
                    title="Bold (Ctrl+B)"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                    </svg>
                </button>
                <button
                    @click="toggleItalic"
                    :class="{ active: isActive('italic') }"
                    title="Italic (Ctrl+I)"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <line x1="19" y1="4" x2="10" y2="4"></line>
                        <line x1="14" y1="20" x2="5" y2="20"></line>
                        <line x1="15" y1="4" x2="9" y2="20"></line>
                    </svg>
                </button>
                <button
                    @click="toggleStrike"
                    :class="{ active: isActive('strike') }"
                    title="Strikethrough (Ctrl+Shift+X)"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M16 4H9a3 3 0 0 0-2.83 4"></path>
                        <path d="M14 12a4 4 0 0 1 0 8H6"></path>
                        <line x1="4" y1="12" x2="20" y2="12"></line>
                    </svg>
                </button>
                <button
                    @click="toggleCode"
                    :class="{ active: isActive('code') }"
                    title="Inline Code (Ctrl+E)"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                </button>
            </div>

            <div class="toolbar-divider" />

            <!-- List & Block Group -->
            <div class="toolbar-group">
                <button
                    @click="toggleBulletList"
                    :class="{ active: isActive('bulletList') }"
                    title="Bullet List (Ctrl+Shift+8)"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <circle
                            cx="4"
                            cy="6"
                            r="1"
                            fill="currentColor"
                        ></circle>
                        <circle
                            cx="4"
                            cy="12"
                            r="1"
                            fill="currentColor"
                        ></circle>
                        <circle
                            cx="4"
                            cy="18"
                            r="1"
                            fill="currentColor"
                        ></circle>
                    </svg>
                </button>
                <button
                    @click="toggleOrderedList"
                    :class="{ active: isActive('orderedList') }"
                    title="Numbered List (Ctrl+Shift+7)"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <line x1="10" y1="6" x2="21" y2="6"></line>
                        <line x1="10" y1="12" x2="21" y2="12"></line>
                        <line x1="10" y1="18" x2="21" y2="18"></line>
                        <text
                            x="3"
                            y="7"
                            font-size="6"
                            fill="currentColor"
                            stroke="none"
                        >
                            1
                        </text>
                        <text
                            x="3"
                            y="13"
                            font-size="6"
                            fill="currentColor"
                            stroke="none"
                        >
                            2
                        </text>
                        <text
                            x="3"
                            y="19"
                            font-size="6"
                            fill="currentColor"
                            stroke="none"
                        >
                            3
                        </text>
                    </svg>
                </button>
                <button
                    @click="toggleBlockquote"
                    :class="{ active: isActive('blockquote') }"
                    title="Quote (Ctrl+Shift+B)"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path
                            d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z"
                        ></path>
                    </svg>
                </button>
                <button
                    @click="toggleCodeBlock"
                    :class="{ active: isActive('codeBlock') }"
                    title="Code Block (Ctrl+Alt+C)"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                        ></rect>
                        <polyline points="9 8 5 12 9 16"></polyline>
                        <polyline points="15 8 19 12 15 16"></polyline>
                    </svg>
                </button>
            </div>

            <div class="toolbar-divider" />

            <!-- Media & Link Group -->
            <div class="toolbar-group">
                <button @click="addImage" title="Add Image">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                        ></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </button>
                <button
                    @click="setLink"
                    :class="{ active: isActive('link') }"
                    title="Add Link (Ctrl+K)"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path
                            d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                        ></path>
                        <path
                            d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                        ></path>
                    </svg>
                </button>
                <button
                    v-if="isActive('link')"
                    @click="unsetLink"
                    title="Remove Link"
                    class="danger-btn"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path
                            d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                        ></path>
                        <path
                            d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                        ></path>
                        <line x1="4" y1="4" x2="20" y2="20"></line>
                    </svg>
                </button>
                <button @click="setHorizontalRule" title="Horizontal Divider">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                    >
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                    </svg>
                </button>
            </div>

            <div class="toolbar-divider" />

            <!-- Undo/Redo Group -->
            <div class="toolbar-group">
                <button @click="undo" title="Undo (Ctrl+Z)">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <polyline points="1 4 1 10 7 10"></polyline>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                    </svg>
                </button>
                <button @click="redo" title="Redo (Ctrl+Shift+Z)">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Editor Content -->
        <EditorContent :editor="editor" class="editor-content" />
    </div>
</template>

<style scoped>
/* TipTap Editor Scoped Styles
   Note: Project uses 62.5% base font-size (1rem = 10px)
   These styles are scoped to this component only */

.tiptap-editor {
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.4);
}

.toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    padding: 1.2rem 1.6rem;
    background: rgba(0, 0, 0, 0.5);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.toolbar-group {
    display: flex;
    gap: 0.4rem;
}

.toolbar-divider {
    width: 1px;
    background: rgba(255, 255, 255, 0.15);
    margin: 0 0.8rem;
}

.toolbar button {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 3.6rem;
    height: 3.6rem;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.6);
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.15s ease;
}

.toolbar button:hover {
    background: rgba(255, 255, 255, 0.08);
    color: white;
}

.toolbar button.active {
    background: rgba(151, 71, 255, 0.2);
    color: rgb(151, 71, 255);
}

.toolbar button.heading-btn {
    font-weight: 600;
}

.toolbar button .btn-label {
    font-size: 1.3rem;
    font-weight: 600;
}

.toolbar button.danger-btn:hover {
    background: rgba(239, 68, 68, 0.15);
    color: rgb(239, 68, 68);
}

.toolbar button svg {
    width: 1.8rem;
    height: 1.8rem;
}

.editor-content {
    min-height: 500px;
    padding: 2.4rem 3rem;
}

.editor-content :deep(.ProseMirror) {
    min-height: 450px;
    outline: none;
    color: rgba(255, 255, 255, 0.9);
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.7rem;
    line-height: 1.8;
}

.editor-content :deep(.ProseMirror p) {
    margin-bottom: 1.6rem;
}

.editor-content :deep(.ProseMirror h1) {
    font-size: 3.2rem;
    font-weight: 600;
    margin-bottom: 1.6rem;
    margin-top: 3.2rem;
    color: white;
    line-height: 1.3;
}

.editor-content :deep(.ProseMirror h2) {
    font-size: 2.4rem;
    font-weight: 600;
    margin-bottom: 1.2rem;
    margin-top: 2.8rem;
    color: white;
    line-height: 1.35;
}

.editor-content :deep(.ProseMirror h3) {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 1rem;
    margin-top: 2.4rem;
    color: white;
    line-height: 1.4;
}

.editor-content :deep(.ProseMirror ul),
.editor-content :deep(.ProseMirror ol) {
    padding-left: 2.4rem;
    margin-bottom: 1.6rem;
}

.editor-content :deep(.ProseMirror li) {
    margin-bottom: 0.6rem;
}

.editor-content :deep(.ProseMirror blockquote) {
    border-left: 4px solid rgb(151, 71, 255);
    padding-left: 2rem;
    margin-left: 0;
    margin-bottom: 1.6rem;
    color: rgba(255, 255, 255, 0.75);
    font-style: italic;
}

.editor-content :deep(.ProseMirror code) {
    background: rgba(151, 71, 255, 0.2);
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.9em;
}

.editor-content :deep(.ProseMirror pre) {
    background: rgba(0, 0, 0, 0.5);
    padding: 1.6rem 2rem;
    border-radius: 8px;
    overflow-x: auto;
    margin-bottom: 1.6rem;
    font-size: 1.4rem;
}

.editor-content :deep(.ProseMirror pre code) {
    background: transparent;
    padding: 0;
    font-size: inherit;
}

.editor-content :deep(.ProseMirror hr) {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    margin: 3rem 0;
}

.editor-content :deep(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1.6rem 0;
}

.editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: rgba(255, 255, 255, 0.3);
    pointer-events: none;
    height: 0;
    font-size: 1.7rem;
}

.editor-content :deep(.ProseMirror a) {
    color: rgb(151, 71, 255);
    text-decoration: underline;
}

.editor-content :deep(.ProseMirror strong) {
    font-weight: 600;
    color: white;
}

.editor-content :deep(.ProseMirror em) {
    font-style: italic;
}
</style>
