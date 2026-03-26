<template>
  <section class="space-y-6">
    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-bold md:text-3xl">{{ t('settings.title') }}</h1>
      <p class="text-sm opacity-80">{{ t('settings.subtitle') }}</p>
    </div>

    <!-- Loading -->
    <div v-if="pendingConfig || pendingStats" class="opacity-60">
      {{ t('loading') }}
    </div>

    <!-- Error -->
    <div v-else-if="configError || statsError" class="alert alert-error">
      {{ t('error.settings') }}
    </div>

    <div v-else class="space-y-6">
      <!-- Save feedback -->
      <div v-if="saveSuccess" class="alert alert-success text-sm">
        {{ t('settings.saveSuccess') }}
      </div>
      <div v-if="saveError" class="alert alert-error text-sm">
        {{ t('settings.saveError') }}
      </div>

      <!-- Configuration form -->
      <div class="card">
        <div class="p-6">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('settings.config.heading') }}</h2>

          <div class="mt-4 flex flex-col gap-6">
            <!-- enabled -->
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="font-semibold text-sm">{{ t('settings.config.enabled') }}</p>
                <p class="text-xs opacity-60">{{ t('settings.config.enabledDesc') }}</p>
              </div>
              <input type="checkbox" v-model="form.enabled" class="w-4 h-4" style="accent-color: var(--color-accent);" />
            </div>

            <!-- lobbyChannelId -->
            <div>
              <label class="field__label">{{ t('settings.config.lobbyChannelId') }}</label>
              <p class="mt-1 mb-2 text-xs opacity-60">{{ t('settings.config.lobbyChannelIdDesc') }}</p>
              <input
                v-model="form.lobbyChannelId"
                type="text"
                :placeholder="t('settings.config.idPlaceholder')"
                class="input w-full font-mono"
              />
            </div>

            <!-- temporaryVoiceCategoryId -->
            <div>
              <label class="field__label">{{ t('settings.config.categoryId') }}</label>
              <p class="mt-1 mb-2 text-xs opacity-60">{{ t('settings.config.categoryIdDesc') }}</p>
              <input
                v-model="form.temporaryVoiceCategoryId"
                type="text"
                :placeholder="t('settings.config.idPlaceholder')"
                class="input w-full font-mono"
              />
            </div>

            <!-- defaultChannelIcon -->
            <div>
              <label class="field__label">{{ t('settings.config.channelIcon') }}</label>
              <p class="mt-1 mb-2 text-xs opacity-60">{{ t('settings.config.channelIconDesc') }}</p>
              <input
                v-model="form.defaultChannelIcon"
                type="text"
                class="input w-32 text-xl"
              />
            </div>

            <!-- defaultChannelName -->
            <div>
              <label class="field__label">{{ t('settings.config.channelName') }}</label>
              <p class="mt-1 mb-2 text-xs opacity-60">{{ t('settings.config.channelNameDesc') }}</p>
              <input
                v-model="form.defaultChannelName"
                type="text"
                class="input w-full"
              />
            </div>

            <!-- countingStyle -->
            <div>
              <label class="field__label">{{ t('settings.config.countingStyle') }}</label>
              <p class="mt-1 mb-2 text-xs opacity-60">{{ t('settings.config.countingStyleDesc') }}</p>
              <select v-model="form.countingStyle" class="select w-full sm:w-56">
                <option value="numeric">{{ t('settings.config.countingNumeric') }}</option>
                <option value="emoji">{{ t('settings.config.countingEmoji') }}</option>
              </select>
            </div>

            <!-- maxManagedChannels -->
            <div class="field">
              <label class="field__label">{{ t('settings.config.maxChannels') }}</label>
              <input
                v-model.number="form.maxManagedChannels"
                type="number"
                min="1"
                max="500"
                class="input w-32"
              />
            </div>

            <!-- renameEnabled -->
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="font-semibold text-sm">{{ t('settings.config.renameEnabled') }}</p>
                <p class="text-xs opacity-60">{{ t('settings.config.renameEnabledDesc') }}</p>
              </div>
              <input type="checkbox" v-model="form.renameEnabled" class="w-4 h-4" style="accent-color: var(--color-accent);" />
            </div>

            <!-- activityTrackingEnabled -->
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="font-semibold text-sm">{{ t('settings.config.activityTracking') }}</p>
                <p class="text-xs opacity-60">{{ t('settings.config.activityTrackingDesc') }}</p>
              </div>
              <input type="checkbox" v-model="form.activityTrackingEnabled" class="w-4 h-4" style="accent-color: var(--color-accent);" />
            </div>
          </div>

          <!-- Save button -->
          <div class="mt-8 border-t border-[var(--color-line)] pt-6">
            <button @click="save" :disabled="saving" class="btn btn-primary btn-sm">
              {{ saving ? t('settings.saving') : t('settings.save') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Statistics -->
      <div class="card">
        <div class="p-6">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('settings.stats.heading') }}</h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="stat">
              <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{{ t('settings.stats.managedChannels') }}</div>
              <div class="text-2xl font-bold text-[var(--color-accent)]">{{ stats?.managedChannels ?? 0 }}</div>
            </div>
            <div class="stat">
              <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{{ t('settings.stats.trackedMembers') }}</div>
              <div class="text-2xl font-bold text-[var(--color-accent)]">{{ stats?.trackedMembers ?? 0 }}</div>
            </div>
            <div class="stat">
              <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{{ t('settings.stats.totalHours') }}</div>
              <div class="text-2xl font-bold text-[var(--color-accent)]">{{ totalHours }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n, useFetch, $fetch } from '@guildora/hub'

const { t } = useI18n()

const { data: config, pending: pendingConfig, error: configError } = await useFetch('/api/apps/temporary-voice-channels/config')
const { data: stats, pending: pendingStats, error: statsError } = await useFetch('/api/apps/temporary-voice-channels/settings')

const form = ref({
  enabled: config.value?.enabled ?? true,
  lobbyChannelId: config.value?.lobbyChannelId ?? '',
  temporaryVoiceCategoryId: config.value?.temporaryVoiceCategoryId ?? '',
  defaultChannelIcon: config.value?.defaultChannelIcon ?? '🔵',
  defaultChannelName: config.value?.defaultChannelName ?? 'Voice Room',
  countingStyle: config.value?.countingStyle ?? 'numeric',
  maxManagedChannels: config.value?.maxManagedChannels ?? 50,
  renameEnabled: config.value?.renameEnabled ?? true,
  activityTrackingEnabled: config.value?.activityTrackingEnabled ?? true
})

const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref(false)

const totalHours = computed(() => {
  const seconds = stats.value?.totalTrackedSeconds ?? 0
  return (seconds / 3600).toFixed(1)
})

async function save() {
  saving.value = true
  saveSuccess.value = false
  saveError.value = false
  try {
    await $fetch('/api/apps/temporary-voice-channels/config', {
      method: 'PUT',
      body: {
        ...form.value,
        __roleOverrides: config.value?.__roleOverrides ?? {}
      }
    })
    saveSuccess.value = true
  } catch {
    saveError.value = true
  } finally {
    saving.value = false
  }
}
</script>
