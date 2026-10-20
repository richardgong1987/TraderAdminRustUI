<template>
  <AdminLayout>
    <div class="dataBody">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-base font-semibold m-0">{{ $t('ai.trainingExamples') }}</h3>
        <a-button type="primary" @click="openTrain">
          <template #icon><ExperimentOutlined /></template>
          {{ $t('ai.train') }}
        </a-button>
      </div>
      <ExampleList purpose="TRAIN" selectable v-model:selected="selectedIds" v-model:total="trainingCount" />

      <h3 class="text-base font-semibold mt-6 mb-2">{{ $t('ai.versions') }}</h3>
      <a-table :columns="versionColumns" :dataSource="versions" rowKey="id" :pagination="false" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'instructions'">
            <span class="line-clamp-2 text-gray-600">{{ record.instructions }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <div class="flex gap-3">
              <a class="text-blue-500" @click="router.push({ path: '/ai/test', query: { version: record.id } })">
                {{ $t('ai.startTest') }}
              </a>
              <a class="text-red-500" @click="removeVersion(record)">{{ $t('common.delete') }}</a>
            </div>
          </template>
        </template>
      </a-table>

      <a-modal
        v-model:open="trainOpen"
        :title="$t('ai.trainTitle')"
        :width="620"
        :confirmLoading="training"
        centered
        @ok="train"
      >
        <a-alert type="info" show-icon :message="$t('ai.trainHowItWorks')" class="mb-4" />
        <a-form layout="vertical">
          <a-form-item :label="$t('ai.versionName')">
            <a-input v-model:value="trainForm.name" :placeholder="$t('ai.versionNamePlaceholder')" />
          </a-form-item>
          <a-form-item :label="$t('ai.instructions')">
            <a-textarea v-model:value="trainForm.instructions" :rows="4" :placeholder="$t('ai.instructionsPlaceholder')" />
          </a-form-item>
          <a-form-item :label="$t('ai.include')">
            <a-radio-group v-model:value="trainForm.selection">
              <a-radio value="ALL" class="block">{{ $t('ai.includeAll', { n: trainingCount }) }}</a-radio>
              <a-radio value="SELECTED" class="block" :disabled="!selectedIds.length">
                {{ $t('ai.includeSelected', { n: selectedIds.length }) }}
              </a-radio>
              <a-radio value="NONE" class="block">{{ $t('ai.includeNone') }}</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-form>
      </a-modal>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Modal, message } from 'ant-design-vue'
import { ExperimentOutlined } from '@ant-design/icons-vue'
import AdminLayout from '@/components/AdminLayout.vue'
import ExampleList from '@/components/ai/ExampleList.vue'
import { versionAdd, versionList, versionRemove, type ExampleSelection, type Version } from '@/api/ai'

const { t } = useI18n()
const router = useRouter()

const selectedIds = ref<string[]>([])
const trainingCount = ref(0)
const versions = ref<Version[]>([])
const trainOpen = ref(false)
const training = ref(false)
const trainForm = reactive({ name: '', instructions: '', selection: 'ALL' as ExampleSelection })

const versionColumns = computed(() => [
  { title: t('ai.versionName'), dataIndex: 'name', width: 160 },
  { title: t('ai.exampleCount'), dataIndex: 'example_count', width: 90 },
  { title: t('ai.instructions'), dataIndex: 'instructions' },
  { title: t('ai.baseModel'), dataIndex: 'base_model', width: 130 },
  { title: t('common.createTime'), dataIndex: 'create_date', width: 170 },
  { title: t('common.operation'), dataIndex: 'action', width: 130 }
])

async function fetchVersions() {
  versions.value = (await versionList()).data
}

function openTrain() {
  // Start from the latest version's instructions: training usually changes them a little at a time.
  Object.assign(trainForm, {
    name: '',
    instructions: versions.value[0]?.instructions ?? '',
    selection: selectedIds.value.length ? 'SELECTED' : 'ALL'
  })
  trainOpen.value = true
}

async function train() {
  training.value = true
  try {
    await versionAdd({ ...trainForm, example_ids: selectedIds.value })
    trainOpen.value = false
    await fetchVersions()
    message.success(t('ai.trainDone', { name: versions.value[0]?.name }))
  } catch {
    // Shown by the request interceptor.
  } finally {
    training.value = false
  }
}

function removeVersion(version: Version) {
  Modal.confirm({
    title: t('common.deleteConfirm'),
    content: t('ai.deleteVersionContent', { name: version.name }),
    async onOk() {
      await versionRemove(version.id)
      fetchVersions()
    }
  })
}

onMounted(fetchVersions)
</script>

<style lang="less">
.dataBody {
  background: #ffffff;
  padding: 10px;
}
</style>
