<template>
  <section class="space-y-6">
    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-bold md:text-3xl">{{ t('admin.title') }}</h1>
      <p class="text-sm opacity-80">{{ t('admin.subtitle') }}</p>
    </div>

    <!-- Loading -->
    <div v-if="pendingConfig" class="opacity-60">
      {{ t('loading') }}
    </div>

    <div v-else class="space-y-6">
      <!-- Save feedback -->
      <div v-if="saveSuccess" class="alert alert-success text-sm">
        {{ t('admin.saveSuccess') }}
      </div>
      <div v-if="saveError" class="alert alert-error text-sm">
        {{ t('admin.saveError') }}
      </div>

      <!-- Role management -->
      <div class="card">
        <div class="p-6">
          <h2 class="mb-3 text-base font-semibold text-[var(--color-text-primary)]">{{ t('admin.roles.heading') }}</h2>
          <p class="text-sm opacity-60">{{ t('admin.roles.description') }}</p>

          <div class="mt-4 flex flex-col gap-4">
            <label
              v-for="role in availableRoles"
              :key="role.value"
              class="flex items-center gap-3 cursor-pointer"
            >
              <input
                type="checkbox"
                :value="role.value"
                v-model="selectedRoles"
                :disabled="role.value === 'admin'"
                class="w-4 h-4"
                style="accent-color: var(--color-accent);"
              />
              <span>
                <span class="font-semibold text-sm">{{ role.label }}</span>
                <span class="text-xs opacity-60 ml-2">{{ role.description }}</span>
              </span>
            </label>
          </div>

          <p class="mt-4 text-xs opacity-60">{{ t('admin.roles.adminNote') }}</p>

          <div class="mt-8 border-t border-[var(--color-line)] pt-6">
            <button @click="save" :disabled="saving" class="btn btn-primary btn-sm">
              {{ saving ? t('admin.saving') : t('admin.save') }}
            </button>
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

const { data: config, pending: pendingConfig } = await useFetch('/api/apps/temporary-voice-channels/config')

const availableRoles = computed(() => [
  { value: 'user', label: t('admin.roles.user'), description: t('admin.roles.userDesc') },
  { value: 'moderator', label: t('admin.roles.moderator'), description: t('admin.roles.moderatorDesc') },
  { value: 'admin', label: t('admin.roles.admin'), description: t('admin.roles.adminDesc') }
])

const currentOverrides = computed(() => {
  const overrides = config.value?.__roleOverrides
  if (typeof overrides === 'object' && overrides !== null && !Array.isArray(overrides)) {
    return overrides
  }
  return {}
})

const selectedRoles = ref(
  Array.isArray(currentOverrides.value['temporary-voice-channels-settings'])
    ? [...currentOverrides.value['temporary-voice-channels-settings']]
    : ['moderator', 'admin']
)

// admin is always included
function ensureAdmin(roles) {
  if (!roles.includes('admin')) return [...roles, 'admin']
  return roles
}

const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref(false)

async function save() {
  saving.value = true
  saveSuccess.value = false
  saveError.value = false
  const roles = ensureAdmin(selectedRoles.value)
  try {
    await $fetch('/api/apps/temporary-voice-channels/config', {
      method: 'PUT',
      body: {
        ...(config.value ?? {}),
        __roleOverrides: {
          ...currentOverrides.value,
          'temporary-voice-channels-settings': roles
        }
      }
    })
    selectedRoles.value = roles
    saveSuccess.value = true
  } catch {
    saveError.value = true
  } finally {
    saving.value = false
  }
}
</script>
