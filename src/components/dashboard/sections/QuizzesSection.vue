<script setup>
// Creator-dashboard "Quizzes" section (#11 split). Presentational: parent owns
// the useDashboardQuizzes instance. Quiz editor + nested question editor live
// here; their two-way form state comes in via defineModel.
import {
    SectionHeader,
    BaseCard,
    StatusBadge,
    EmptyState,
    LoadingState,
    ErrorState,
    BaseModal,
    Button,
    FormField,
} from "@/components/dashboard/shared";

defineProps({
    quizzes: { type: Array, default: () => [] },
    quizzesLoading: { type: Boolean, default: false },
    quizzesError: { type: [String, null], default: null },
    editingQuiz: { type: [Object, null], default: null },
    editingQuestion: { type: [Object, null], default: null },
});

const showQuizEditor = defineModel("showQuizEditor", { type: Boolean, default: false });
const quizForm = defineModel("quizForm", { type: Object, required: true });
const showQuestionEditor = defineModel("showQuestionEditor", { type: Boolean, default: false });
const questionForm = defineModel("questionForm", { type: Object, required: true });

defineEmits([
    "fetch",
    "open-quiz",
    "close-quiz",
    "save-quiz",
    "delete-quiz",
    "open-question",
    "close-question",
    "save-question",
    "delete-question",
]);
</script>

<template>
    <section class="section">
        <SectionHeader eyebrow="05 · Quizzes" title="Assessments">
            <template #actions>
                <Button v-if="!showQuizEditor" variant="solid" size="sm" @click="$emit('open-quiz')">New quiz</Button>
            </template>
        </SectionHeader>

        <LoadingState v-if="quizzesLoading" message="Loading quizzes…" />
        <ErrorState v-else-if="quizzesError" :message="quizzesError" @retry="$emit('fetch')" />

        <EmptyState
            v-else-if="quizzes.length === 0 && !showQuizEditor"
            title="No quizzes yet"
            message="Create quizzes to test student understanding."
            action-label="Create quiz"
            @action="$emit('open-quiz')"
        />

        <!-- Quiz editor (inline panel) -->
        <BaseCard v-else-if="showQuizEditor" padding="lg">
            <div class="card-head">
                <h3 class="card-title">{{ editingQuiz ? "Edit quiz" : "New quiz" }}</h3>
                <Button variant="ghost" size="sm" @click="$emit('close-quiz')">← Back to quizzes</Button>
            </div>
            <div class="form-stack">
                <FormField label="Quiz title">
                    <input v-model="quizForm.title" type="text" placeholder="e.g., Chapter 1 Quiz" />
                </FormField>
                <FormField label="Description">
                    <textarea v-model="quizForm.description" placeholder="Quiz description…" rows="2"></textarea>
                </FormField>
                <div class="grid-2">
                    <FormField label="Time limit (min)">
                        <input v-model.number="quizForm.time_limit_minutes" type="number" min="1" />
                    </FormField>
                    <FormField label="Passing score (%)">
                        <input v-model.number="quizForm.passing_score" type="number" min="0" max="100" />
                    </FormField>
                </div>
                <label class="check-row">
                    <input type="checkbox" v-model="quizForm.allow_multiple_attempts" />
                    <span>Allow multiple attempts</span>
                </label>
                <label class="check-row">
                    <input type="checkbox" v-model="quizForm.show_correct_answers" />
                    <span>Show correct answers after submission</span>
                </label>
                <div class="form-actions">
                    <Button variant="ghost" size="sm" @click="$emit('close-quiz')">Cancel</Button>
                    <Button variant="solid" size="sm" @click="$emit('save-quiz')">{{ editingQuiz ? "Save changes" : "Create quiz" }}</Button>
                </div>
            </div>

            <!-- Questions (only when editing existing quiz) -->
            <div v-if="editingQuiz" class="questions-section">
                <div class="card-head">
                    <h4 class="card-title sm">Questions ({{ quizForm.questions.length }})</h4>
                    <Button variant="outline" size="sm" @click="$emit('open-question')">+ Add question</Button>
                </div>

                <EmptyState
                    v-if="quizForm.questions.length === 0"
                    title="No questions yet"
                    message="Add your first question to get started."
                />

                <div v-else class="stack">
                    <BaseCard v-for="(question, index) in quizForm.questions" :key="question.id" padding="md">
                        <div class="card-head">
                            <div class="q-head-meta">
                                <span class="eyebrow-mono">Q{{ index + 1 }}</span>
                                <StatusBadge variant="neutral">{{ question.question_type }}</StatusBadge>
                                <span class="muted-mono">{{ question.points }} pt{{ question.points !== 1 ? "s" : "" }}</span>
                            </div>
                            <div class="btn-row">
                                <Button variant="outline" size="sm" @click="$emit('open-question', question)">Edit</Button>
                                <Button variant="danger" size="sm" @click="$emit('delete-question', question.id)">Delete</Button>
                            </div>
                        </div>
                        <p class="q-text">{{ question.question_text }}</p>
                        <div v-if="question.options" class="q-options">
                            <div
                                v-for="(option, optIndex) in question.options"
                                :key="optIndex"
                                class="q-option"
                                :class="{ correct: option === question.correct_answer }"
                            >
                                {{ String.fromCharCode(65 + optIndex) }}. {{ option }}
                            </div>
                        </div>
                    </BaseCard>
                </div>
            </div>

            <!-- Question editor modal -->
            <BaseModal v-model="showQuestionEditor" :title="editingQuestion ? 'Edit question' : 'Add question'" size="lg">
                <div class="form-stack">
                    <FormField label="Question type">
                        <select v-model="questionForm.question_type">
                            <option value="multiple_choice">Multiple choice</option>
                            <option value="true_false">True/False</option>
                            <option value="short_answer">Short answer</option>
                        </select>
                    </FormField>
                    <FormField label="Question">
                        <textarea v-model="questionForm.question_text" placeholder="Enter your question…" rows="3"></textarea>
                    </FormField>

                    <div v-if="questionForm.question_type === 'multiple_choice'">
                        <span class="field-label-static">Options</span>
                        <div
                            v-for="(option, index) in questionForm.options"
                            :key="index"
                            class="option-input-row"
                        >
                            <span class="option-letter">{{ String.fromCharCode(65 + index) }}</span>
                            <input
                                v-model="questionForm.options[index]"
                                type="text"
                                :placeholder="'Option ' + String.fromCharCode(65 + index)"
                                class="option-text-input"
                            />
                            <label class="radio-label">
                                <input type="radio" :value="questionForm.options[index]" v-model="questionForm.correct_answer" />
                                Correct
                            </label>
                        </div>
                    </div>

                    <FormField v-else-if="questionForm.question_type === 'true_false'" label="Correct answer">
                        <div class="radio-row">
                            <label class="radio-label"><input type="radio" value="true" v-model="questionForm.correct_answer" /> True</label>
                            <label class="radio-label"><input type="radio" value="false" v-model="questionForm.correct_answer" /> False</label>
                        </div>
                    </FormField>

                    <FormField v-else label="Expected answer (keywords)">
                        <input v-model="questionForm.correct_answer" type="text" placeholder="Keywords separated by commas" />
                    </FormField>

                    <FormField label="Points">
                        <input v-model.number="questionForm.points" type="number" min="1" />
                    </FormField>
                </div>
                <template #footer>
                    <Button variant="ghost" size="sm" @click="$emit('close-question')">Cancel</Button>
                    <Button variant="solid" size="sm" @click="$emit('save-question')">{{ editingQuestion ? "Save changes" : "Add question" }}</Button>
                </template>
            </BaseModal>
        </BaseCard>

        <!-- Quizzes list -->
        <div v-else class="card-grid">
            <BaseCard v-for="quiz in quizzes" :key="quiz.id" padding="md">
                <div class="card-head">
                    <div>
                        <h3 class="card-title sm">{{ quiz.title }}</h3>
                        <span v-if="quiz.modules" class="muted-mono">{{ quiz.modules.title }}</span>
                    </div>
                    <div class="btn-row">
                        <Button variant="outline" size="sm" @click="$emit('open-quiz', quiz)">Edit</Button>
                        <Button variant="danger" size="sm" @click="$emit('delete-quiz', quiz.id)">Delete</Button>
                    </div>
                </div>
                <div class="meta-row">
                    <span>{{ quiz.questionCount }} questions</span>
                    <span>{{ quiz.time_limit_minutes }} min</span>
                    <span>Pass: {{ quiz.passing_score }}%</span>
                </div>
                <div class="mini-stats">
                    <div class="mini-stat">
                        <span class="mini-value">{{ quiz.attemptCount }}</span>
                        <span class="mini-label">Attempts</span>
                    </div>
                    <div class="mini-stat">
                        <span class="mini-value">{{ quiz.avgScore }}%</span>
                        <span class="mini-label">Avg score</span>
                    </div>
                    <div class="mini-stat">
                        <span class="mini-value">{{ quiz.passRate }}%</span>
                        <span class="mini-label">Pass rate</span>
                    </div>
                </div>
            </BaseCard>
        </div>
    </section>
</template>

<style scoped>
@import "@/styles/dashboard-sections.css";
</style>
