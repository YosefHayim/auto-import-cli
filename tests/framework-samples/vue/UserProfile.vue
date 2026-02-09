<template>
  <div class="profile">
    <h1>{{ userName }}</h1>
    <p>{{ formattedDate }}</p>
  </div>
</template>

<script setup>
import { formatName } from '../stringUtils';
import { formatDate } from '../utils';
const userName = formatName('John', 'Doe');
const formattedDate = formatDate(new Date());
</script>

<style scoped>
.profile {
  padding: 20px;
}
</style>
