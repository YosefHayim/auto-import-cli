import { formatName } from '../utils/stringUtils';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { Button } from './Button';
// Test file demonstrating auto-import functionality
// Originally missing imports for Card, Button, Avatar, and formatName

export function UserProfile() {
  const handleClick = () => {
    console.log('Clicked!');
  };

  const name = formatName('John', 'Doe');

  return (
    <Card>
      <Avatar src="/avatar.jpg" />
      <h2>{name}</h2>
      <Button onClick={handleClick}>View Profile</Button>
    </Card>
  );
}
