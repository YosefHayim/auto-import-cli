<script>

  let title = 'Hello Svelte!';
  let buttonText = 'Click Me';

  function handleClick() {
    console.log('Button clicked!');
  }
</script>

<div class="container">
  <Card>
    <h1>{title}</h1>
    <Button text={buttonText} onClick={handleClick} />
  </Card>
</div>

<style>
.container {
  padding: 20px;
}
</style>
