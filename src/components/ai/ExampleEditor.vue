<template>
  <a-modal
    :open="open"
    :title="exampleId ? $t('ai.editExample') : $t('ai.addExample')"
    :width="720"
    :maskClosable="false"
    :confirmLoading="saving"
    destroyOnClose
    centered
    @ok="save"
    @cancel="emit('update:open', false)"
  >
    <a-spin :spinning="loading">
      <!-- Paste anywhere in the dialog: images are captured here, text goes into the focused field as usual. -->
      <div @paste="onPaste" @drop.prevent="onDrop" @dragover.prevent>
        <a-form layout="vertical">
          <a-form-item :label="$t('ai.images')">
            <div
              class="paste-zone"
              tabindex="0"
              @click="fileInput?.click()"
            >
              {{ $t('ai.pasteHint') }}
            </div>
            <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onPick" />
            <div v-if="form.images.length" class="thumbs">
              <div v-for="(image, i) in form.images" :key="i" class="thumb">
                <a-image :src="toDataUrl(image)" :width="120" :height="80" style="object-fit: contain" />
                <CloseCircleFilled class="thumb-remove" @click="form.images.splice(i, 1)" />
              </div>
            </div>
          </a-form-item>

          <a-form-item :label="$t('ai.question')">
            <a-textarea
              v-model:value="form.question_text"
              :rows="4"
              :placeholder="$t('ai.questionPlaceholder')"
            />
          </a-form-item>

          <a-form-item :label="$t('ai.choice')" required>
            <a-auto-complete
              v-model:value="form.expected_choice"
              :options="choiceOptions"
              :placeholder="$t('ai.choicePlaceholder')"
              style="width: 240px"
            />
          </a-form-item>

          <a-form-item :label="$t('ai.explanationOptional')">
            <a-textarea v-model:value="form.expected_explanation" :rows="2" />
          </a-form-item>
        </a-form>
        <a-alert v-if="exampleId && purpose === 'TRAIN'" type="info" show-icon :message="$t('ai.editChangesVersions')" />
      </div>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { CloseCircleFilled } from '@ant-design/icons-vue'
import { choices, exampleAdd, exampleDetail, exampleUpdate, type ExampleImage, type Purpose } from '@/api/ai'
import { imageFiles, toDataUrl, toExampleImage } from '@/utils/image'

// Matches MAX_IMAGES in the backend (ai_example_service.rs).
const MAX_IMAGES = 5
const DEFAULT_CHOICES = ['BUY', 'SELL', 'HOLD']

const props = defineProps<{ open: boolean; purpose: Purpose; exampleId: string | null }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [] }>()
const { t } = useI18n()

const loading = ref(false)
const saving = ref(false)
const fileInput = ref<HTMLInputElement>()
const knownChoices = ref<string[]>([])
const form = reactive({
  question_text: '',
  expected_choice: '',
  expected_explanation: '' as string | null,
  images: [] as ExampleImage[]
})

const choiceOptions = computed(() =>
  [...new Set([...knownChoices.value, ...DEFAULT_CHOICES])].map((value) => ({ value }))
)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    Object.assign(form, { question_text: '', expected_choice: '', expected_explanation: '', images: [] })
    choices().then((res) => (knownChoices.value = res.data))
    if (props.exampleId) {
      loading.value = true
      try {
        const { data } = await exampleDetail(props.exampleId)
        Object.assign(form, {
          question_text: data.question_text,
          expected_choice: data.expected_choice,
          expected_explanation: data.expected_explanation ?? '',
          images: data.images
        })
      } finally {
        loading.value = false
      }
    }
  }
)

async function addImages(files: File[]) {
  for (const file of files) {
    if (form.images.length >= MAX_IMAGES) {
      message.warning(t('ai.maxImages', { n: MAX_IMAGES }))
      return
    }
    try {
      form.images.push(await toExampleImage(file))
    } catch {
      message.error(t('ai.imageReadFailed'))
    }
  }
}

function onPaste(event: ClipboardEvent) {
  const files = imageFiles(event.clipboardData)
  if (files.length) {
    event.preventDefault()
    addImages(files)
  }
}

function onDrop(event: DragEvent) {
  addImages(imageFiles(event.dataTransfer))
}

function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  addImages(Array.from(input.files ?? []))
  input.value = ''
}

async function save() {
  saving.value = true
  try {
    const arg = { ...form, purpose: props.purpose, id: props.exampleId ?? undefined }
    await (props.exampleId ? exampleUpdate(arg) : exampleAdd(arg))
    emit('update:open', false)
    emit('saved')
  } catch {
    // The request interceptor already showed the error; keep the dialog open so nothing is lost.
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less" scoped>
.paste-zone {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  padding: 18px;
  text-align: center;
  color: #8c8c8c;
  cursor: pointer;
  &:hover,
  &:focus {
    border-color: #1677ff;
    outline: none;
  }
}
.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.thumb {
  position: relative;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}
.thumb-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  color: #ff4d4f;
  font-size: 16px;
  cursor: pointer;
  background: #fff;
  border-radius: 50%;
}
</style>
