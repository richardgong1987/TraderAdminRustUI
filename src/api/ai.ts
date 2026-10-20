// AI training and testing. Backend design: abs_admin/doc/ai-training.md
import request from '@/utils/request'

export type Purpose = 'TRAIN' | 'TEST'
export type RunStatus = 'RUNNING' | 'DONE' | 'FAILED'
export type Outcome = 'CORRECT' | 'WRONG' | 'ERROR'

export interface ExampleImage {
  mime_type: string
  data_base64: string
}

export interface Example {
  id: string
  purpose: Purpose
  question_text: string
  expected_choice: string
  expected_explanation: string | null
  image_count: number
  create_date: string
  update_date: string
}

export interface ExampleDetail extends Example {
  images: ExampleImage[]
}

export interface ExampleSave {
  id?: string
  purpose: Purpose
  question_text: string
  expected_choice: string
  expected_explanation: string | null
  images: ExampleImage[]
}

export interface Version {
  id: string
  name: string
  base_model: string
  instructions: string
  example_count: number
  create_date: string
}

export type ExampleSelection = 'ALL' | 'SELECTED' | 'NONE'

export interface Run {
  id: string
  version_id: string
  version_name: string | null
  status: RunStatus
  total: number
  done: number
  correct: number
  errors: number
  error_message: string | null
  create_date: string
  finish_date: string | null
}

export interface RunResult {
  example_id: string
  question_text: string | null
  expected_choice: string
  outcome: Outcome
  model_choice: string | null
  model_explanation: string | null
  error_message: string | null
  prompt_tokens: number | null
  duration_ms: number | null
}

export interface RunDetail {
  run: Run
  results: RunResult[]
  num_ctx: number
}

export interface CompareRow {
  example_id: string
  question_text: string | null
  expected_choice: string
  a_outcome: Outcome
  a_choice: string | null
  b_outcome: Outcome
  b_choice: string | null
}

export interface Compare {
  run_a: Run
  run_b: Run
  common_count: number
  a_correct: number
  b_correct: number
  rows: CompareRow[]
}

interface ApiResponse<T> {
  code: string
  msg?: string
  data: T
}

function post<T>(url: string, data: any = {}, timeout?: number): Promise<ApiResponse<T>> {
  return request({ url, method: 'post', data, ...(timeout ? { timeout } : {}) }) as any
}

// Examples carry images, which can take longer than the default 5 s over a slow link.
const IMAGE_TIMEOUT = 60_000

export const examplePage = (purpose: Purpose, page_no: number, page_size: number) =>
  post<{ records: Example[]; total: number }>('/admin/ai_example_page', { purpose, page_no, page_size })
export const exampleDetail = (id: string) => post<ExampleDetail>('/admin/ai_example_detail', { id }, IMAGE_TIMEOUT)
export const exampleAdd = (arg: ExampleSave) => post<string>('/admin/ai_example_add', arg, IMAGE_TIMEOUT)
export const exampleUpdate = (arg: ExampleSave) => post<null>('/admin/ai_example_update', arg, IMAGE_TIMEOUT)
export const exampleRemove = (id: string) => post<number>('/admin/ai_example_remove', { id })
export const choices = () => post<string[]>('/admin/ai_choices')

export const versionList = () => post<Version[]>('/admin/ai_version_list')
export const versionAdd = (arg: { name: string; instructions: string; selection: ExampleSelection; example_ids: string[] }) =>
  post<string>('/admin/ai_version_add', arg)
export const versionRemove = (id: string) => post<number>('/admin/ai_version_remove', { id })

export const evalStart = (version_id: string) => post<string>('/admin/ai_eval_start', { version_id })
export const evalList = () => post<Run[]>('/admin/ai_eval_list')
export const evalDetail = (id: string) => post<RunDetail>('/admin/ai_eval_detail', { id })
export const evalCompare = (run_a: string, run_b: string) => post<Compare>('/admin/ai_eval_compare', { run_a, run_b })
