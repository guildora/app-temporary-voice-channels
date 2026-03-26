<template>
  <section class="space-y-6">
    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-bold md:text-3xl">{{ t('app.title') }}</h1>
      <p class="text-sm opacity-80">{{ t('app.subtitle') }}</p>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="opacity-60">{{ t('loading') }}</div>

    <!-- Error state -->
    <div v-else-if="error" class="alert alert-error">{{ t('error.load') }}</div>

    <div v-else class="space-y-6">
      <!-- Setup warning -->
      <div
        v-if="!overview?.lobbyConfigured || !overview?.categoryConfigured"
        class="alert alert-warning"
      >
        <div>
          <p class="mb-2 font-semibold">{{ t('app.setup.title') }}</p>
          <ul class="flex list-disc flex-col gap-1 pl-6">
            <li v-if="!overview?.lobbyConfigured" class="text-sm">{{ t('app.setup.lobbyMissing') }}</li>
            <li v-if="!overview?.categoryConfigured" class="text-sm">{{ t('app.setup.categoryMissing') }}</li>
          </ul>
        </div>
      </div>

      <!-- Status card -->
      <div class="card">
        <div class="p-6">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('app.status.heading') }}</h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="stat">
              <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{{ t('app.status.activeChannels') }}</div>
              <div class="text-2xl font-bold text-[var(--color-accent)]">{{ overview?.managedChannels ?? 0 }}</div>
            </div>
            <div class="stat">
              <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{{ t('app.status.appStatus') }}</div>
              <div class="text-2xl font-bold" :style="overview?.appActive ? 'color: var(--color-success)' : 'color: var(--color-error)'">
                {{ overview?.appActive ? t('app.status.active') : t('app.status.inactive') }}
              </div>
            </div>
            <div class="stat">
              <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{{ t('app.status.lobby') }}</div>
              <div class="text-base font-semibold" :style="overview?.lobbyConfigured ? 'color: var(--color-success)' : 'color: var(--color-error)'">
                {{ overview?.lobbyConfigured ? t('app.status.configured') : t('app.status.notConfigured') }}
              </div>
            </div>
            <div class="stat">
              <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{{ t('app.status.category') }}</div>
              <div class="text-base font-semibold" :style="overview?.categoryConfigured ? 'color: var(--color-success)' : 'color: var(--color-error)'">
                {{ overview?.categoryConfigured ? t('app.status.configured') : t('app.status.notConfigured') }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Moderator shortcut -->
      <div v-if="hasRole('moderator')">
        <NuxtLink to="/apps/temporary-voice-channels/settings" class="inline-flex text-sm text-[var(--color-accent)] hover:underline">
          {{ t('nav.settings') }} →
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useI18n, useAuth, useFetch } from '@guildora/hub'

const { t } = useI18n()
const { hasRole } = useAuth()

const { data: overview, pending, error } = await useFetch('/api/apps/temporary-voice-channels/overview')
</script>
