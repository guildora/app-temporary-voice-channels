<template>
  <div class="p-6 font-nunito">
    <!-- Page header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold" style="color: var(--color-text, #111)">
        {{ t('mod.title') }}
      </h1>
      <p class="mt-1 text-sm" style="color: var(--color-text-muted, #666)">
        {{ t('mod.subtitle') }}
      </p>
    </div>

    <!-- Send announcement form -->
    <div
      style="border: 1px solid var(--color-border, #e5e7eb); background: var(--color-surface, #fff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem;"
    >
      <h2 class="mb-4 font-bold font-nunito" style="color: var(--color-text, #111)">
        {{ t('mod.announce.heading') }}
      </h2>

      <!-- No channel warning -->
      <p
        v-if="noChannel"
        class="mb-3 text-sm font-nunito"
        style="color: #d97706; background: #fffbeb; border: 1px solid #fcd34d; padding: 0.75rem; border-radius: 0.375rem;"
      >
        {{ t('mod.announce.noChannel') }}
      </p>

      <form @submit.prevent="sendAnnouncement" style="display: flex; flex-direction: column; gap: 0.75rem;">
        <textarea
          v-model="message"
          :placeholder="t('mod.announce.messagePlaceholder')"
          rows="4"
          style="width: 100%; border: 1px solid var(--color-border, #d1d5db); border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; font-family: inherit; resize: vertical;"
        />
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <button
            type="submit"
            :disabled="submitting || !message.trim()"
            class="font-nunito"
            style="background: var(--color-accent, #ff206e); color: #fff; border: none; border-radius: 0.375rem; padding: 0.5rem 1.25rem; font-size: 0.875rem; font-weight: 600; cursor: pointer;"
          >
            {{ submitting ? t('mod.announce.submitting') : t('mod.announce.submit') }}
          </button>
          <p v-if="successMessage" class="text-sm font-nunito" style="color: #16a34a;">
            {{ successMessage }}
          </p>
          <p v-if="errorMessage" class="text-sm font-nunito" style="color: #dc2626;">
            {{ errorMessage }}
          </p>
        </div>
      </form>
    </div>

    <!-- Recent actions log -->
    <div
      style="border: 1px solid var(--color-border, #e5e7eb); background: var(--color-surface, #fff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
    >
      <h2 class="mb-4 font-bold font-nunito" style="color: var(--color-text, #111)">
        {{ t('mod.log.heading') }}
      </h2>
      <p v-if="!actionLog.length" class="text-sm font-nunito" style="color: var(--color-text-muted, #666)">
        {{ t('mod.log.empty') }}
      </p>
      <ul v-else style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem;">
        <li
          v-for="(entry, i) in actionLog"
          :key="i"
          class="text-sm font-nunito"
          style="color: var(--color-text, #111); padding: 0.5rem 0; border-bottom: 1px solid var(--color-border, #e5e7eb);"
        >
          {{ t('mod.log.announced', { message: entry }) }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from '@guildora/hub'

const { t } = useI18n()

const message = ref('')
const submitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const noChannel = ref(false)
const actionLog = ref([])

async function sendAnnouncement() {
  if (!message.value.trim()) return
  submitting.value = true
  successMessage.value = ''
  errorMessage.value = ''
  noChannel.value = false

  try {
    await $fetch('/api/apps/temporary-voice-channels/announce', {
      method: 'POST',
      body: { message: message.value.trim() }
    })
    successMessage.value = t('mod.announce.success')
    actionLog.value.unshift(message.value.trim())
    message.value = ''
  } catch (e) {
    const status = e?.response?.status
    if (status === 422) {
      noChannel.value = true
    } else {
      errorMessage.value = t('error.announce', { message: e?.message ?? String(status) })
    }
  } finally {
    submitting.value = false
  }
}
</script>
