<template>
  <a-modal :open="runIds !== null" :title="$t('ai.compareTitle')" :width="900" :footer="null" @cancel="emit('close')">
    <a-spin :spinning="loading">
      <template v-if="data">
        <p class="text-gray-500">{{ $t('ai.compareHint', { n: data.common_count }) }}</p>
        <div class="flex gap-8 mb-4">
          <a-statistic :title="`A · ${data.run_a.version_name} · ${data.run_a.create_date}`" :value="`${data.a_correct} / ${data.common_count}`" />
          <a-statistic :title="`B · ${data.run_b.version_name} · ${data.run_b.create_date}`" :value="`${data.b_correct} / ${data.common_count}`" />
        </div>
        <a-table :columns="columns" :dataSource="data.rows" rowKey="example_id" :pagination="false" size="small">
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'question_text'">
              <span class="line-clamp-2">{{ record.question_text ?? $t('ai.deletedExample') }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'a' || column.dataIndex === 'b'">
              <a-tag :color="OUTCOME_COLOR[record[column.dataIndex + '_outcome'] as Outcome]">
                {{ record[column.dataIndex + '_choice'] ?? $t('ai.ERROR') }}
              </a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'change'">
              <a-tag :color="CHANGE_COLOR[change(record)]">{{ $t('ai.' + change(record)) }}</a-tag>
            </template>
          </template>
        </a-table>
      </template>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { evalCompare, type Compare, type CompareRow, type Outcome } from '@/api/ai'
import { OUTCOME_COLOR } from './outcome'

type Change = 'fixed' | 'broke' | 'bothCorrect' | 'bothWrong'
const CHANGE_COLOR: Record<Change, string> = { fixed: 'green', broke: 'red', bothCorrect: 'default', bothWrong: 'default' }

const props = defineProps<{ runIds: [string, string] | null }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const data = ref<Compare | null>(null)
const loading = ref(false)

const columns = computed(() => [
  { title: t('ai.question'), dataIndex: 'question_text' },
  { title: t('ai.expected'), dataIndex: 'expected_choice', width: 100 },
  { title: 'A', dataIndex: 'a', width: 100 },
  { title: 'B', dataIndex: 'b', width: 100 },
  { title: t('ai.change'), dataIndex: 'change', width: 100 }
])

function change(row: CompareRow): Change {
  const a = row.a_outcome === 'CORRECT'
  const b = row.b_outcome === 'CORRECT'
  if (a === b) return a ? 'bothCorrect' : 'bothWrong'
  return b ? 'fixed' : 'broke'
}

watch(
  () => props.runIds,
  async (ids) => {
    data.value = null
    if (!ids) return
    loading.value = true
    try {
      data.value = (await evalCompare(ids[0], ids[1])).data
    } finally {
      loading.value = false
    }
  }
)
</script>
