export function HomePage() {
  const name = formatName('Jane', 'Doe');
  const total = add(1, 2);

  return (
    <div>
      <Header title="Welcome" />
      <Card>
        <h2>{name}</h2>
        <p>Total: {total}</p>
        <Button label="Click me" onClick={() => {}} />
      </Card>
    </div>
  );
}
