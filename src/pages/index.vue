<template>
  <div class="p-6 font-nunito">
    <!-- Page header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold" style="color: var(--color-text, #111)">
        {{ t('app.title') }}
      </h1>
      <p class="mt-1 text-sm" style="color: var(--color-text-muted, #666)">
        {{ t('app.subtitle') }}
      </p>
    </div>

    <!-- Welcome banner -->
    <div
      v-if="user"
      class="mb-6 p-4 rounded-lg font-nunito"
      style="background: var(--color-surface-alt, #f9fafb); border: 1px solid var(--color-border, #e5e7eb);"
    >
      <p style="color: var(--color-text, #111)">{{ t('app.welcome', { username: user.displayName }) }}</p>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="font-nunito" style="color: var(--color-text-muted, #666)">
      {{ t('loading') }}
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      style="border: 1px solid #f87171; background: #fef2f2; padding: 1rem; border-radius: 0.5rem; color: #b91c1c;"
    >
      {{ t('error.load') }}
    </div>

    <!-- Content -->
    <div v-else class="space-y-4">
      <!-- Community overview card -->
      <div
        style="border: 1px solid var(--color-border, #e5e7eb); background: var(--color-surface, #fff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
      >
        <h2 class="mb-4 font-bold font-nunito" style="color: var(--color-text, #111)">
          {{ t('app.overview.heading') }}
        </h2>
        <dl style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <dt class="text-xs font-semibold font-nunito" style="color: var(--color-text-muted, #666); text-transform: uppercase; letter-spacing: 0.05em;">
              {{ t('app.overview.membersTracked') }}
            </dt>
            <dd class="mt-1 text-2xl font-bold font-nunito" style="color: var(--color-accent, #ff206e)">
              {{ overview?.membersTracked ?? 0 }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-semibold font-nunito" style="color: var(--color-text-muted, #666); text-transform: uppercase; letter-spacing: 0.05em;">
              {{ t('app.overview.appActive') }}
            </dt>
            <dd class="mt-1 text-2xl font-bold font-nunito" style="color: #16a34a;">
              {{ t('app.overview.active') }}
            </dd>
          </div>
        </dl>
        <p v-if="!overview?.membersTracked" class="mt-4 text-sm font-nunito" style="color: var(--color-text-muted, #666)">
          {{ t('app.overview.noData') }}
        </p>
      </div>

      <!-- Moderator shortcut -->
      <div v-if="hasRole('moderator')">
        <NuxtLink
          to="/apps/guildora-app-template/mod"
          class="text-sm font-nunito"
          style="color: var(--color-accent, #ff206e); text-decoration: underline;"
        >
          {{ t('nav.mod') }} →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n, useAuth, useFetch } from '@guildora/hub'

const { t } = useI18n()
const { user, hasRole } = useAuth()

const { data: overview, pending, error } = await useFetch('/api/apps/guildora-app-template/overview')
</script>
