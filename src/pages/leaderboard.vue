<template>
  <div class="p-6 font-nunito">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-[var(--color-text)]">{{ t('leaderboard') }}</h1>
        <p class="mt-1 text-sm text-[var(--color-text-muted)]">{{ t('leaderboardSubtitle') }}</p>
      </div>
      <NuxtLink
        to="/apps/community-points"
        class="text-sm text-[var(--color-accent)] hover:underline"
      >
        ← {{ t('back') }}
      </NuxtLink>
    </div>

    <!-- Access guard: leaderboard can be set to private -->
    <div
      v-if="!config.leaderboardVisible && !hasRole('moderator')"
      class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-text-muted)]"
    >
      {{ t('leaderboardPrivate') }}
    </div>

    <template v-else>
      <!-- Loading -->
      <div v-if="pending" class="text-[var(--color-text-muted)]">{{ t('loading') }}</div>

      <!-- Error -->
      <div v-else-if="error" class="text-red-600">{{ t('error.load') }}</div>

      <!-- Leaderboard table -->
      <div
        v-else
        class="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
              <th class="px-4 py-3 text-left font-bold text-[var(--color-text-muted)]">
                {{ t('rank') }}
              </th>
              <th class="px-4 py-3 text-left font-bold text-[var(--color-text-muted)]">
                {{ t('member') }}
              </th>
              <th class="px-4 py-3 text-right font-bold text-[var(--color-text-muted)]">
                {{ t('points') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(entry, index) in data?.leaderboard"
              :key="entry.memberId"
              class="border-b border-[var(--color-border)] last:border-0"
              :class="entry.isCurrentUser ? 'bg-[var(--color-surface-alt)]' : ''"
            >
              <!-- Rank with medal for top 3 -->
              <td class="px-4 py-3 font-bold text-[var(--color-text-muted)]">
                <span v-if="index === 0">🥇</span>
                <span v-else-if="index === 1">🥈</span>
                <span v-else-if="index === 2">🥉</span>
                <span v-else>{{ index + 1 }}</span>
              </td>

              <td class="px-4 py-3">
                <span class="font-semibold text-[var(--color-text)]">
                  {{ entry.displayName }}
                </span>
                <span
                  v-if="entry.isCurrentUser"
                  class="ml-2 text-xs text-[var(--color-accent)]"
                >
                  ({{ t('you') }})
                </span>
              </td>

              <td class="px-4 py-3 text-right font-bold text-[var(--color-accent)]">
                {{ entry.points }}
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="!data?.leaderboard?.length">
              <td colspan="3" class="px-4 py-8 text-center text-[var(--color-text-muted)]">
                {{ t('noData') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Composables are globally injected by the NewGuild host — do NOT import them
const { t } = useI18n()
const { hasRole } = useAuth()
const config = useAppConfig()

// Fetch leaderboard data from our API route
const { data, pending, error } = await useFetch('/api/apps/community-points/stats?leaderboard=full')
</script>
