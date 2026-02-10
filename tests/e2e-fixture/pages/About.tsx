export function AboutPage() {
  const today = formatDate(new Date());

  return (
    <Card>
      <h1>About Us</h1>
      <p>Last updated: {today}</p>
    </Card>
  );
}
