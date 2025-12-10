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
            <div class="toolbar-group">
                <button
                    @click="toggleHeading(1)"
                    :class="{ active: isActive('heading', { level: 1 }) }"
                    title="Heading 1"
                >
                    H1
                </button>
                <button
                    @click="toggleHeading(2)"
                    :class="{ active: isActive('heading', { level: 2 }) }"
                    title="Heading 2"
                >
                    H2
                </button>
                <button
                    @click="toggleHeading(3)"
                    :class="{ active: isActive('heading', { level: 3 }) }"
                    title="Heading 3"
                >
                    H3
                </button>
            </div>

            <div class="toolbar-divider" />

            <div class="toolbar-group">
                <button
                    @click="toggleBold"
                    :class="{ active: isActive('bold') }"
                    title="Bold"
                >
                    <strong>B</strong>
                </button>
                <button
                    @click="toggleItalic"
                    :class="{ active: isActive('italic') }"
                    title="Italic"
                >
                    <em>I</em>
                </button>
                <button
                    @click="toggleStrike"
                    :class="{ active: isActive('strike') }"
                    title="Strikethrough"
                >
                    <s>S</s>
                </button>
                <button
                    @click="toggleCode"
                    :class="{ active: isActive('code') }"
                    title="Inline Code"
                >
                    &lt;/&gt;
                </button>
            </div>

            <div class="toolbar-divider" />

            <div class="toolbar-group">
                <button
                    @click="toggleBulletList"
                    :class="{ active: isActive('bulletList') }"
                    title="Bullet List"
                >
                    *
                </button>
                <button
                    @click="toggleOrderedList"
                    :class="{ active: isActive('orderedList') }"
                    title="Numbered List"
                >
                    1.
                </button>
                <button
                    @click="toggleBlockquote"
                    :class="{ active: isActive('blockquote') }"
                    title="Quote"
                >
                    "
                </button>
                <button
                    @click="toggleCodeBlock"
                    :class="{ active: isActive('codeBlock') }"
                    title="Code Block"
                >
                    [code]
                </button>
            </div>

            <div class="toolbar-divider" />

            <div class="toolbar-group">
                <button @click="addImage" title="Add Image">IMG</button>
                <button
                    @click="setLink"
                    :class="{ active: isActive('link') }"
                    title="Add Link"
                >
                    LINK
                </button>
                <button
                    v-if="isActive('link')"
                    @click="unsetLink"
                    title="Remove Link"
                >
                    X
                </button>
                <button @click="setHorizontalRule" title="Horizontal Rule">
                    ---
                </button>
            </div>

            <div class="toolbar-divider" />

            <div class="toolbar-group">
                <button @click="undo" title="Undo">Undo</button>
                <button @click="redo" title="Redo">Redo</button>
            </div>
        </div>

        <!-- Editor Content -->
        <EditorContent :editor="editor" class="editor-content" />
    </div>
</template>

<style scoped>
.tiptap-editor {
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.3);
}

.toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.4);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.toolbar-group {
    display: flex;
    gap: 0.25rem;
}

.toolbar-divider {
    width: 1px;
    background: rgba(255, 255, 255, 0.2);
    margin: 0 0.5rem;
}

.toolbar button {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.7);
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
}

.toolbar button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
}

.toolbar button.active {
    background: rgb(151, 71, 255);
    border-color: rgb(151, 71, 255);
    color: white;
}

.editor-content {
    min-height: 400px;
    padding: 1.5rem;
}

.editor-content :deep(.ProseMirror) {
    min-height: 400px;
    outline: none;
    color: white;
    font-size: 1.125rem;
    line-height: 1.75;
}

.editor-content :deep(.ProseMirror p) {
    margin-bottom: 1rem;
}

.editor-content :deep(.ProseMirror h1) {
    font-size: 2.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
    margin-top: 2rem;
}

.editor-content :deep(.ProseMirror h2) {
    font-size: 1.75rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    margin-top: 1.5rem;
}

.editor-content :deep(.ProseMirror h3) {
    font-size: 1.375rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    margin-top: 1.25rem;
}

.editor-content :deep(.ProseMirror ul),
.editor-content :deep(.ProseMirror ol) {
    padding-left: 1.5rem;
    margin-bottom: 1rem;
}

.editor-content :deep(.ProseMirror li) {
    margin-bottom: 0.25rem;
}

.editor-content :deep(.ProseMirror blockquote) {
    border-left: 3px solid rgb(151, 71, 255);
    padding-left: 1rem;
    margin-left: 0;
    color: rgba(255, 255, 255, 0.8);
    font-style: italic;
}

.editor-content :deep(.ProseMirror code) {
    background: rgba(151, 71, 255, 0.2);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.875em;
}

.editor-content :deep(.ProseMirror pre) {
    background: rgba(0, 0, 0, 0.5);
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    margin-bottom: 1rem;
}

.editor-content :deep(.ProseMirror pre code) {
    background: transparent;
    padding: 0;
}

.editor-content :deep(.ProseMirror hr) {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    margin: 2rem 0;
}

.editor-content :deep(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1rem 0;
}

.editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: rgba(255, 255, 255, 0.3);
    pointer-events: none;
    height: 0;
}

.editor-content :deep(.ProseMirror a) {
    color: rgb(151, 71, 255);
    text-decoration: underline;
}
</style>
