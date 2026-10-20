<template>
  <div>
    <div class="flex items-center gap-3 mb-3">
      <a-button type="primary" @click="openEditor(null)">{{ $t('ai.addExample') }}</a-button>
      <span class="text-gray-500">{{ hint }}</span>
    </div>
    <a-table
      :columns="columns"
      :dataSource="rows"
      :rowKey="(r: Example) => r.id"
      :loading="loading"
      :pagination="pagination"
      :rowSelection="selectable ? { selectedRowKeys: selected, onChange: onSelect, preserveSelectedRowKeys: true } : undefined"
      size="middle"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'question_text'">
          <span class="line-clamp-2">{{ record.question_text }}</span>
        </template>
        <template v-else-if="column.dataIndex === 'image_count'">
          <span v-if="record.image_count"><PictureOutlined /> {{ record.image_count }}</span>
          <span v-else class="text-gray-300">-</span>
        </template>
        <template v-else-if="column.dataIndex === 'expected_choice'">
          <a-tag color="blue">{{ record.expected_choice }}</a-tag>
        </template>
        <template v-else-if="column.dataIndex === 'expected_explanation'">
          <span class="line-clamp-2 text-gray-600">{{ record.expected_explanation }}</span>
        </template>
        <template v-else-if="column.dataIndex === 'action'">
          <div class="flex gap-3">
            <a class="text-blue-500" @click="openEditor(record.id)">{{ $t('common.edit') }}</a>
            <a class="text-red-500" @click="remove(record)">{{ $t('common.delete') }}</a>
          </div>
        </template>
      </template>
    </a-table>
    <ExampleEditor v-model:open="editorOpen" :purpose="purpose" :exampleId="editingId" @saved="fetch" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Modal } from 'ant-design-vue'
import { PictureOutlined } from '@ant-design/icons-vue'
import { examplePage, exampleRemove, type Example, type Purpose } from '@/api/ai'
import ExampleEditor from './ExampleEditor.vue'

const props = defineProps<{ purpose: Purpose; selectable?: boolean; selected?: string[] }>()
const emit = defineEmits<{ 'update:selected': [ids: string[]]; 'update:total': [total: number] }>()
const { t } = useI18n()

const rows = ref<Example[]>([])
const loading = ref(false)
const editorOpen = ref(false)
const editingId = ref<string | null>(null)
const pagination = reactive({ current: 1, pageSize: 10, total: 0 })
const selected = computed(() => props.selected ?? [])

const hint = computed(() => (props.purpose === 'TRAIN' ? t('ai.trainingHint') : t('ai.testHint')))
const columns = computed(() => [
  { title: t('ai.question'), dataIndex: 'question_text' },
  { title: t('ai.images'), dataIndex: 'image_count', width: 80 },
  { title: t('ai.choice'), dataIndex: 'expected_choice', width: 110 },
  { title: t('ai.explanation'), dataIndex: 'expected_explanation' },
  { title: t('common.createTime'), dataIndex: 'create_date', width: 170 },
  { title: t('common.operation'), dataIndex: 'action', width: 110 }
])

async function fetch() {
  loading.value = true
  try {
    const { data } = await examplePage(props.purpose, pagination.current, pagination.pageSize)
    rows.value = data.records
    pagination.total = data.total
    emit('update:total', data.total)
  } finally {
    loading.value = false
  }
}

function onTableChange(pag: { current: number }) {
  pagination.current = pag.current
  fetch()
}

function onSelect(keys: string[]) {
  emit('update:selected', keys)
}

function openEditor(id: string | null) {
  editingId.value = id
  editorOpen.value = true
}

function remove(example: Example) {
  Modal.confirm({
    title: t('common.deleteConfirm'),
    content: example.question_text.slice(0, 80),
    async onOk() {
      await exampleRemove(example.id)
      emit('update:selected', selected.value.filter((id) => id !== example.id))
      fetch()
    }
  })
}

onMounted(fetch)
</script>
