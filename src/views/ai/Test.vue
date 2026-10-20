<template>
  <AdminLayout>
    <div class="dataBody">
      <h3 class="text-base font-semibold mt-0 mb-2">{{ $t('ai.testExamples') }}</h3>
      <ExampleList purpose="TEST" v-model:total="testCount" />

      <h3 class="text-base font-semibold mt-6 mb-2">{{ $t('ai.runs') }}</h3>
      <div class="flex items-center gap-3 mb-3">
        <a-select
          v-model:value="versionId"
          :options="versions.map((v) => ({ value: v.id, label: `${v.name} (${v.example_count})` }))"
          :placeholder="$t('ai.selectVersion')"
          :notFoundContent="$t('ai.noVersions')"
          style="width: 260px"
        />
        <a-button type="primary" :disabled="!versionId || !testCount || isRunning" :loading="starting" @click="start">
          <template #icon><PlayCircleOutlined /></template>
          {{ $t('ai.startTest') }}
        </a-button>
        <a-button :disabled="compareIds.length !== 2" @click="openCompare">
          {{ $t('ai.compare') }} ({{ compareIds.length }}/2)
        </a-button>
      </div>

      <a-table
        :columns="runColumns"
        :dataSource="runs"
        rowKey="id"
        :pagination="{ pageSize: 10 }"
        :rowSelection="{ selectedRowKeys: compareIds, onChange: selectForCompare, hideSelectAll: true }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <a-progress
              v-if="record.status === 'RUNNING'"
              :percent="Math.round((100 * record.done) / Math.max(record.total, 1))"
              :format="() => `${record.done}/${record.total}`"
              size="small"
              status="active"
            />
            <a-tag v-else :color="record.status === 'DONE' ? 'blue' : 'red'">{{ $t('ai.' + record.status) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'score'">
            <b>{{ percent(record) }}%</b>
            <span class="text-gray-500"> ({{ record.correct }}/{{ record.total }})</span>
            <span v-if="record.errors" class="text-orange-500"> · {{ record.errors }} {{ $t('ai.ERROR') }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'change'">
            <span v-if="changeFromPrevious(record) !== null" :class="changeClass(changeFromPrevious(record)!)">
              {{ changeFromPrevious(record)! > 0 ? '+' : '' }}{{ changeFromPrevious(record) }}%
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a class="text-blue-500" @click="detailRunId = record.id">{{ $t('ai.details') }}</a>
          </template>
        </template>
      </a-table>

      <RunDetail :runId="detailRunId" @close="detailRunId = null" />
      <RunCompare :runIds="compareRuns" @close="compareRuns = null" />
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { PlayCircleOutlined } from '@ant-design/icons-vue'
import AdminLayout from '@/components/AdminLayout.vue'
import ExampleList from '@/components/ai/ExampleList.vue'
import RunDetail from '@/components/ai/RunDetail.vue'
import RunCompare from '@/components/ai/RunCompare.vue'
import { evalList, evalStart, versionList, type Run, type Version } from '@/api/ai'

const POLL_MS = 3000

const { t } = useI18n()
const route = useRoute()

const testCount = ref(0)
const versions = ref<Version[]>([])
const versionId = ref<string | undefined>((route.query.version as string) || undefined)
const runs = ref<Run[]>([])
const starting = ref(false)
const detailRunId = ref<string | null>(null)
const compareIds = ref<string[]>([])
const compareRuns = ref<[string, string] | null>(null)
let pollTimer: number | undefined

const isRunning = computed(() => runs.value.some((r) => r.status === 'RUNNING'))
const runColumns = computed(() => [
  { title: t('ai.versionName'), dataIndex: 'version_name' },
  { title: t('ai.status'), dataIndex: 'status', width: 180 },
  { title: t('ai.score'), dataIndex: 'score', width: 220 },
  { title: t('ai.change'), dataIndex: 'change', width: 90 },
  { title: t('common.createTime'), dataIndex: 'create_date', width: 170 },
  { title: t('common.operation'), dataIndex: 'action', width: 80 }
])

const percent = (run: Run) => Math.round((100 * run.correct) / Math.max(run.total, 1))

/** Score change from the finished run before this one. A rough signal: use Compare for an exact answer. */
function changeFromPrevious(run: Run): number | null {
  if (run.status !== 'DONE') return null
  const index = runs.value.indexOf(run)
  const previous = runs.value.slice(index + 1).find((r) => r.status === 'DONE')
  return previous ? percent(run) - percent(previous) : null
}

const changeClass = (delta: number) => (delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-gray-500')

function selectForCompare(keys: string[]) {
  // Keep the two most recent picks.
  compareIds.value = keys.slice(-2)
}

/** A is the older run and B the newer, so "fixed" means the newer version got it right. */
function openCompare() {
  const [newer, older] = runs.value.filter((r) => compareIds.value.includes(r.id))
  compareRuns.value = [older.id, newer.id]
}

async function fetchRuns() {
  runs.value = (await evalList()).data
  window.clearTimeout(pollTimer)
  if (isRunning.value) pollTimer = window.setTimeout(fetchRuns, POLL_MS)
}

async function start() {
  starting.value = true
  try {
    await evalStart(versionId.value!)
    message.success(t('ai.testStarted'))
    await fetchRuns()
  } catch {
    // Shown by the request interceptor.
  } finally {
    starting.value = false
  }
}

onMounted(async () => {
  versions.value = (await versionList()).data
  fetchRuns()
})
onUnmounted(() => window.clearTimeout(pollTimer))
</script>

<style lang="less">
.dataBody {
  background: #ffffff;
  padding: 10px;
}
</style>
