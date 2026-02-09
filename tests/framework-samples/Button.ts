export function Button({ text, onClick }: { text: string; onClick: () => void }) {
  return {
    type: 'button',
    text,
    onClick
  };
}
