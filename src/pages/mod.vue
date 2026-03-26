<template>
  <section class="space-y-6">
    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-bold md:text-3xl">{{ t('mod.title') }}</h1>
      <p class="text-sm opacity-80">{{ t('mod.subtitle') }}</p>
    </div>

    <!-- Send announcement form -->
    <div class="card">
      <div class="p-6 space-y-4">
        <h2 class="text-base font-semibold text-[var(--color-text-primary)]">{{ t('mod.announce.heading') }}</h2>

        <!-- No channel warning -->
        <div v-if="noChannel" class="alert alert-warning text-sm">
          {{ t('mod.announce.noChannel') }}
        </div>

        <form @submit.prevent="sendAnnouncement" class="flex flex-col gap-4">
          <textarea
            v-model="message"
            :placeholder="t('mod.announce.messagePlaceholder')"
            rows="4"
            class="textarea w-full"
          />
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              :disabled="submitting || !message.trim()"
              class="btn btn-primary btn-sm"
            >
              {{ submitting ? t('mod.announce.submitting') : t('mod.announce.submit') }}
            </button>
            <p v-if="successMessage" class="text-sm" style="color: var(--color-success);">{{ successMessage }}</p>
            <p v-if="errorMessage" class="text-sm" style="color: var(--color-error);">{{ errorMessage }}</p>
          </div>
        </form>
      </div>
    </div>

    <!-- Recent actions log -->
    <div class="card">
      <div class="p-6">
        <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('mod.log.heading') }}</h2>
        <p v-if="!actionLog.length" class="text-sm opacity-60">
          {{ t('mod.log.empty') }}
        </p>
        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="(entry, i) in actionLog"
            :key="i"
            class="text-sm py-2 border-b border-[var(--color-line)] last:border-0"
          >
            {{ t('mod.log.announced', { message: entry }) }}
          </li>
        </ul>
      </div>
    </div>
  </section>
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
