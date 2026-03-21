<template>
  <div class="p-6 font-nunito">
    <!-- Page header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold" style="color: var(--color-text, #111)">
        {{ t('admin.title') }}
      </h1>
      <p class="mt-1 text-sm" style="color: var(--color-text-muted, #666)">
        {{ t('admin.subtitle') }}
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="pendingConfig || pendingSettings" class="font-nunito" style="color: var(--color-text-muted, #666)">
      {{ t('loading') }}
    </div>

    <!-- Error state -->
    <div
      v-else-if="configError || settingsError"
      style="border: 1px solid #f87171; background: #fef2f2; padding: 1rem; border-radius: 0.5rem; color: #b91c1c;"
    >
      {{ t('error.settings') }}
    </div>

    <div v-else class="space-y-6">
      <!-- Current configuration -->
      <div
        style="border: 1px solid var(--color-border, #e5e7eb); background: var(--color-surface, #fff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
      >
        <h2 class="mb-4 font-bold font-nunito" style="color: var(--color-text, #111)">
          {{ t('admin.config.heading') }}
        </h2>
        <dl style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <dt class="text-xs font-semibold font-nunito" style="color: var(--color-text-muted, #666); text-transform: uppercase; letter-spacing: 0.05em;">
              {{ t('admin.config.welcomeEnabled') }}
            </dt>
            <dd class="mt-1 font-nunito" style="color: var(--color-text, #111)">
              {{ config?.welcomeEnabled ? t('admin.config.enabled') : t('admin.config.disabled') }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-semibold font-nunito" style="color: var(--color-text-muted, #666); text-transform: uppercase; letter-spacing: 0.05em;">
              {{ t('admin.config.welcomeMessage') }}
            </dt>
            <dd class="mt-1 font-nunito" style="color: var(--color-text, #111); font-family: monospace;">
              {{ config?.welcomeMessage || t('admin.config.notSet') }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-semibold font-nunito" style="color: var(--color-text-muted, #666); text-transform: uppercase; letter-spacing: 0.05em;">
              {{ t('admin.config.announcementChannelId') }}
            </dt>
            <dd class="mt-1 font-nunito" style="color: var(--color-text, #111); font-family: monospace;">
              {{ config?.announcementChannelId || t('admin.config.notSet') }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- App statistics -->
      <div
        style="border: 1px solid var(--color-border, #e5e7eb); background: var(--color-surface, #fff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
      >
        <h2 class="mb-4 font-bold font-nunito" style="color: var(--color-text, #111)">
          {{ t('admin.settings.heading') }}
        </h2>
        <dl style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <dt class="text-xs font-semibold font-nunito" style="color: var(--color-text-muted, #666); text-transform: uppercase; letter-spacing: 0.05em;">
              {{ t('admin.settings.version') }}
            </dt>
            <dd class="mt-1 text-2xl font-bold font-nunito" style="color: var(--color-accent, #ff206e)">
              {{ settings?.version ?? '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-semibold font-nunito" style="color: var(--color-text-muted, #666); text-transform: uppercase; letter-spacing: 0.05em;">
              {{ t('admin.settings.totalMembers') }}
            </dt>
            <dd class="mt-1 text-2xl font-bold font-nunito" style="color: var(--color-accent, #ff206e)">
              {{ settings?.totalMembers ?? 0 }}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n, useFetch } from '@guildora/hub'

const { t } = useI18n()

const { data: config, pending: pendingConfig, error: configError } = await useFetch('/api/apps/temporary-voice-channels/config')
const { data: settings, pending: pendingSettings, error: settingsError } = await useFetch('/api/apps/temporary-voice-channels/settings')
</script>
