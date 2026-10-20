<template>
  <a-drawer :open="runId !== null" :title="title" width="900" @close="emit('close')">
    <a-spin :spinning="loading">
      <a-alert
        v-if="nearContextLimit"
        type="warning"
        show-icon
        class="mb-3"
        :message="$t('ai.contextWarning', { max: detail?.num_ctx })"
      />
      <a-alert v-if="detail?.run.error_message" type="error" show-icon class="mb-3" :message="detail.run.error_message" />
      <a-table :columns="columns" :dataSource="detail?.results ?? []" rowKey="example_id" :pagination="false" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'question_text'">
            <span class="line-clamp-3">{{ record.question_text ?? $t('ai.deletedExample') }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'outcome'">
            <a-tag :color="OUTCOME_COLOR[record.outcome as Outcome]">{{ $t('ai.' + record.outcome) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'model_choice'">
            <b>{{ record.model_choice }}</b>
            <div class="text-gray-600 text-xs">{{ record.model_explanation ?? record.error_message }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'stats'">
            <div class="text-xs text-gray-500">
              <div :class="{ 'text-orange-500': isNearLimit(record.prompt_tokens) }">{{ record.prompt_tokens ?? '-' }} tokens</div>
              <div>{{ record.duration_ms != null ? (record.duration_ms / 1000).toFixed(1) + ' s' : '-' }}</div>
            </div>
          </template>
        </template>
      </a-table>
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { evalDetail, type Outcome, type RunDetail } from '@/api/ai'
import { OUTCOME_COLOR } from './outcome'

const props = defineProps<{ runId: string | null }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const detail = ref<RunDetail | null>(null)
const loading = ref(false)

const title = computed(() => {
  const run = detail.value?.run
  return run ? `${run.version_name ?? ''} · ${run.create_date} · ${run.correct}/${run.total}` : ''
})
const columns = computed(() => [
  { title: t('ai.question'), dataIndex: 'question_text' },
  { title: t('ai.expected'), dataIndex: 'expected_choice', width: 100 },
  { title: t('ai.outcome'), dataIndex: 'outcome', width: 80 },
  { title: t('ai.modelAnswer'), dataIndex: 'model_choice', width: 300 },
  { title: '', dataIndex: 'stats', width: 100 }
])

// Ollama drops the start of a prompt that doesn't fit, which silently loses worked examples.
const isNearLimit = (tokens: number | null) => !!detail.value && tokens != null && tokens > detail.value.num_ctx * 0.9
const nearContextLimit = computed(() => detail.value?.results.some((r) => isNearLimit(r.prompt_tokens)))

watch(
  () => props.runId,
  async (id) => {
    detail.value = null
    if (!id) return
    loading.value = true
    try {
      detail.value = (await evalDetail(id)).data
    } finally {
      loading.value = false
    }
  }
)
</script>
