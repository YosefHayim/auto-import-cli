<template>
  <div class="container">
    <Card>
      <h1>{{ title }}</h1>
      <Button :text="buttonText" @click="handleClick" />
    </Card>
  </div>
</template>

<script>
import { formatDate } from '../utils';

export default {
  name: 'TestComponent',
  data() {
    return {
      title: 'Hello Vue!',
      buttonText: 'Click Me',
      date: formatDate(new Date())
    };
  },
  methods: {
    handleClick() {
      console.log('Button clicked!');
    }
  }
};
</script>

<style scoped>
.container {
  padding: 20px;
}
</style>
