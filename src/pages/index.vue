<template>
  <div class="p-6 font-nunito">
    <!-- Page header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-[var(--color-text)]">
        {{ t('title') }}
      </h1>
      <p class="mt-1 text-sm text-[var(--color-text-muted)]">
        {{ t('subtitle') }}
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="text-[var(--color-text-muted)]">
      {{ t('loading') }}
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="rounded-lg border border-red-400 bg-red-50 p-4 text-red-700"
    >
      {{ t('error.load') }}
    </div>

    <!-- Content -->
    <div v-else class="space-y-4">
      <!-- Your points card -->
      <div
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-md"
      >
        <p class="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {{ t('yourPoints') }}
        </p>
        <p class="mt-1 text-4xl font-bold text-[var(--color-accent)]">
          {{ data?.myPoints ?? 0 }}
        </p>
        <p class="mt-1 text-xs text-[var(--color-text-muted)]">
          {{ t('rank') }}: #{{ data?.myRank ?? '—' }}
        </p>
      </div>

      <!-- Leaderboard preview (if public) -->
      <div
        v-if="config.leaderboardVisible"
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-md"
      >
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-bold text-[var(--color-text)]">{{ t('leaderboard') }}</h2>
          <NuxtLink
            to="/apps/community-points/leaderboard"
            class="text-xs text-[var(--color-accent)] hover:underline"
          >
            {{ t('viewAll') }}
          </NuxtLink>
        </div>

        <ol class="space-y-2">
          <li
            v-for="(entry, index) in data?.topMembers"
            :key="entry.memberId"
            class="flex items-center gap-3 text-sm"
          >
            <span class="w-5 text-right font-bold text-[var(--color-text-muted)]">
              {{ index + 1 }}.
            </span>
            <span class="flex-1 text-[var(--color-text)]">{{ entry.displayName }}</span>
            <span class="font-semibold text-[var(--color-accent)]">{{ entry.points }}</span>
          </li>
        </ol>
      </div>

      <!-- Moderator: Award points panel -->
      <div
        v-if="hasRole('moderator')"
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 shadow-md"
      >
        <h2 class="mb-3 font-bold text-[var(--color-text)]">{{ t('awardPoints') }}</h2>
        <form class="flex gap-2" @submit.prevent="awardPoints">
          <input
            v-model="awardTarget"
            type="text"
            :placeholder="t('memberIdPlaceholder')"
            class="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
          <input
            v-model.number="awardAmount"
            type="number"
            min="1"
            :placeholder="t('amountPlaceholder')"
            class="w-20 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            :disabled="awarding"
            class="rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            {{ awarding ? t('awarding') : t('award') }}
          </button>
        </form>
        <p v-if="awardMessage" class="mt-2 text-sm text-green-600">{{ awardMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Composables are globally injected by the NewGuild host — do NOT import them
const { t } = useI18n()
const { hasRole } = useAuth()
const config = useAppConfig()

// Fetch stats from our API route
const { data, pending, error } = await useFetch('/api/apps/community-points/stats')

// Award form state
const awardTarget = ref('')
const awardAmount = ref(10)
const awarding = ref(false)
const awardMessage = ref('')

async function awardPoints() {
  if (!awardTarget.value || !awardAmount.value) return
  awarding.value = true
  awardMessage.value = ''
  try {
    await $fetch('/api/apps/community-points/award', {
      method: 'POST',
      body: { targetUserId: awardTarget.value, amount: awardAmount.value },
    })
    awardMessage.value = t('awardSuccess', { amount: awardAmount.value, username: awardTarget.value })
    awardTarget.value = ''
    awardAmount.value = 10
  } catch {
    awardMessage.value = t('error.award')
  } finally {
    awarding.value = false
  }
}
</script>
